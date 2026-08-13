import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/taskApi";
import FileViewerModal from "../components/FileViewerModal";
import { getInlineFileUrl } from "../utils/fileUtils";

const PRIORITY_CFG = {
  Low:      { cls: "priority-low",      label: "Low"      },
  Medium:   { cls: "priority-medium",   label: "Medium"   },
  High:     { cls: "priority-high",     label: "High"     },
  Critical: { cls: "priority-critical", label: "Critical" },
};

function timeAgo(date) {
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

function ActivityIcon({ type }) {
  if (type === "status_change") return (
    <span className="activity-icon activity-icon--status">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
    </span>
  );
  if (type === "assignment") return (
    <span className="activity-icon activity-icon--assign">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    </span>
  );
  if (type === "attachment") return (
    <span className="activity-icon activity-icon--attach">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
    </span>
  );
  return (
    <span className="activity-icon activity-icon--comment">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    </span>
  );
}

export default function TaskDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const textareaRef = useRef(null);

  const user    = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "admin";
  const backPath = isAdmin ? "/admin/tasks" : "/tasks";
  const editPath = isAdmin ? `/admin/edit-task/${id}` : `/edit-task/${id}`;

  const [task,         setTask]         = useState(null);
  const [comments,     setComments]     = useState([]);
  const [text,         setText]         = useState("");
  const [taskLoading,  setTaskLoading]  = useState(true);
  const [cmtLoading,   setCmtLoading]   = useState(true);
  const [posting,      setPosting]      = useState(false);
  const [error,        setError]        = useState("");
  const [deletingAtt,  setDeletingAtt]  = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);

  useEffect(() => {
    API.get(`/tasks/${id}`)
      .then((r) => setTask(r.data.data))
      .catch(() => { setError("Task not found."); })
      .finally(() => setTaskLoading(false));
  }, [id]);

  const fetchComments = () => {
    setCmtLoading(true);
    API.get(`/tasks/${id}/comments`)
      .then((r) => setComments(r.data.data))
      .catch(console.error)
      .finally(() => setCmtLoading(false));
  };
  useEffect(() => { fetchComments(); }, [id]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      setPosting(true);
      await API.post(`/tasks/${id}/comments`, { text: text.trim() });
      setText("");
      fetchComments();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (cid) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await API.delete(`/tasks/${id}/comments/${cid}`);
      setComments((prev) => prev.filter((c) => c._id !== cid));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete");
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm("Delete this attachment? It will be removed from Cloudinary too.")) return;
    try {
      setDeletingAtt(attachmentId);
      await API.delete(`/tasks/${id}/attachments/${attachmentId}`);
      setTask((prev) => ({
        ...prev,
        attachments: prev.attachments.filter((a) => a._id !== attachmentId),
      }));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete attachment");
    } finally {
      setDeletingAtt(null);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm("Archive this task?")) return;
    try {
      setArchiving(true);
      await API.archiveTask(id);
      setTask((prev) => ({ ...prev, isArchived: true, archivedAt: new Date() }));
    } catch { alert("Failed to archive task."); }
    finally { setArchiving(false); }
  };

  const handleRestore = async () => {
    if (!window.confirm("Restore this task from archive?")) return;
    try {
      setArchiving(true);
      await API.restoreTask(id);
      setTask((prev) => ({ ...prev, isArchived: false, archivedAt: null }));
    } catch { alert("Failed to restore task."); }
    finally { setArchiving(false); }
  };

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    try {
      setAddingSubtask(true);
      await API.addSubtask(id, newSubtaskTitle.trim());
      setNewSubtaskTitle("");
      const r = await API.get(`/tasks/${id}`);
      setTask(r.data.data);
    } catch { alert("Failed to add subtask."); }
    finally { setAddingSubtask(false); }
  };

  const handleToggleSubtask = async (subtaskId, completed) => {
    try {
      await API.updateSubtask(id, subtaskId, { completed: !completed });
      const r = await API.get(`/tasks/${id}`);
      setTask(r.data.data);
    } catch { alert("Failed to update subtask."); }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    if (!window.confirm("Delete this subtask?")) return;
    try {
      await API.deleteSubtask(id, subtaskId);
      const r = await API.get(`/tasks/${id}`);
      setTask(r.data.data);
    } catch { alert("Failed to delete subtask."); }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }
  };

  if (taskLoading) return (
    <div className="page">
      <div className="td-loading"><div className="at-spinner" /><p>Loading task…</p></div>
    </div>
  );

  if (error || !task) return (
    <div className="page">
      <div className="empty-state">
        <div className="empty-icon">⚠️</div>
        <h3>Task not found</h3>
        <p>{error}</p>
        <button className="primary-button" style={{ marginTop: 16 }} onClick={() => navigate(backPath)}>← Back</button>
      </div>
    </div>
  );

  const statusClass = task.status?.toLowerCase().replace(" ", "-") || "pending";
  const priorityCfg = PRIORITY_CFG[task.priority] || PRIORITY_CFG.Medium;
  const userComments = comments.filter((c) => c.type === "comment").length;
  const subtasks = task.subtasks || [];
  const tags = task.tags || [];
  const customFields = task.customFields || [];

  return (
    <div className="page">

      <div className="page-header">
        <div>
          <button className="td-back-btn" onClick={() => navigate(backPath)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back to Tasks
          </button>
          <h1 style={{ marginTop: 8 }}>{task.title}</h1>
          {task.isArchived && (
            <span className="status-badge pending" style={{ marginTop: 6 }}>Archived</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!task.isArchived ? (
            <button className="cancel-button" onClick={handleArchive} disabled={archiving}>
              {archiving ? "..." : "Archive"}
            </button>
          ) : (
            <button className="cancel-button" onClick={handleRestore} disabled={archiving}>
              {archiving ? "..." : "Restore"}
            </button>
          )}
          <button className="primary-button" onClick={() => navigate(editPath)}>Edit Task</button>
        </div>
      </div>

      <div className="td-layout">

        <div className="td-left">

          <div className="td-card">
            <h3 className="td-card-title">Description</h3>
            <p className="td-description">
              {task.description || <span style={{ color: "var(--text-3)" }}>No description provided.</span>}
            </p>
          </div>

          {tags.length > 0 && (
            <div className="td-card">
              <h3 className="td-card-title">Tags</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {tags.map((tag, i) => (
                  <span key={i} style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "3px 12px",
                    borderRadius: 20,
                    background: "#eef2ff",
                    color: "#4f46e5",
                  }}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {customFields.length > 0 && (
            <div className="td-card">
              <h3 className="td-card-title">Custom Fields</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {customFields.map((f, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 500 }}>{f.key}</span>
                    <span style={{ fontSize: 13, color: "var(--text-1)", fontWeight: 600 }}>{f.value || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="td-card">
            <h3 className="td-card-title">
              Subtasks
              <span className="td-comment-count">{subtasks.filter((s) => s.completed).length}/{subtasks.length}</span>
            </h3>

            <form onSubmit={handleAddSubtask} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                className="td-comment-input"
                placeholder="Add a subtask..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className="primary-button" style={{ padding: "6px 14px", fontSize: 12 }} disabled={addingSubtask}>
                {addingSubtask ? "..." : "Add"}
              </button>
            </form>

            {subtasks.length === 0 ? (
              <p className="td-feed-empty">No subtasks yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {subtasks.map((sub) => (
                  <div key={sub._id} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: "var(--radius)",
                    background: sub.completed ? "var(--success-light)" : "var(--gray-50)",
                    border: "1px solid var(--border)",
                  }}>
                    <input
                      type="checkbox"
                      checked={sub.completed}
                      onChange={() => handleToggleSubtask(sub._id, sub.completed)}
                      style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--primary)" }}
                    />
                    <span style={{
                      flex: 1,
                      fontSize: 13,
                      color: sub.completed ? "var(--gray-400)" : "var(--text-1)",
                      textDecoration: sub.completed ? "line-through" : "none",
                    }}>
                      {sub.title}
                    </span>
                    <button
                      className="td-feed-delete"
                      onClick={() => handleDeleteSubtask(sub._id)}
                      title="Delete subtask"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="td-card">
            <div className="td-feed-header">
              <h3 className="td-card-title">
                Activity
                <span className="td-comment-count">{userComments} comment{userComments !== 1 ? "s" : ""}</span>
              </h3>
            </div>

            <form onSubmit={handlePost} className="td-comment-form">
              <div className="td-comment-avatar">{user.name?.charAt(0)?.toUpperCase()}</div>
              <div className="td-comment-input-wrap">
                <textarea
                  ref={textareaRef}
                  className="td-comment-input"
                  placeholder="Write a comment…"
                  value={text}
                  onChange={handleTextChange}
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePost(e); }
                  }}
                />
                {text.trim() && (
                  <div className="td-comment-actions">
                    <button type="button" className="cancel-button" style={{ padding: "5px 12px", fontSize: 12 }} onClick={() => setText("")}>Cancel</button>
                    <button type="submit" className="primary-button" style={{ padding: "5px 14px", fontSize: 12 }} disabled={posting}>
                      {posting ? "Posting…" : "Comment"}
                    </button>
                  </div>
                )}
              </div>
            </form>

            {cmtLoading ? (
              <div className="td-feed-loading"><div className="at-spinner" style={{ width: 24, height: 24, marginBottom: 0 }} /></div>
            ) : comments.length === 0 ? (
              <p className="td-feed-empty">No activity yet. Be the first to comment.</p>
            ) : (
              <div className="td-feed">
                {comments.map((c) => (
                  <div key={c._id} className={`td-feed-item ${c.type !== "comment" ? "td-feed-item--activity" : ""}`}>
                    {c.type === "comment" ? (
                      <>
                        <div className="td-feed-avatar">{c.author?.name?.charAt(0)}</div>
                        <div className="td-feed-body">
                          <div className="td-feed-meta">
                            <span className="td-feed-author">{c.author?.name}</span>
                            <span className="td-feed-role">{c.author?.role}</span>
                            <span className="td-feed-time">{timeAgo(c.createdAt)}</span>
                            {(c.author?._id === user.id || c.author?._id === user._id || isAdmin) && (
                              <button className="td-feed-delete" onClick={() => handleDelete(c._id)} title="Delete comment">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                              </button>
                            )}
                          </div>
                          <p className="td-feed-text">{c.text}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <ActivityIcon type={c.type} />
                        <div className="td-feed-body">
                          <p className="td-feed-activity-text">
                            <span className="td-feed-author">{c.author?.name}</span>
                            {" "}{c.text}
                          </p>
                          <span className="td-feed-time">{timeAgo(c.createdAt)}</span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        <div className="td-right">
          <div className="td-card td-meta-card">

            <div className="td-meta-row">
              <span className="td-meta-label">Status</span>
              <span className={`status-badge ${statusClass}`}>{task.status}</span>
            </div>

            <div className="td-meta-row">
              <span className="td-meta-label">Priority</span>
              <span className={`priority-badge ${priorityCfg.cls}`}>{priorityCfg.label}</span>
            </div>

            {task.assignedTo && (
              <div className="td-meta-row">
                <span className="td-meta-label">Assigned to</span>
                <div className="td-meta-user">
                  <span className="assignee-avatar-sm">{task.assignedTo.name?.charAt(0)}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>{task.assignedTo.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>{task.assignedTo.email}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="td-meta-row">
              <span className="td-meta-label">Start date</span>
              <span className="td-meta-value">{task.startDate ? fmtDate(task.startDate) : "Not set"}</span>
            </div>

            <div className="td-meta-row">
              <span className="td-meta-label">Due date</span>
              <span className="td-meta-value">{task.dueDate ? fmtDate(task.dueDate) : "Not set"}</span>
            </div>

            <div className="td-meta-row">
              <span className="td-meta-label">Created</span>
              <span className="td-meta-value">{fmtDate(task.createdAt)}</span>
            </div>

            <div className="td-meta-row">
              <span className="td-meta-label">Last updated</span>
              <span className="td-meta-value">{fmtDate(task.updatedAt)}</span>
            </div>

            {selectedFile && (
              <FileViewerModal file={selectedFile} onClose={() => setSelectedFile(null)} />
            )}

            {task.attachments?.length > 0 && (
              <div className="td-meta-attachments">
                <span className="td-meta-label" style={{ display: "block", marginBottom: 8 }}>
                  Attachments ({task.attachments.length})
                </span>
                {task.attachments.map((a) => (
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
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                      </svg>
                      {a.filename}
                    </a>
                    <button
                      className="td-att-delete"
                      title="Delete attachment"
                      disabled={deletingAtt === a._id}
                      onClick={() => handleDeleteAttachment(a._id)}
                    >
                      {deletingAtt === a._id ? "…" : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {task.prerequisites && Array.isArray(task.prerequisites) && task.prerequisites.length > 0 && (
              <div className="td-meta-prerequisites">
                <span className="td-meta-label" style={{ display: "block", marginBottom: 8 }}>
                  Prerequisites ({task.prerequisites.length})
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {task.prerequisites.map((prereq) => {
                    if (!prereq || !prereq._id) return null;
                    const isComplete = prereq.status === "Done";
                    const statusColor = isComplete ? "#10b981" : prereq.status === "In Progress" ? "#f59e0b" : "#6366f1";
                    const statusBg = isComplete ? "#d1fae5" : prereq.status === "In Progress" ? "#fef3c7" : "#eef2ff";
                    return (
                      <div
                        key={prereq._id}
                        style={{
                          padding: 10,
                          border: "1px solid var(--gray-200)",
                          borderRadius: "var(--radius)",
                          backgroundColor: isComplete ? "rgba(16, 185, 129, 0.05)" : "var(--gray-50)",
                          opacity: isComplete ? 1 : 0.8,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isComplete ? "#10b981" : "#6366f1"} strokeWidth="2" style={{ opacity: 0.6, flexShrink: 0 }}>
                            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                          </svg>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", wordBreak: "break-word" }}>
                              {prereq.title || "Untitled Task"}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                              Assigned to: {prereq.assignedTo?.name || "Unknown User"}
                            </div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, backgroundColor: statusBg, color: statusColor, flexShrink: 0, whiteSpace: "nowrap" }}>
                            {prereq.status || "Unknown"}
                          </span>
                        </div>
                        {prereq.dueDate && (
                          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                            Due: {new Date(prereq.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
