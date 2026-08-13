import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/taskApi";

const COLUMNS = [
  { key: "Pending",     label: "Pending",     color: "#f59e0b", bg: "#fef3c7" },
  { key: "In Progress", label: "In Progress", color: "#3b82f6", bg: "#dbeafe" },
  { key: "Done",        label: "Done",        color: "#10b981", bg: "#d1fae5" },
];

export default function KanbanBoard() {
  const navigate = useNavigate();
  const [grouped, setGrouped] = useState({ Pending: [], "In Progress": [], Done: [] });
  const [loading, setLoading] = useState(true);
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const fetchKanban = async () => {
    try {
      setLoading(true);
      const res = await API.getKanbanTasks();
      setGrouped(res.data.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to load kanban board");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKanban(); }, []);

  const handleDragStart = (e, fromStatus, index) => {
    dragItem.current = { fromStatus, index };
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, toStatus, index) => {
    e.preventDefault();
    dragOverItem.current = { toStatus, index };
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const from = dragItem.current;
    const to = dragOverItem.current;
    if (!from || !to || (from.fromStatus === to.toStatus && from.index === to.index)) return;

    const task = grouped[from.fromStatus][from.index];
    if (task.status === to.toStatus) return;

    try {
      await API.updateTaskWithFiles(task._id, { status: to.toStatus });
      fetchKanban();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to move task");
    }

    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    dragOverItem.current = null;
  };

  if (loading) return (
    <div className="page">
      <div className="td-loading"><div className="at-spinner" /><p>Loading kanban board…</p></div>
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Kanban Board</h1>
          <p>Drag and drop tasks between columns to update status</p>
        </div>
        <button className="primary-button" onClick={() => navigate("/admin/create-task")}>+ Assign Task</button>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 20,
        alignItems: "flex-start",
      }}>
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            style={{
              background: "#fff",
              border: "1px solid var(--gray-200)",
              borderRadius: "var(--radius-lg)",
              padding: 16,
              minHeight: 400,
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
              padding: "8px 12px",
              background: col.bg,
              borderRadius: "var(--radius)",
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: col.color }}>{col.label}</h3>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: col.color,
                background: "#fff",
                padding: "2px 10px",
                borderRadius: "20px",
                border: `1px solid ${col.color}33`,
              }}>
                {grouped[col.key]?.length || 0}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(grouped[col.key] || []).map((task, index) => (
                <div
                  key={task._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, col.key, index)}
                  onDragOver={(e) => handleDragOver(e, col.key, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => navigate(`/admin/tasks/${task._id}/detail`)}
                  style={{
                    background: "#fff",
                    border: "1px solid var(--gray-200)",
                    borderRadius: "var(--radius)",
                    padding: 14,
                    cursor: "grab",
                    transition: "all .15s",
                    boxShadow: "var(--shadow-sm)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "var(--shadow)";
                    e.currentTarget.style.borderColor = "var(--gray-300)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                    e.currentTarget.style.borderColor = "var(--gray-200)";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: "var(--gray-900)", lineHeight: 1.4, flex: 1, paddingRight: 8 }}>
                      {task.title}
                    </h4>
                    <span className={`priority-badge ${task.priority === "High" ? "priority-high" : task.priority === "Critical" ? "priority-critical" : task.priority === "Low" ? "priority-low" : "priority-medium"}`}>
                      {task.priority}
                    </span>
                  </div>

                  {task.description && (
                    <p style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 8, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {task.description}
                    </p>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {task.assignedTo && (
                      <div className="assigned-user">
                        <span className="assignee-avatar-sm">{task.assignedTo.name?.charAt(0)}</span>
                        <span style={{ fontSize: 12, color: "var(--gray-600)" }}>{task.assignedTo.name}</span>
                      </div>
                    )}
                    {task.dueDate && (
                      <span style={{ fontSize: 11, color: "var(--gray-400)", display: "flex", alignItems: "center", gap: 4 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>

                  {(task.tags?.length > 0 || (task.subtasks?.length > 0)) && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {task.tags?.slice(0, 3).map((tag, i) => (
                        <span key={i} style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: "10px", background: "#eef2ff", color: "#4f46e5" }}>
                          #{tag}
                        </span>
                      ))}
                      {task.subtasks?.length > 0 && (
                        <span style={{ fontSize: 10, color: "var(--gray-400)", fontWeight: 600 }}>
                          {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} ✓
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {(!grouped[col.key] || grouped[col.key].length === 0) && (
                <div style={{
                  padding: 24,
                  textAlign: "center",
                  color: "var(--gray-400)",
                  fontSize: 13,
                  border: "2px dashed var(--gray-200)",
                  borderRadius: "var(--radius)",
                }}>
                  No tasks
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
