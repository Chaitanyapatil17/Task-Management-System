import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/taskApi";

const COLUMNS = [
  { key: "Pending",     label: "Pending",     color: "#0891b2", bg: "#e0f2fe" },
  { key: "In Progress", label: "In Progress", color: "#f59e0b", bg: "#fef3c7" },
  { key: "Done",        label: "Done",        color: "#10b981", bg: "#d1fae5" },
];

export default function KanbanBoard() {
  const navigate = useNavigate();
  const [grouped, setGrouped] = useState({ Pending: [], "In Progress": [], Done: [] });
  const [loading, setLoading] = useState(true);
  
  // ── Pagination State ────────────────────────────────────────────────────────
  const [pageSize, setPageSize] = useState(5); // 5, 10, 15, or 'all'
  const [colPages, setColPages] = useState({ Pending: 1, "In Progress": 1, Done: 1 });

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const fetchKanban = async () => {
    try {
      setLoading(true);
      const res = await API.getKanbanTasks();
      setGrouped(res.data.data || { Pending: [], "In Progress": [], Done: [] });
    } catch (err) {
      console.error("Error fetching kanban board:", err);
      alert(err.response?.data?.message || "Failed to load kanban board");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKanban();
  }, []);

  const handlePageSizeChange = (e) => {
    const val = e.target.value === "all" ? "all" : Number(e.target.value);
    setPageSize(val);
    // Reset all column pages to 1 on page size change
    setColPages({ Pending: 1, "In Progress": 1, Done: 1 });
  };

  const handleColPageChange = (colKey, newPage) => {
    setColPages((prev) => ({
      ...prev,
      [colKey]: newPage,
    }));
  };

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
    if (!task || task.status === to.toStatus) return;

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

  if (loading) {
    return (
      <div className="page">
        <div className="td-loading">
          <div className="at-spinner" />
          <p>Loading kanban board…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* ── Page Header ── */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1>Kanban Board</h1>
          <p>Drag and drop tasks between columns to update status</p>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Page Size Selector */}
          <div className="kanban-page-size-picker">
            <label htmlFor="kanban-page-size" style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-600)" }}>
              Cards per column:
            </label>
            <select
              id="kanban-page-size"
              value={pageSize}
              onChange={handlePageSizeChange}
              className="form-select"
              style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}
            >
              <option value={5}>5 cards</option>
              <option value={10}>10 cards</option>
              <option value={15}>15 cards</option>
              <option value="all">Show All</option>
            </select>
          </div>

          <button className="primary-button" onClick={() => navigate("/admin/create-task")}>
            + Assign Task
          </button>
        </div>
      </div>

      {/* ── Kanban Grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        {COLUMNS.map((col) => {
          const colTasks = grouped[col.key] || [];
          const totalCount = colTasks.length;
          const currentLimit = pageSize === "all" ? totalCount || 1 : pageSize;
          const totalPages = Math.ceil(totalCount / currentLimit) || 1;
          const currentPage = Math.min(colPages[col.key] || 1, totalPages);

          const startIndex = (currentPage - 1) * currentLimit;
          const endIndex = pageSize === "all" ? totalCount : startIndex + currentLimit;
          const paginatedTasks = colTasks.slice(startIndex, endIndex);

          return (
            <div
              key={col.key}
              style={{
                background: "var(--card-bg, #ffffff)",
                border: "1px solid var(--gray-200)",
                borderRadius: "var(--radius-lg)",
                padding: 16,
                minHeight: 450,
                display: "flex",
                flexDirection: "column",
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {/* Column Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 14,
                  padding: "10px 14px",
                  background: col.bg,
                  borderRadius: "var(--radius)",
                }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 700, color: col.color }}>{col.label}</h3>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: col.color,
                    background: "#fff",
                    padding: "2px 10px",
                    borderRadius: "20px",
                    border: `1px solid ${col.color}44`,
                  }}
                >
                  {totalCount}
                </span>
              </div>

              {/* Task Cards List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                {paginatedTasks.map((task, relativeIndex) => {
                  const actualIndex = startIndex + relativeIndex;
                  return (
                    <div
                      key={task._id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, col.key, actualIndex)}
                      onDragOver={(e) => handleDragOver(e, col.key, actualIndex)}
                      onDragEnd={handleDragEnd}
                      onClick={() => navigate(`/admin/tasks/${task._id}/detail`)}
                      style={{
                        background: "var(--card-bg, #ffffff)",
                        border: "1px solid var(--gray-200)",
                        borderRadius: "var(--radius)",
                        padding: 14,
                        cursor: "grab",
                        transition: "all .15s ease",
                        boxShadow: "var(--shadow-sm)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = "var(--shadow)";
                        e.currentTarget.style.borderColor = "var(--primary)";
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
                          <span style={{ fontSize: 11, color: "var(--gray-500)", display: "flex", alignItems: "center", gap: 4 }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>

                      {(task.tags?.length > 0 || (task.subtasks?.length > 0)) && (
                        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                          {task.tags?.slice(0, 3).map((tag, i) => (
                            <span key={i} style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: "10px", background: "#ecfdf5", color: "#059669" }}>
                              #{tag}
                            </span>
                          ))}
                          {task.subtasks?.length > 0 && (
                            <span style={{ fontSize: 10, color: "var(--gray-500)", fontWeight: 600 }}>
                              {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} ✓
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div style={{
                    padding: 28,
                    textAlign: "center",
                    color: "var(--gray-400)",
                    fontSize: 13,
                    border: "2px dashed var(--gray-200)",
                    borderRadius: "var(--radius)",
                    marginTop: 10,
                  }}>
                    No tasks in {col.label}
                  </div>
                )}
              </div>

              {/* ── Column Pagination Controls ── */}
              {pageSize !== "all" && totalPages > 1 && (
                <div className="kanban-column-pagination">
                  <button
                    className="btn-kanban-page"
                    disabled={currentPage <= 1}
                    onClick={() => handleColPageChange(col.key, currentPage - 1)}
                  >
                    ‹ Prev
                  </button>
                  <span className="kanban-page-indicator">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    className="btn-kanban-page"
                    disabled={currentPage >= totalPages}
                    onClick={() => handleColPageChange(col.key, currentPage + 1)}
                  >
                    Next ›
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
