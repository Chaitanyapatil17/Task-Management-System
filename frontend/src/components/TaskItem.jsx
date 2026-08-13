import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/taskApi";
import FileViewerModal from "./FileViewerModal";
import { getInlineFileUrl } from "../utils/fileUtils";

const PRIORITY_CFG = {
  Low:      { cls: "priority-low",      dot: "🟢" },
  Medium:   { cls: "priority-medium",   dot: "🟡" },
  High:     { cls: "priority-high",     dot: "🟠" },
  Critical: { cls: "priority-critical", dot: "🔴" },
};

function getDueInfo(dueDate, status) {
  if (!dueDate || status === "Done") return null;
  const due   = new Date(dueDate);
  const now   = new Date();
  const diff  = due - now;
  const days  = Math.ceil(diff / 86400000);

  if (days < 0)  return { label: `Overdue by ${Math.abs(days)}d`,  cls: "due-overdue"  };
  if (days === 0) return { label: "Due today",                       cls: "due-today"    };
  if (days <= 3)  return { label: `Due in ${days}d`,                 cls: "due-soon"     };
  return { label: new Date(dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), cls: "due-normal" };
}

function TaskItem({ task, fetchTasks }) {
  const navigate = useNavigate();
  const [showAttachments, setShowAttachments] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [archiving, setArchiving] = useState(false);

  const user    = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "admin";

  const handleDelete = async () => {
    if (!window.confirm("Delete this task? This cannot be undone.")) return;
    try {
      await API.delete(`/tasks/${task._id}`);
      fetchTasks();
    } catch { alert("Failed to delete task."); }
  };

  const handleArchive = async () => {
    if (!window.confirm("Archive this task?")) return;
    try {
      setArchiving(true);
      await API.archiveTask(task._id);
      fetchTasks();
    } catch { alert("Failed to archive task."); }
    finally { setArchiving(false); }
  };

  const handleRestore = async () => {
    if (!window.confirm("Restore this task from archive?")) return;
    try {
      setArchiving(true);
      await API.restoreTask(task._id);
      fetchTasks();
    } catch { alert("Failed to restore task."); }
    finally { setArchiving(false); }
  };

  const handleView = () => {
    navigate(isAdmin ? `/admin/tasks/${task._id}/detail` : `/tasks/${task._id}/detail`);
  };

  const handleEdit = () => {
    navigate(isAdmin ? `/admin/edit-task/${task._id}` : `/edit-task/${task._id}`);
  };

  const statusClass  = task.status?.toLowerCase().replace(" ", "-") || "pending";
  const priorityCfg  = PRIORITY_CFG[task.priority] || PRIORITY_CFG.Medium;
  const dueInfo      = getDueInfo(task.dueDate, task.status);
  const attachments  = task.attachments || [];
  const subtasks     = task.subtasks || [];
  const completedSubtasks = subtasks.filter((s) => s.completed).length;
  const subtaskProgress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;
  const tags         = task.tags || [];

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className={`task-card ${dueInfo?.cls === "due-overdue" ? "task-card-overdue" : ""}`}>
      {selectedFile && (
        <FileViewerModal file={selectedFile} onClose={() => setSelectedFile(null)} />
      )}

      <div className="task-card-top">
        <div className="task-card-title-row">
          <h3>{task.title}</h3>
          <div className="task-card-badges">
            <span className={`priority-badge ${priorityCfg.cls}`}>
              {priorityCfg.dot} {task.priority || "Medium"}
            </span>
            <span className={`status-badge ${statusClass}`}>{task.status}</span>
            {task.isArchived && <span className="status-badge pending">Archived</span>}
          </div>
        </div>

        <p className="task-description">
          {task.description || "No description provided."}
        </p>

        {task.assignedTo && isAdmin && (
          <div className="task-assignee">
            <span className="assignee-avatar">{task.assignedTo.name?.charAt(0)}</span>
            <span className="assignee-name">{task.assignedTo.name}</span>
            <span className="assignee-email">{task.assignedTo.email}</span>
          </div>
        )}

        {tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {tags.map((tag, i) => (
              <span key={i} style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 10px",
                borderRadius: 20,
                background: "#eef2ff",
                color: "#4f46e5",
              }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {subtasks.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "var(--gray-500)" }}>Subtasks</span>
              <span style={{ fontSize: 12, color: "var(--gray-500)" }}>
                {completedSubtasks}/{subtasks.length}
              </span>
            </div>
            <div style={{ height: 6, background: "var(--gray-100)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: `${subtaskProgress}%`, height: "100%", background: subtaskProgress === 100 ? "var(--success)" : "var(--primary)", borderRadius: 99, transition: "width .3s ease" }} />
            </div>
          </div>
        )}
      </div>

      <div className="task-card-bottom">
        <div className="task-meta">
          <span className="task-date">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>

          {dueInfo && (
            <span className={`due-badge ${dueInfo.cls}`}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {dueInfo.label}
            </span>
          )}

          {attachments.length > 0 && (
            <button className="attachments-toggle" onClick={() => setShowAttachments((p) => !p)}>
              📎 {attachments.length} file{attachments.length > 1 ? "s" : ""}
            </button>
          )}
        </div>

        <div className="task-actions">
          <button className="view-button" onClick={handleView}>View</button>
          <button className="edit-button" onClick={handleEdit}>Edit</button>
          {task.isArchived ? (
            <button className="edit-button" onClick={handleRestore} disabled={archiving}>
              {archiving ? "..." : "Restore"}
            </button>
          ) : (
            <button className="edit-button" onClick={handleArchive} disabled={archiving}>
              {archiving ? "..." : "Archive"}
            </button>
          )}
          <button className="delete-button" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      {showAttachments && attachments.length > 0 && (
        <div className="task-attachments">
          {attachments.map((a, i) => (
            <a
              key={i}
              href={getInlineFileUrl(a)}
              target="_blank"
              rel="noreferrer"
              className="attachment-chip"
              onClick={(e) => {
                e.preventDefault();
                setSelectedFile(a);
              }}
            >
              📄 {a.filename}
              {a.size && <span className="attachment-size">{formatSize(a.size)}</span>}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default TaskItem;
