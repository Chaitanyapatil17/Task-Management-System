import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/taskApi";

// Priority config: colour + label
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
  const diff  = due - now;                       // ms
  const days  = Math.ceil(diff / 86400000);      // positive = future, negative = past

  if (days < 0)  return { label: `Overdue by ${Math.abs(days)}d`,  cls: "due-overdue"  };
  if (days === 0) return { label: "Due today",                       cls: "due-today"    };
  if (days <= 3)  return { label: `Due in ${days}d`,                 cls: "due-soon"     };
  return { label: new Date(dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), cls: "due-normal" };
}

function TaskItem({ task, fetchTasks }) {
  const navigate = useNavigate();
  const [showAttachments, setShowAttachments] = useState(false);

  const user    = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "admin";

  const handleDelete = async () => {
    if (!window.confirm("Delete this task? This cannot be undone.")) return;
    try {
      await API.delete(`/tasks/${task._id}`);
      fetchTasks();
    } catch { alert("Failed to delete task."); }
  };

  const handleView = () => {
    navigate(isAdmin ? `/admin/tasks/${task._id}/detail` : `/tasks/${task._id}/detail`);
  };

  const handleEdit = () => {
    navigate(isAdmin ? `/admin/edit-task/${task._id}` : `/edit-task/${task._id}`);
  };
  const statusClass  = task.status.toLowerCase().replace(" ", "-");
  const priorityCfg  = PRIORITY_CFG[task.priority] || PRIORITY_CFG.Medium;
  const dueInfo      = getDueInfo(task.dueDate, task.status);
  const attachments  = task.attachments || [];

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className={`task-card ${dueInfo?.cls === "due-overdue" ? "task-card-overdue" : ""}`}>

      <div className="task-card-top">
        {/* Title row: title + priority + status */}
        <div className="task-card-title-row">
          <h3>{task.title}</h3>
          <div className="task-card-badges">
            <span className={`priority-badge ${priorityCfg.cls}`}>
              {priorityCfg.dot} {task.priority || "Medium"}
            </span>
            <span className={`status-badge ${statusClass}`}>{task.status}</span>
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
      </div>

      <div className="task-card-bottom">
        <div className="task-meta">
          {/* Created date */}
          <span className="task-date">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>

          {/* Due date / overdue pill */}
          {dueInfo && (
            <span className={`due-badge ${dueInfo.cls}`}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {dueInfo.label}
            </span>
          )}

          {/* Attachments toggle */}
          {attachments.length > 0 && (
            <button className="attachments-toggle" onClick={() => setShowAttachments((p) => !p)}>
              📎 {attachments.length} file{attachments.length > 1 ? "s" : ""}
            </button>
          )}
        </div>

        <div className="task-actions">
          <button className="view-button"   onClick={handleView}>View</button>
          <button className="edit-button"   onClick={handleEdit}>Edit</button>
          <button className="delete-button" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      {/* Attachment list */}
      {showAttachments && attachments.length > 0 && (
        <div className="task-attachments">
          {attachments.map((a, i) => (
            <a
              key={i}
              href={a.url || `http://localhost:5000/uploads/${a.storedName}`}
              target="_blank"
              rel="noreferrer"
              className="attachment-chip"
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
