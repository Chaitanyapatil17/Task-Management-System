import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/taskApi";
import { useSocket } from "../context/SocketContext";
import FileViewerModal from "../components/FileViewerModal";
import { getInlineFileUrl, formatFileSize, getFileType } from "../utils/fileUtils";
import "./TaskDetail.css";

const PRIORITY_CFG = {
  Low:      { cls: "priority-low",      dot: "🟢", label: "Low Priority"      },
  Medium:   { cls: "priority-medium",   dot: "🟡", label: "Medium Priority"   },
  High:     { cls: "priority-high",     dot: "🟠", label: "High Priority"     },
  Critical: { cls: "priority-critical", dot: "🔴", label: "Critical Priority" },
};

const QUICK_EMOJIS = ["👍", "❤️", "🎉", "🚀", "👀", "🔥", "🙌"];

function timeAgo(date) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getDueInfo(dueDate, status) {
  if (!dueDate || status === "Done") return null;
  const due  = new Date(dueDate);
  const now  = new Date();
  const diff = due - now;
  const days = Math.ceil(diff / 86400000);

  if (days < 0)  return { label: `Overdue by ${Math.abs(days)}d`, cls: "due-overdue" };
  if (days === 0) return { label: "Due today",                      cls: "due-today"   };
  if (days <= 3)  return { label: `Due in ${days}d`,                cls: "due-soon"    };
  return { label: fmtDate(dueDate), cls: "due-normal" };
}

function ActivityIcon({ type }) {
  if (type === "status_change") return (
    <span className="activity-icon activity-icon--status">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
    </span>
  );
  if (type === "assignment") return (
    <span className="activity-icon activity-icon--assign">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    </span>
  );
  if (type === "attachment") return (
    <span className="activity-icon activity-icon--attach">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
    </span>
  );
  if (type === "attachment_version") return (
    <span className="activity-icon activity-icon--version">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    </span>
  );
  return (
    <span className="activity-icon activity-icon--comment">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    </span>
  );
}

