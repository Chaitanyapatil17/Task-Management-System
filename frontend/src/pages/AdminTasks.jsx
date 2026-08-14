import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/taskApi";

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const STAT_CARDS = [
  { key: "total",      label: "Total Tasks",  icon: "📋", color: "blue"   },
  { key: "pending",    label: "Pending",      icon: "⏳", color: "yellow" },
  { key: "inProgress", label: "In Progress",  icon: "🔄", color: "blue" },
  { key: "done",       label: "Completed",    icon: "✅", color: "green"  },
];

const STATUS_OPTIONS = ["All", "Pending", "In Progress", "Done"];
const LIMIT = 10;

export default function AdminTasks() {
  const navigate = useNavigate();

  const [tasks,      setTasks]      = useState([]);
  const [stats,      setStats]      = useState({ total: 0, pending: 0, inProgress: 0, done: 0 });
  const [users,      setUsers]      = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalTasks: 0 });
  const [loading,    setLoading]    = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [userFilter,   setUserFilter]   = useState("");
  const [tagFilter,    setTagFilter]    = useState("");
  const [archivedFilter, setArchivedFilter] = useState("active");
  const [page,         setPage]         = useState(1);

  const [selectedTasks, setSelectedTasks] = useState([]);
  const [bulkAction,    setBulkAction]    = useState("");
  const [bulkLoading,   setBulkLoading]   = useState(false);

  const debouncedSearch = useDebounce(searchInput, 400);

  useEffect(() => {
    API.get("/auth/users")
      .then((r) => setUsers(r.data.data.filter((u) => u.role === "user")))
      .catch(console.error);
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.set("page",  page);
      params.set("limit", LIMIT);
      if (debouncedSearch)              params.set("search",     debouncedSearch);
      if (statusFilter !== "All")       params.set("status",     statusFilter);
      if (userFilter)                   params.set("assignedTo", userFilter);
      if (tagFilter)                    params.set("tags",       tagFilter);
      if (archivedFilter !== "all")     params.set("archived",   archivedFilter === "archived" ? "true" : "false");

      const res = await API.get(`/tasks?${params.toString()}`);

      setTasks(res.data.data);
      if (res.data.stats)      setStats(res.data.stats);
      if (res.data.pagination) setPagination(res.data.pagination);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      alert(err.response?.data?.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, userFilter, tagFilter, archivedFilter]);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, userFilter, tagFilter, archivedFilter]);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Real-time synchronization
  useEffect(() => {
    const handleRealtimeUpdate = () => {
      fetchTasks();
    };

    window.addEventListener("socket:task:created", handleRealtimeUpdate);
    window.addEventListener("socket:task:updated", handleRealtimeUpdate);
    window.addEventListener("socket:task:deleted", handleRealtimeUpdate);
    window.addEventListener("socket:tasks:bulk_updated", handleRealtimeUpdate);

    return () => {
      window.removeEventListener("socket:task:created", handleRealtimeUpdate);
      window.removeEventListener("socket:task:updated", handleRealtimeUpdate);
      window.removeEventListener("socket:task:deleted", handleRealtimeUpdate);
      window.removeEventListener("socket:tasks:bulk_updated", handleRealtimeUpdate);
    };
  }, [fetchTasks]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this task? This cannot be undone.")) return;
    try {
      await API.delete(`/tasks/${id}`);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete task");
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTasks(tasks.map((t) => t._id));
    } else {
      setSelectedTasks([]);
    }
  };

  const handleSelectTask = (id) => {
    setSelectedTasks((prev) =>
      prev.includes(id) ? prev.filter((tid) => tid !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedTasks.length === 0) return;
    try {
      setBulkLoading(true);
      await API.bulkAction(selectedTasks, bulkAction);
      setSelectedTasks([]);
      setBulkAction("");
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || "Bulk action failed");
    } finally {
      setBulkLoading(false);
    }
  };

  const { currentPage, totalPages, totalTasks } = pagination;

  const pageNumbers = () => {
    const pages = [];
    const delta = 2;
    const left  = Math.max(1, currentPage - delta);
    const right = Math.min(totalPages, currentPage + delta);
    for (let i = left; i <= right; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="page">

      <div className="page-header">
        <div>
          <h1>Manage Tasks</h1>
          <p>Search, filter and manage all assigned tasks</p>
        </div>
        <div className="page-header-actions">
          <button className="primary-button" onClick={() => navigate("/admin/create-task")}>
            + Assign Task
          </button>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: 28 }}>
        {STAT_CARDS.map(({ key, label, icon, color }) => (
          <div className="dashboard-card" key={key}>
            <div className={`dashboard-card-icon ${color}`}>{icon}</div>
            <div className="dashboard-card-body">
              <p className="dashboard-card-label">{label}</p>
              <h2 className="dashboard-card-value">{stats[key]}</h2>
            </div>
          </div>
        ))}
      </div>

      <div className="filters-bar">
        <div className="filter-search-wrap">
          <svg className="filter-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            className="filter-search"
            placeholder="Search by title, user name or email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button className="filter-clear-btn" onClick={() => setSearchInput("")} title="Clear search">✕</button>
          )}
        </div>

        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>
          ))}
        </select>

        <select className="filter-select" value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
          <option value="">All Users</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>{u.name}</option>
          ))}
        </select>

        <input
          type="text"
          className="filter-search"
          placeholder="Filter by tag..."
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          style={{ width: 160 }}
        />

        <select className="filter-select" value={archivedFilter} onChange={(e) => setArchivedFilter(e.target.value)}>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>

        {(debouncedSearch || statusFilter !== "All" || userFilter || tagFilter || archivedFilter !== "active") && (
          <button
            className="filter-reset-btn"
            onClick={() => { setSearchInput(""); setStatusFilter("All"); setUserFilter(""); setTagFilter(""); setArchivedFilter("active"); }}
          >
            Reset filters
          </button>
        )}

        <span className="task-count" style={{ marginLeft: "auto" }}>
          {totalTasks} {totalTasks === 1 ? "task" : "tasks"}
        </span>
      </div>

      {selectedTasks.length > 0 && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          padding: "12px 16px",
          background: "var(--primary-light)",
          border: "1px solid var(--primary)",
          borderRadius: "var(--radius)",
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--primary-dark)" }}>
            {selectedTasks.length} selected
          </span>
          <select
            className="filter-select"
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            style={{ minWidth: 180 }}
          >
            <option value="">Select action...</option>
            <option value="delete">Delete</option>
            <option value="archive">Archive</option>
            <option value="restore">Restore</option>
            <option value="markDone">Mark as Done</option>
            <option value="markPending">Mark as Pending</option>
          </select>
          <button
            className="primary-button"
            onClick={handleBulkAction}
            disabled={!bulkAction || bulkLoading}
            style={{ padding: "8px 16px", fontSize: 13 }}
          >
            {bulkLoading ? "Applying..." : "Apply"}
          </button>
          <button
            className="cancel-button"
            onClick={() => { setSelectedTasks([]); setBulkAction(""); }}
            style={{ padding: "8px 16px", fontSize: 13 }}
          >
            Cancel
          </button>
        </div>
      )}

      <div className="admin-table-card">
        {loading ? (
          <div className="empty-state"><div className="at-spinner" /><p>Loading tasks…</p></div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>No tasks found</h3>
            <p>{debouncedSearch || statusFilter !== "All" || userFilter || tagFilter || archivedFilter !== "active" ? "Try adjusting your filters." : "Assign a task to get started."}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="task-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={selectedTasks.length === tasks.length && tasks.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>#</th>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Tags</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, idx) => (
                  <tr key={task._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedTasks.includes(task._id)}
                        onChange={() => handleSelectTask(task._id)}
                      />
                    </td>
                    <td style={{ color: "var(--gray-400)", fontSize: 12 }}>
                      {(currentPage - 1) * LIMIT + idx + 1}
                    </td>
                    <td className="task-title">{task.title}</td>
                    <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {task.description || "—"}
                    </td>
                    <td>
                      <span className={`status-badge ${task.status?.toLowerCase().replace(" ", "-")}`}>
                        {task.status}
                      </span>
                      {task.isArchived && <span className="status-badge pending" style={{ marginLeft: 4 }}>Archived</span>}
                    </td>
                    <td>
                      {task.assignedTo ? (
                        <div className="assigned-user">
                          <span className="assignee-avatar-sm">{task.assignedTo.name?.charAt(0)}</span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{task.assignedTo.name}</div>
                            <div style={{ color: "var(--gray-400)", fontSize: 11 }}>{task.assignedTo.email}</div>
                          </div>
                        </div>
                      ) : "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {task.tags?.slice(0, 2).map((tag, i) => (
                          <span key={i} style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "#eef2ff", color: "#4f46e5" }}>
                            #{tag}
                          </span>
                        ))}
                        {task.tags?.length > 2 && <span style={{ fontSize: 10, color: "var(--gray-400)" }}>+{task.tags.length - 2}</span>}
                      </div>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {task.createdAt ? new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button className="view-button"   onClick={() => navigate(`/admin/tasks/${task._id}/detail`)}>View</button>
                        <button className="edit-button"   onClick={() => navigate(`/admin/edit-task/${task._id}`)}>Edit</button>
                        <button className="delete-button" onClick={() => handleDelete(task._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            onClick={() => setPage((p) => p - 1)}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>

          {currentPage > 3 && (
            <>
              <button className="page-btn" onClick={() => setPage(1)}>1</button>
              {currentPage > 4 && <span className="page-ellipsis">…</span>}
            </>
          )}

          {pageNumbers().map((n) => (
            <button
              key={n}
              className={`page-btn ${n === currentPage ? "page-btn-active" : ""}`}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}

          {currentPage < totalPages - 2 && (
            <>
              {currentPage < totalPages - 3 && <span className="page-ellipsis">…</span>}
              <button className="page-btn" onClick={() => setPage(totalPages)}>{totalPages}</button>
            </>
          )}

          <button
            className="page-btn"
            onClick={() => setPage((p) => p + 1)}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>

          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
        </div>
      )}

    </div>
  );
}
