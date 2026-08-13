import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/taskApi";

// Debounce helper — delays search API call while the user is still typing
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

  // ── data ──────────────────────────────────────────────────────────────
  const [tasks,      setTasks]      = useState([]);
  const [stats,      setStats]      = useState({ total: 0, pending: 0, inProgress: 0, done: 0 });
  const [users,      setUsers]      = useState([]);   // for user-filter dropdown
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalTasks: 0 });
  const [loading,    setLoading]    = useState(true);

  // ── filters ───────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [userFilter,   setUserFilter]   = useState("");          // ObjectId string or ""
  const [page,         setPage]         = useState(1);

  const debouncedSearch = useDebounce(searchInput, 400);

  // ── fetch users once for the dropdown ─────────────────────────────────
  useEffect(() => {
    API.get("/auth/users")
      .then((r) => setUsers(r.data.data.filter((u) => u.role === "user")))
      .catch(console.error);
  }, []);

  // ── fetch tasks whenever any filter / page changes ────────────────────
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.set("page",  page);
      params.set("limit", LIMIT);
      if (debouncedSearch)              params.set("search",     debouncedSearch);
      if (statusFilter !== "All")       params.set("status",     statusFilter);
      if (userFilter)                   params.set("assignedTo", userFilter);

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
  }, [page, debouncedSearch, statusFilter, userFilter]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, userFilter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // ── delete ────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this task? This cannot be undone.")) return;
    try {
      await API.delete(`/tasks/${id}`);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete task");
    }
  };

  // ── pagination helpers ────────────────────────────────────────────────
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

      {/* ── PAGE HEADER ─────────────────────────────────────────── */}
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

      {/* ── STAT CARDS ──────────────────────────────────────────── */}
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

      {/* ── FILTERS BAR ─────────────────────────────────────────── */}
      <div className="filters-bar">
        {/* Search */}
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

        {/* Status filter */}
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>
          ))}
        </select>

        {/* User filter */}
        <select
          className="filter-select"
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
        >
          <option value="">All Users</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>{u.name}</option>
          ))}
        </select>

        {/* Active filter count / reset */}
        {(debouncedSearch || statusFilter !== "All" || userFilter) && (
          <button
            className="filter-reset-btn"
            onClick={() => { setSearchInput(""); setStatusFilter("All"); setUserFilter(""); }}
          >
            Reset filters
          </button>
        )}

        <span className="task-count" style={{ marginLeft: "auto" }}>
          {totalTasks} {totalTasks === 1 ? "task" : "tasks"}
        </span>
      </div>

      {/* ── TABLE ───────────────────────────────────────────────── */}
      <div className="admin-table-card">
        {loading ? (
          <div className="empty-state"><div className="at-spinner" /><p>Loading tasks…</p></div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>No tasks found</h3>
            <p>{debouncedSearch || statusFilter !== "All" || userFilter ? "Try adjusting your filters." : "Assign a task to get started."}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="task-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, idx) => (
                  <tr key={task._id}>
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

      {/* ── PAGINATION ──────────────────────────────────────────── */}
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