// Render text with highlighted @mentions
function renderFormattedComment(text) {
  if (!text) return null;
  const parts = text.split(/(@[a-zA-Z0-9_\s]{2,25}(?=\s|[.,!?]|$))/g);
  return parts.map((part, index) => {
    if (part.startsWith("@")) {
      return (
        <span key={index} className="mention-pill">
          {part}
        </span>
      );
    }
    return part;
  });
}

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const textareaRef = useRef(null);
  const typingTimerRef = useRef(null);

  const { socket, isUserOnline, joinTaskRoom, leaveTaskRoom, sendTyping, sendStopTyping } = useSocket();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = user.id || user._id;
  const isAdmin = user.role === "admin";
  const backPath = isAdmin ? "/admin/tasks" : "/tasks";
  const editPath = isAdmin ? `/admin/edit-task/${id}` : `/edit-task/${id}`;

  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [text, setText] = useState("");
  const [mentions, setMentions] = useState([]);
  const [taskLoading, setTaskLoading] = useState(true);
  const [cmtLoading, setCmtLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [deletingAtt, setDeletingAtt] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [feedFilter, setFeedFilter] = useState("all");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  // Mention Dropdown State
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionPopover, setShowMentionPopover] = useState(false);

  // Threaded Reply State: commentId -> boolean or text
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyMentions, setReplyMentions] = useState([]);
  const [postingReply, setPostingReply] = useState(false);

  // Comment Editing State: commentId -> text
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState("");

  // Quick Emoji Picker: commentId -> boolean
  const [activeEmojiPickerId, setActiveEmojiPickerId] = useState(null);

  // Live Typer in Room
  const [typingUsers, setTypingUsers] = useState([]);

  // Fetch Collaborators for @mentions
  useEffect(() => {
    API.getCollaborators()
      .then((res) => {
        if (res.data?.success) {
          setCollaborators(res.data.data);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch Task Details
  const fetchTaskDetails = useCallback(() => {
    API.get(`/tasks/${id}`)
      .then((r) => setTask(r.data.data))
      .catch(() => { setError("Task not found."); })
      .finally(() => setTaskLoading(false));
  }, [id]);

  useEffect(() => {
    fetchTaskDetails();
  }, [fetchTaskDetails]);

  // Fetch Comments & Activity
  const fetchComments = useCallback(() => {
    setCmtLoading(true);
    API.getTaskComments(id)
      .then((r) => setComments(r.data.data || []))
      .catch(console.error)
      .finally(() => setCmtLoading(false));
  }, [id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // ─────────────────────────────────────────────
  // Real-Time Socket.io Connection to Task Room
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    joinTaskRoom(id);

    if (socket) {
      const handleCommentCreated = (newComment) => {
        if (newComment && newComment.task === id) {
          setComments((prev) => {
            if (prev.some((c) => c._id === newComment._id)) return prev;
            return [...prev, newComment];
          });
        }
      };

      const handleCommentUpdated = (updatedComment) => {
        if (updatedComment) {
          setComments((prev) =>
            prev.map((c) => (c._id === updatedComment._id ? updatedComment : c))
          );
        }
      };

      const handleReactionUpdated = (updatedComment) => {
        if (updatedComment) {
          setComments((prev) =>
            prev.map((c) => (c._id === updatedComment._id ? updatedComment : c))
          );
        }
      };

      const handleCommentDeleted = ({ commentId }) => {
        if (commentId) {
          setComments((prev) =>
            prev.filter((c) => c._id !== commentId && c.parentComment?._id !== commentId && c.parentComment !== commentId)
          );
        }
      };

      const handleTaskUpdated = (updatedTask) => {
        if (updatedTask && (updatedTask._id === id || updatedTask.id === id)) {
          setTask(updatedTask);
        }
      };

      const handleUserTyping = ({ user: typingUser }) => {
        if (typingUser && typingUser.id !== currentUserId) {
          setTypingUsers((prev) => {
            if (!prev.some((u) => u.id === typingUser.id)) {
              return [...prev, typingUser];
            }
            return prev;
          });
          // Auto remove after 3.5s of inactivity
          setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u.id !== typingUser.id));
          }, 3500);
        }
      };

      const handleUserStopTyping = ({ user: typingUser }) => {
        if (typingUser) {
          setTypingUsers((prev) => prev.filter((u) => u.id !== typingUser.id));
        }
      };

      socket.on("comment:created", handleCommentCreated);
      socket.on("comment:updated", handleCommentUpdated);
      socket.on("comment:reaction_updated", handleReactionUpdated);
      socket.on("comment:deleted", handleCommentDeleted);
      socket.on("task:updated", handleTaskUpdated);
      socket.on("task:user_typing", handleUserTyping);
      socket.on("task:user_stop_typing", handleUserStopTyping);

      return () => {
        socket.off("comment:created", handleCommentCreated);
        socket.off("comment:updated", handleCommentUpdated);
        socket.off("comment:reaction_updated", handleReactionUpdated);
        socket.off("comment:deleted", handleCommentDeleted);
        socket.off("task:updated", handleTaskUpdated);
        socket.off("task:user_typing", handleUserTyping);
        socket.off("task:user_stop_typing", handleUserStopTyping);
        leaveTaskRoom(id);
      };
    }
  }, [id, socket, joinTaskRoom, leaveTaskRoom, currentUserId]);

  // Handle typing indicator trigger
  const handleTypingEvent = () => {
    sendTyping(id);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      sendStopTyping(id);
    }, 2000);
  };

  // Status Change
  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    try {
      setUpdatingStatus(true);
      await API.updateTaskWithFiles(id, { status: newStatus });
      setTask((prev) => ({ ...prev, status: newStatus }));
      fetchComments();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Archive & Restore
  const handleArchive = async () => {
    if (!window.confirm("Archive this task?")) return;
    try {
      setArchiving(true);
      await API.archiveTask(id);
      setTask((prev) => ({ ...prev, isArchived: true }));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to archive task");
    } finally {
      setArchiving(false);
    }
  };

  const handleRestore = async () => {
    try {
      setArchiving(true);
      await API.restoreTask(id);
      setTask((prev) => ({ ...prev, isArchived: false }));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to restore task");
    } finally {
      setArchiving(false);
    }
  };

  // Subtasks
  const handleToggleSubtask = async (subtaskId, currentCompleted) => {
    try {
      const res = await API.updateSubtask(id, subtaskId, { completed: !currentCompleted });
      setTask(res.data.data);
      fetchComments();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update subtask");
    }
  };

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    try {
      setAddingSubtask(true);
      const res = await API.addSubtask(id, newSubtaskTitle.trim());
      setTask(res.data.data);
      setNewSubtaskTitle("");
      fetchComments();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add subtask");
    } finally {
      setAddingSubtask(false);
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    try {
      const res = await API.deleteSubtask(id, subtaskId);
      setTask(res.data.data);
      fetchComments();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete subtask");
    }
  };

  // Attachments
  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm("Delete this attachment?")) return;
    setDeletingAtt(attachmentId);
    try {
      const res = await API.delete(`/tasks/${id}/attachments/${attachmentId}`);
      if (res.data?.data) {
        setTask(res.data.data);
      } else {
        setTask((prev) => ({
          ...prev,
          attachments: prev.attachments.filter((a) => a._id !== attachmentId),
        }));
      }
      fetchComments();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete attachment");
    } finally {
      setDeletingAtt(null);
    }
  };

  // Mention Detection in Textarea
  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    handleTypingEvent();

    // Check if user is typing an @mention
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const lastAt = textBeforeCursor.lastIndexOf("@");
    if (lastAt !== -1 && !textBeforeCursor.slice(lastAt).includes(" ")) {
      setMentionQuery(textBeforeCursor.slice(lastAt + 1).toLowerCase());
      setShowMentionPopover(true);
    } else {
      setShowMentionPopover(false);
    }
  };

  const insertMention = (collaborator) => {
    const cursor = textareaRef.current?.selectionStart || text.length;
    const textBeforeCursor = text.slice(0, cursor);
    const lastAt = textBeforeCursor.lastIndexOf("@");
    if (lastAt !== -1) {
      const beforeAt = text.slice(0, lastAt);
      const afterCursor = text.slice(cursor);
      const newText = `${beforeAt}@${collaborator.name} ${afterCursor}`;
      setText(newText);
      setMentions((prev) => [...new Set([...prev, collaborator._id])]);
      setShowMentionPopover(false);
      textareaRef.current?.focus();
    }
  };

  // Post Comment
  const handlePost = async (e) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;
    try {
      setPosting(true);
      sendStopTyping(id);
      const res = await API.postTaskComment(id, {
        text: text.trim(),
        mentions,
      });
      setText("");
      setMentions([]);
      setShowMentionPopover(false);
      if (res.data?.data) {
        setComments((prev) => {
          if (prev.some((c) => c._id === res.data.data._id)) return prev;
          return [...prev, res.data.data];
        });
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  // Post Threaded Reply
  const handlePostReply = async (parentCommentId) => {
    if (!replyText.trim()) return;
    try {
      setPostingReply(true);
      const res = await API.postTaskComment(id, {
        text: replyText.trim(),
        parentComment: parentCommentId,
        mentions: replyMentions,
      });
      setReplyText("");
      setReplyMentions([]);
      setReplyingToId(null);
      if (res.data?.data) {
        setComments((prev) => {
          if (prev.some((c) => c._id === res.data.data._id)) return prev;
          return [...prev, res.data.data];
        });
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to post reply");
    } finally {
      setPostingReply(false);
    }
  };

  // Emoji Reaction Toggle
  const handleToggleReaction = async (commentId, emoji) => {
    try {
      setActiveEmojiPickerId(null);
      const res = await API.reactToComment(id, commentId, emoji);
      if (res.data?.data) {
        setComments((prev) =>
          prev.map((c) => (c._id === commentId ? res.data.data : c))
        );
      }
    } catch (err) {
      console.error("Failed to react:", err);
    }
  };

  // Edit Comment
  const handleSaveEdit = async (commentId) => {
    if (!editText.trim()) return;
    try {
      const res = await API.editTaskComment(id, commentId, editText.trim());
      if (res.data?.data) {
        setComments((prev) =>
          prev.map((c) => (c._id === commentId ? res.data.data : c))
        );
      }
      setEditingCommentId(null);
      setEditText("");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to edit comment");
    }
  };

  // Delete Comment
  const handleDelete = async (commentId) => {
    if (!window.confirm("Delete this comment and any replies?")) return;
    try {
      await API.deleteTaskComment(id, commentId);
      setComments((prev) =>
        prev.filter((c) => c._id !== commentId && c.parentComment?._id !== commentId && c.parentComment !== commentId)
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete comment");
    }
  };

  // AI Breakdown
  const handleAIBreakdown = async () => {
    if (!task) return;
    setGeneratingAI(true);
    try {
      const res = await API.generateSubtasksAI({
        taskId: task._id,
        title: task.title,
        description: task.description,
        autoApply: true,
      });
      if (res.data?.success) {
        fetchTaskDetails();
        fetchComments();
      }
    } catch (err) {
      console.error("AI breakdown failed:", err);
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleAskAICopilot = () => {
    if (!task) return;
    window.dispatchEvent(
      new CustomEvent("open-ai-chat", {
        detail: {
          prompt: `Help me with task "${task.title}": ${task.description || "How should I plan and execute this task?"}`,
        },
      })
    );
  };

  // Structure Comments into Threads (Top-level + Nested replies)
  const { topLevelComments, repliesMap } = useMemo(() => {
    const topLevel = [];
    const replies = {};

    comments.forEach((c) => {
      const parentId = c.parentComment?._id || c.parentComment;
      if (parentId) {
        if (!replies[parentId]) replies[parentId] = [];
        replies[parentId].push(c);
      } else {
        topLevel.push(c);
      }
    });

    return { topLevelComments: topLevel, repliesMap: replies };
  }, [comments]);

  // Filter Categories
  const filteredComments = useMemo(() => {
    if (feedFilter === "comments") {
      return topLevelComments.filter((c) => c.type === "comment" || c.type === "reply");
    }
    if (feedFilter === "status") {
      return topLevelComments.filter((c) => c.type === "status_change" || c.type === "assignment");
    }
    if (feedFilter === "files") {
      return topLevelComments.filter((c) => c.type === "attachment" || c.type === "attachment_version");
    }
    return topLevelComments;
  }, [topLevelComments, feedFilter]);

  const userCommentsCount = useMemo(
    () => comments.filter((c) => c.type === "comment" || c.type === "reply").length,
    [comments]
  );

  const subtasks = useMemo(() => task?.subtasks || [], [task]);
  const completedSubtasks = useMemo(() => subtasks.filter((s) => s.completed).length, [subtasks]);
  const subtaskPercent = useMemo(
    () => (subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0),
    [subtasks, completedSubtasks]
  );

  const filteredCollaborators = useMemo(() => {
    if (!mentionQuery) return collaborators.slice(0, 6);
    return collaborators
      .filter((c) => c.name.toLowerCase().includes(mentionQuery) || c.email.toLowerCase().includes(mentionQuery))
      .slice(0, 6);
  }, [collaborators, mentionQuery]);

  if (taskLoading) {
    return (
      <div className="page">
        <div className="td-loading" style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
          <div className="at-spinner" style={{ margin: "0 auto 16px" }} />
          <p>Loading task details…</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="page">
        <div className="empty-state" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div className="empty-icon" style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <h3 style={{ color: "#ffffff", marginBottom: 8 }}>Task not found</h3>
          <p style={{ color: "#94a3b8", marginBottom: 20 }}>{error}</p>
          <button className="primary-button" onClick={() => navigate(backPath)}>← Back to Tasks</button>
        </div>
      </div>
    );
  }

  const statusClass = task.status?.toLowerCase().replace(" ", "-");
  const priorityCfg = PRIORITY_CFG[task.priority] || PRIORITY_CFG.Medium;
  const dueInfo = getDueInfo(task.dueDate, task.status);
  const isAssigneeOnline = isUserOnline(task.assignedTo?._id || task.assignedTo);

  return (
    <div className="page td-advanced-container">
      {/* ── File Viewer Modal ── */}
      {selectedFile && (
        <FileViewerModal
          file={selectedFile}
          taskId={task._id}
          onVersionUploaded={(updatedTask) => {
            setTask(updatedTask);
            fetchComments();
          }}
          onClose={() => setSelectedFile(null)}
        />
      )}

      {/* ── BREADCRUMB & HERO HEADER ── */}
      <div className="td-hero-header">
        <div className="td-breadcrumb-row">
          <button className="td-back-btn" onClick={() => navigate(backPath)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Tasks
          </button>
          <span className="td-breadcrumb-sep">/</span>
          <span className="td-task-id-badge">#{task._id?.slice(-6)}</span>
          {task.isArchived && <span className="td-archived-pill">📦 Archived</span>}
        </div>

        <div className="td-hero-title-row">
          <h1 className="td-hero-title">{task.title}</h1>

          {/* Quick Controls Action Bar */}
          <div className="td-hero-actions">
            {/* Inline Status Dropdown Selector */}
            <div className="td-status-selector-wrap">
              <select
                value={task.status}
                onChange={handleStatusChange}
                disabled={updatingStatus}
                className={`td-status-select-pill ${statusClass}`}
              >
                <option value="Pending">⏳ Pending</option>
                <option value="In Progress">⚡ In Progress</option>
                <option value="Done">✅ Done</option>
              </select>
            </div>

            {/* Priority Badge */}
            <span className={`priority-badge ${priorityCfg.cls}`} title={priorityCfg.label}>
              {priorityCfg.dot} {task.priority || "Medium"}
            </span>

            {/* Archive / Restore Button */}
            {task.isArchived ? (
              <button className="btn-td-secondary" onClick={handleRestore} disabled={archiving}>
                {archiving ? "Restoring…" : "Restore"}
              </button>
            ) : (
              <button className="btn-td-secondary" onClick={handleArchive} disabled={archiving}>
                {archiving ? "Archiving…" : "Archive"}
              </button>
            )}

            {/* Edit Task Primary Button */}
            <button className="primary-button" onClick={() => navigate(editPath)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ marginRight: 6 }}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit Task
            </button>

            {/* Ask AI Copilot Button */}
            <button
              className="btn-hero-primary"
              onClick={handleAskAICopilot}
              title="Ask AI Copilot for advice on this task"
              style={{
                background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 15px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)",
              }}
            >
              ✨ Ask AI Copilot
            </button>
          </div>
        </div>
      </div>

      {/* ── TWO-COLUMN MAIN CONTENT LAYOUT ── */}
      <div className="td-layout">
        {/* ── LEFT COLUMN: Description, Subtasks, Activity ── */}
        <div className="td-left">
          {/* Description Card */}
          <div className="td-card">
            <div className="td-card-header-row">
              <h3 className="td-card-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                Description
              </h3>
            </div>
            <p className="td-description">
              {task.description || <span style={{ color: "#64748b", fontStyle: "italic" }}>No detailed description provided for this task.</span>}
            </p>

            {/* Tags Pills */}
            {task.tags?.length > 0 && (
              <div className="td-tags-container">
                {task.tags.map((tag, i) => (
                  <span key={i} className="td-tag-pill">#{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Subtasks Progress Checklist Card */}
          <div className="td-card">
            <div className="td-card-header-row">
              <h3 className="td-card-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                Subtasks Checklist
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={handleAIBreakdown}
                  disabled={generatingAI}
                  className="btn-hero-primary"
                  title="Generate subtasks automatically with AI"
                  style={{
                    background: "rgba(99, 102, 241, 0.15)",
                    color: "#818cf8",
                    border: "1px solid rgba(99, 102, 241, 0.35)",
                    padding: "5px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  {generatingAI ? "✨ Generating…" : "✨ AI Breakdown"}
                </button>
                <span className="td-subtask-count-pill">{completedSubtasks} / {subtasks.length} ({subtaskPercent}%)</span>
              </div>
            </div>

            {/* Subtask Completion Progress Track */}
            {subtasks.length > 0 && (
              <div className="td-subtask-progress-track">
                <div className="td-subtask-progress-fill" style={{ width: `${subtaskPercent}%` }} />
              </div>
            )}

            {/* Subtask Items List */}
            <div className="td-subtask-list">
              {subtasks.map((st) => (
                <div key={st._id} className={`td-subtask-item ${st.completed ? "completed" : ""}`}>
                  <label className="td-subtask-label">
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => handleToggleSubtask(st._id, st.completed)}
                      className="td-subtask-checkbox"
                    />
                    <span className="td-subtask-text">{st.title}</span>
                  </label>
                  <button
                    className="td-subtask-delete-btn"
                    onClick={() => handleDeleteSubtask(st._id)}
                    title="Delete subtask"
                  >
                    ×
                  </button>
                </div>
              ))}

              {subtasks.length === 0 && (
                <p className="td-empty-subtasks">No subtasks yet. Break this task into smaller steps below or click &quot;AI Breakdown&quot;.</p>
              )}
            </div>

            {/* Add Subtask Form */}
            <form onSubmit={handleAddSubtask} className="td-add-subtask-form">
              <input
                type="text"
                placeholder="Add a new subtask step…"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                className="td-subtask-input"
              />
              <button type="submit" className="primary-button" style={{ padding: "8px 16px", fontSize: 13 }} disabled={addingSubtask || !newSubtaskTitle.trim()}>
                {addingSubtask ? "Adding…" : "+ Add Step"}
              </button>
            </form>
          </div>

          {/* Activity & Comments Stream Card */}
          <div className="td-card">
            <div className="td-feed-header">
              <div className="td-feed-tab-buttons">
                <button
                  className={`td-feed-tab ${feedFilter === "all" ? "active" : ""}`}
                  onClick={() => setFeedFilter("all")}
                >
                  All Stream ({comments.length})
                </button>
                <button
                  className={`td-feed-tab ${feedFilter === "comments" ? "active" : ""}`}
                  onClick={() => setFeedFilter("comments")}
                >
                  💬 Comments & Replies ({userCommentsCount})
                </button>
                <button
                  className={`td-feed-tab ${feedFilter === "status" ? "active" : ""}`}
                  onClick={() => setFeedFilter("status")}
                >
                  ⚡ Status & Assign
                </button>
                <button
                  className={`td-feed-tab ${feedFilter === "files" ? "active" : ""}`}
                  onClick={() => setFeedFilter("files")}
                >
                  📎 Files & Versions
                </button>
              </div>
            </div>

            {/* Live Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="td-typing-indicator">
                <span className="typing-dots">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </span>
                <span>
                  <strong>{typingUsers.map((u) => u.name).join(", ")}</strong> {typingUsers.length === 1 ? "is" : "are"} typing a comment…
                </span>
              </div>
            )}

            {/* Post Comment Form with @Mention Autocomplete */}
            <form onSubmit={handlePost} className="td-comment-form">
              <div className="td-comment-avatar">
                {user.name?.charAt(0)?.toUpperCase()}
                <span className="presence-dot online" />
              </div>
              <div className="td-comment-input-wrap">
                {/* @Mention Autocomplete Dropdown */}
                {showMentionPopover && (
                  <div className="mention-autocomplete-popover">
                    <div className="mention-popover-title">Mention a team member</div>
                    {filteredCollaborators.length === 0 ? (
                      <div style={{ padding: "8px", fontSize: "12px", color: "#64748b" }}>No matches found</div>
                    ) : (
                      filteredCollaborators.map((c) => {
                        const isOnline = isUserOnline(c._id);
                        return (
                          <div
                            key={c._id}
                            className="mention-item"
                            onClick={() => insertMention(c)}
                          >
                            <div className="mention-avatar">
                              {c.name?.charAt(0)?.toUpperCase()}
                              <span className={`presence-dot ${isOnline ? "online" : "offline"}`} />
                            </div>
                            <div className="mention-info">
                              <div className="mention-name">{c.name}</div>
                              <div className="mention-role">{c.role} {isOnline ? "• 🟢 Online" : ""}</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  className="td-comment-input"
                  placeholder="Write a comment or update note… (Type @ to mention, Shift+Enter for newline)"
                  value={text}
                  onChange={handleTextChange}
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !showMentionPopover) {
                      e.preventDefault();
                      handlePost(e);
                    }
                  }}
                />
                <div className="td-comment-actions">
                  <span className="td-comment-hints">💡 Type <strong>@</strong> to mention collaborators</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    {text.trim() && (
                      <button type="button" className="btn-td-secondary" style={{ padding: "5px 14px", fontSize: 12 }} onClick={() => { setText(""); setMentions([]); }}>
                        Cancel
                      </button>
                    )}
                    <button type="submit" className="primary-button" style={{ padding: "6px 18px", fontSize: 12.5 }} disabled={posting || !text.trim()}>
                      {posting ? "Posting…" : "Submit Comment"}
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Activity & Comment Stream Feed */}
            {cmtLoading ? (
              <div style={{ textAlign: "center", padding: "30px 0" }}>
                <div className="at-spinner" style={{ width: 22, height: 22, margin: "0 auto" }} />
              </div>
            ) : filteredComments.length === 0 ? (
              <p className="td-feed-empty">No activity found in this category.</p>
            ) : (
              <div className="td-feed">
                {filteredComments.map((c) => {
                  const authorId = c.author?._id || c.author;
                  const isAuthorOnline = isUserOnline(authorId);
                  const isAuthor = authorId === currentUserId;
                  const childReplies = repliesMap[c._id] || [];

                  return (
                    <div key={c._id} style={{ display: "flex", flexDirection: "column" }}>
                      {/* Top-Level Feed Item */}
                      <div className="td-feed-item">
                        {c.type === "comment" || c.type === "reply" ? (
                          <>
                            <div className="td-feed-avatar-wrap">
                              <div className="td-feed-avatar">{c.author?.name?.charAt(0)?.toUpperCase()}</div>
                              <span className={`presence-dot ${isAuthorOnline ? "online" : "offline"}`} title={isAuthorOnline ? "Online" : "Offline"} />
                            </div>

                            <div className="td-feed-body">
                              <div className="td-feed-meta">
                                <span className="td-feed-author">{c.author?.name}</span>
                                <span className={`td-feed-role-badge ${c.author?.role === "admin" ? "admin" : "user"}`}>
                                  {c.author?.role}
                                </span>
                                <span className="td-feed-time">{timeAgo(c.createdAt)}</span>
                                {c.isEdited && <span className="td-edited-badge">(edited)</span>}

                                <div className="td-feed-actions-group" style={{ marginLeft: "auto" }}>
                                  {/* Emoji Reaction Trigger Button */}
                                  <div style={{ position: "relative" }}>
                                    <button
                                      className="btn-feed-action"
                                      onClick={() => setActiveEmojiPickerId((prev) => (prev === c._id ? null : c._id))}
                                      title="Add reaction"
                                    >
                                      😀
                                    </button>

                                    {activeEmojiPickerId === c._id && (
                                      <div className="td-quick-reactions-popover">
                                        {QUICK_EMOJIS.map((emoji) => (
                                          <button
                                            key={emoji}
                                            className="td-quick-emoji-btn"
                                            onClick={() => handleToggleReaction(c._id, emoji)}
                                          >
                                            {emoji}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Reply Button */}
                                  <button
                                    className="btn-feed-action"
                                    onClick={() => {
                                      setReplyingToId((prev) => (prev === c._id ? null : c._id));
                                      setReplyText(c.author?.name ? `@${c.author.name} ` : "");
                                    }}
                                    title="Reply to comment"
                                  >
                                    ↩️ Reply
                                  </button>

                                  {/* Edit Button (Author only) */}
                                  {isAuthor && (
                                    <button
                                      className="btn-feed-action"
                                      onClick={() => {
                                        setEditingCommentId(c._id);
                                        setEditText(c.text);
                                      }}
                                      title="Edit comment"
                                    >
                                      ✏️
                                    </button>
                                  )}

                                  {/* Delete Button (Author or Admin) */}
                                  {(isAuthor || isAdmin) && (
                                    <button
                                      className="btn-feed-action delete"
                                      onClick={() => handleDelete(c._id)}
                                      title="Delete comment"
                                    >
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Comment Content / Edit Mode */}
                              {editingCommentId === c._id ? (
                                <div style={{ marginTop: 6 }}>
                                  <textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    className="td-comment-input"
                                    rows={2}
                                  />
                                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 6 }}>
                                    <button className="btn-td-secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setEditingCommentId(null)}>Cancel</button>
                                    <button className="primary-button" style={{ padding: "4px 14px", fontSize: 12 }} onClick={() => handleSaveEdit(c._id)}>Save</button>
                                  </div>
                                </div>
                              ) : (
                                <p className="td-feed-text">{renderFormattedComment(c.text)}</p>
                              )}

                              {/* Emoji Reactions List */}
                              {c.reactions?.length > 0 && (
                                <div className="td-reactions-wrap">
                                  {c.reactions.map((r, i) => {
                                    const hasReacted = (r.users || []).some(
                                      (u) => (u._id || u) === currentUserId
                                    );
                                    const userNames = (r.users || []).map((u) => u.name || "User").join(", ");

                                    return (
                                      <button
                                        key={i}
                                        className={`td-reaction-pill ${hasReacted ? "active" : ""}`}
                                        onClick={() => handleToggleReaction(c._id, r.emoji)}
                                        title={`Reacted by: ${userNames}`}
                                      >
                                        <span>{r.emoji}</span>
                                        <span className="td-reaction-count">{r.users?.length || 1}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <ActivityIcon type={c.type} />
                            <div className="td-feed-body">
                              <p className="td-feed-activity-text">
                                <strong>{c.author?.name || "System"}</strong>{" "}{c.text}
                              </p>
                              <span className="td-feed-time">{timeAgo(c.createdAt)}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* ── Threaded Nested Replies ── */}
                      {childReplies.length > 0 && (
                        <div className="td-replies-container">
                          {childReplies.map((reply) => {
                            const replyAuthorId = reply.author?._id || reply.author;
                            const isReplyAuthorOnline = isUserOnline(replyAuthorId);
                            const isReplyAuthor = replyAuthorId === currentUserId;

                            return (
                              <div key={reply._id} className="td-reply-item">
                                <div className="td-feed-avatar-wrap">
                                  <div className="td-reply-avatar">{reply.author?.name?.charAt(0)?.toUpperCase()}</div>
                                  <span className={`presence-dot ${isReplyAuthorOnline ? "online" : "offline"}`} />
                                </div>
                                <div className="td-feed-body">
                                  <div className="td-feed-meta">
                                    <span className="td-feed-author">{reply.author?.name}</span>
                                    <span className={`td-feed-role-badge ${reply.author?.role === "admin" ? "admin" : "user"}`}>
                                      {reply.author?.role}
                                    </span>
                                    <span className="td-feed-time">{timeAgo(reply.createdAt)}</span>

                                    <div className="td-feed-actions-group" style={{ marginLeft: "auto" }}>
                                      {/* Quick Reaction */}
                                      <div style={{ position: "relative" }}>
                                        <button
                                          className="btn-feed-action"
                                          onClick={() => setActiveEmojiPickerId((prev) => (prev === reply._id ? null : reply._id))}
                                        >
                                          😀
                                        </button>
                                        {activeEmojiPickerId === reply._id && (
                                          <div className="td-quick-reactions-popover">
                                            {QUICK_EMOJIS.map((emoji) => (
                                              <button
                                                key={emoji}
                                                className="td-quick-emoji-btn"
                                                onClick={() => handleToggleReaction(reply._id, emoji)}
                                              >
                                                {emoji}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>

                                      {/* Delete (Author or Admin) */}
                                      {(isReplyAuthor || isAdmin) && (
                                        <button
                                          className="btn-feed-action delete"
                                          onClick={() => handleDelete(reply._id)}
                                          title="Delete reply"
                                        >
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <p className="td-feed-text">{renderFormattedComment(reply.text)}</p>

                                  {/* Reply Reactions */}
                                  {reply.reactions?.length > 0 && (
                                    <div className="td-reactions-wrap">
                                      {reply.reactions.map((r, ri) => {
                                        const hasReacted = (r.users || []).some(
                                          (u) => (u._id || u) === currentUserId
                                        );
                                        return (
                                          <button
                                            key={ri}
                                            className={`td-reaction-pill ${hasReacted ? "active" : ""}`}
                                            onClick={() => handleToggleReaction(reply._id, r.emoji)}
                                          >
                                            <span>{r.emoji}</span>
                                            <span className="td-reaction-count">{r.users?.length || 1}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* ── Inline Reply Composer Box ── */}
                      {replyingToId === c._id && (
                        <div className="td-inline-reply-box">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={`Reply to ${c.author?.name}… (Type @ to mention)`}
                            className="td-inline-reply-input"
                            rows={2}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handlePostReply(c._id);
                              }
                            }}
                          />
                          <div className="td-inline-reply-actions">
                            <button
                              className="btn-td-secondary"
                              style={{ padding: "4px 10px", fontSize: 12 }}
                              onClick={() => { setReplyingToId(null); setReplyText(""); }}
                            >
                              Cancel
                            </button>
                            <button
                              className="primary-button"
                              style={{ padding: "4px 14px", fontSize: 12 }}
                              disabled={postingReply || !replyText.trim()}
                              onClick={() => handlePostReply(c._id)}
                            >
                              {postingReply ? "Replying…" : "Send Reply"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: Metadata, Assignee, Attachments, Prerequisites ── */}
        <div className="td-right">
          {/* Metadata Card */}
          <div className="td-card td-meta-card">
            <h3 className="td-card-title" style={{ marginBottom: 16 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              Task Information
            </h3>

            {/* Assigned User with Live Online Presence */}
            {task.assignedTo && (
              <div className="td-meta-row">
                <span className="td-meta-label">Assigned User</span>
                <div className="td-meta-user">
                  <div className="assignee-avatar-sm">
                    {task.assignedTo.name?.charAt(0)?.toUpperCase()}
                    <span
                      className={`presence-dot ${isAssigneeOnline ? "online" : "offline"}`}
                      title={isAssigneeOnline ? "Online" : "Offline"}
                    />
                  </div>
                  <div>
                    <div className="td-user-name">
                      {task.assignedTo.name} {isAssigneeOnline && <span style={{ fontSize: 10, color: "#34d399", fontWeight: "normal" }}>(Active)</span>}
                    </div>
                    <div className="td-user-email">{task.assignedTo.email}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Status */}
            <div className="td-meta-row">
              <span className="td-meta-label">Current Status</span>
              <span className={`task-status-pill ${statusClass}`}>{task.status}</span>
            </div>

            {/* Priority */}
            <div className="td-meta-row">
              <span className="td-meta-label">Priority Level</span>
              <span className={`priority-badge ${priorityCfg.cls}`}>{priorityCfg.label}</span>
            </div>

            {/* Start Date */}
            {task.startDate && (
              <div className="td-meta-row">
                <span className="td-meta-label">Start Date</span>
                <span className="td-meta-value">{fmtDate(task.startDate)}</span>
              </div>
            )}

            {/* Due Date & Countdown Alert */}
            <div className="td-meta-row">
              <span className="td-meta-label">Due Date</span>
              <div style={{ textAlign: "right" }}>
                <span className="td-meta-value">{task.dueDate ? fmtDate(task.dueDate) : "Not set"}</span>
                {dueInfo && (
                  <div className={`due-badge ${dueInfo.cls}`} style={{ marginTop: 4, display: "inline-flex" }}>
                    {dueInfo.label}
                  </div>
                )}
              </div>
            </div>

            {/* Created At */}
            <div className="td-meta-row">
              <span className="td-meta-label">Created Date</span>
              <span className="td-meta-value">{fmtDate(task.createdAt)}</span>
            </div>

            {/* Last Updated */}
            <div className="td-meta-row">
              <span className="td-meta-label">Last Updated</span>
              <span className="td-meta-value">{fmtDate(task.updatedAt)}</span>
            </div>

            {/* Attachments Section with Versioning */}
            {task.attachments?.length > 0 && (
              <div className="td-meta-attachments">
                <div className="td-meta-label" style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Attachments ({task.attachments.length})</span>
                  <span className="td-att-subtitle">Preview & Version History</span>
                </div>
                {task.attachments.map((a) => {
                  const fileType = getFileType(a.filename, a.mimetype);
                  const ver = a.version || 1;
                  return (
                    <div key={a._id} className="td-attachment-row">
                      <a
                        href={getInlineFileUrl(a)}
                        target="_blank"
                        rel="noreferrer"
                        className="attachment-chip"
                        style={{ flex: 1 }}
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedFile(a);
                        }}
                      >
                        <span className="td-file-type-icon">
                          {fileType === "image" ? "🖼️" : fileType === "pdf" ? "📄" : fileType === "video" ? "🎬" : "📎"}
                        </span>
                        <div className="td-file-info-text">
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span className="td-file-name">{a.filename}</span>
                            <span className="version-pill-badge">v{ver}</span>
                          </div>
                          {a.size && <span className="attachment-size">{formatFileSize(a.size)}</span>}
                        </div>
                      </a>
                      <button
                        className="td-att-delete"
                        title="Delete attachment"
                        disabled={deletingAtt === a._id}
                        onClick={() => handleDeleteAttachment(a._id)}
                      >
                        {deletingAtt === a._id ? "…" : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                          </svg>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Prerequisites & Dependencies Section */}
            {task.prerequisites && Array.isArray(task.prerequisites) && task.prerequisites.length > 0 && (
              <div className="td-meta-prerequisites">
                <span className="td-meta-label" style={{ display: "block", marginBottom: 10 }}>
                  Prerequisites ({task.prerequisites.length})
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {task.prerequisites.map((prereq) => {
                    if (!prereq || !prereq._id) return null;
                    const isComplete = prereq.status === "Done";
                    const statusColor = isComplete ? "#34d399" : prereq.status === "In Progress" ? "#38bdf8" : "#fbbf24";
                    const statusBg = isComplete ? "rgba(16, 185, 129, 0.15)" : prereq.status === "In Progress" ? "rgba(56, 189, 248, 0.15)" : "rgba(245, 158, 11, 0.15)";

                    return (
                      <div
                        key={prereq._id}
                        className="td-prereq-card"
                        style={{
                          cursor: "pointer",
                          backgroundColor: isComplete ? "rgba(16, 185, 129, 0.05)" : "rgba(255, 255, 255, 0.03)",
                        }}
                        onClick={() => navigate(isAdmin ? `/admin/tasks/${prereq._id}/detail` : `/tasks/${prereq._id}/detail`)}
                        title="Click to view prerequisite task"
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={statusColor} strokeWidth="2.2" style={{ flexShrink: 0 }}>
                            <path d="M9 11l3 3L22 4" />
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                          </svg>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc", wordBreak: "break-word" }}>
                              {prereq.title || "Untitled Task"}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                              Assigned: {prereq.assignedTo?.name || "Unassigned"}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: "10px",
                              backgroundColor: statusBg,
                              color: statusColor,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {prereq.status || "Pending"}
                          </span>
                        </div>
                        {prereq.dueDate && (
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                            Due: {fmtDate(prereq.dueDate)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
