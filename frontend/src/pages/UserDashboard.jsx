import { useEffect, useState } from "react";
import API from "../services/taskApi";

/* ── SVG icon set ───────────────────────────────────────────── */
const Icon = {
  tasks: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  pending: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  inProgress: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  completed: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  overdue: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  chart: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  arrowRight: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
};

function UserDashboard() {
  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await API.get("/tasks/dashboard/stats");
      if (response.data.success) {
        setStats(response.data.data.stats);
        setRecentTasks(response.data.data.recentTasks);
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      setError(err.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Dashboard</h1>
        </div>
        <div className="loading-state">
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Dashboard</h1>
        </div>
        <div className="error-state">
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchDashboardStats}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const getTaskStatusColor = (status) => {
    if (status === "Done") return "#10b981";
    if (status === "In Progress") return "#f59e0b";
    if (status === "Pending") return "#6366f1";
    return "#64748b";
  };

  const getTaskStatusBg = (status) => {
    if (status === "Done") return "#d1fae5";
    if (status === "In Progress") return "#fef3c7";
    if (status === "Pending") return "#eef2ff";
    return "#f1f5f9";
  };

  return (
    <div className="page">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Your task overview and statistics</p>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="dashboard-stats-grid">
        {/* Total Tasks Card */}
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon" style={{ color: "#6366f1", backgroundColor: "#eef2ff" }}>
            {Icon.tasks}
          </div>
          <div className="dashboard-stat-content">
            <span className="dashboard-stat-label">Total Tasks</span>
            <span className="dashboard-stat-value">{stats?.total || 0}</span>
          </div>
        </div>

        {/* Pending Card */}
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon" style={{ color: "#6366f1", backgroundColor: "#eef2ff" }}>
            {Icon.pending}
          </div>
          <div className="dashboard-stat-content">
            <span className="dashboard-stat-label">Pending</span>
            <span className="dashboard-stat-value">{stats?.pending || 0}</span>
          </div>
        </div>

        {/* In Progress Card */}
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon" style={{ color: "#f59e0b", backgroundColor: "#fef3c7" }}>
            {Icon.inProgress}
          </div>
          <div className="dashboard-stat-content">
            <span className="dashboard-stat-label">In Progress</span>
            <span className="dashboard-stat-value">{stats?.inProgress || 0}</span>
          </div>
        </div>

        {/* Completed Card */}
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon" style={{ color: "#10b981", backgroundColor: "#d1fae5" }}>
            {Icon.completed}
          </div>
          <div className="dashboard-stat-content">
            <span className="dashboard-stat-label">Completed</span>
            <span className="dashboard-stat-value">{stats?.completed || 0}</span>
          </div>
        </div>

        {/* Overdue Card */}
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon" style={{ color: "#ef4444", backgroundColor: "#fee2e2" }}>
            {Icon.overdue}
          </div>
          <div className="dashboard-stat-content">
            <span className="dashboard-stat-label">Overdue</span>
            <span className="dashboard-stat-value">{stats?.overdue || 0}</span>
          </div>
        </div>

        {/* Completion Rate Card */}
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon" style={{ color: "#8b5cf6", backgroundColor: "#ede9fe" }}>
            {Icon.chart}
          </div>
          <div className="dashboard-stat-content">
            <span className="dashboard-stat-label">Completion Rate</span>
            <span className="dashboard-stat-value">{stats?.completionRate || 0}%</span>
          </div>
        </div>
      </div>

      {/* ── Recent Tasks Section ── */}
      <div className="dashboard-recent-section">
        <h2 className="section-title">Recent Tasks</h2>

        {recentTasks.length === 0 ? (
          <div className="empty-state">
            <p>No recent tasks yet</p>
          </div>
        ) : (
          <div className="recent-tasks-list">
            {recentTasks.map((task) => (
              <div key={task._id} className="recent-task-item">
                <div className="recent-task-header">
                  <div>
                    <h3 className="recent-task-title">{task.title}</h3>
                    <div className="recent-task-meta">
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: getTaskStatusBg(task.status),
                          color: getTaskStatusColor(task.status),
                        }}
                      >
                        {task.status}
                      </span>
                      {task.priority && (
                        <span
                          className="priority-badge"
                          style={{
                            backgroundColor:
                              task.priority === "High"
                                ? "#fee2e2"
                                : task.priority === "Medium"
                                ? "#fef3c7"
                                : "#d1fae5",
                            color:
                              task.priority === "High"
                                ? "#dc2626"
                                : task.priority === "Medium"
                                ? "#d97706"
                                : "#059669",
                          }}
                        >
                          {task.priority}
                        </span>
                      )}
                    </div>
                  </div>
                  <a href={`/tasks/${task._id}/detail`} className="recent-task-link">
                    {Icon.arrowRight}
                  </a>
                </div>
                {task.dueDate && (
                  <p className="recent-task-due">
                    Due: {new Date(task.dueDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default UserDashboard;
