import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/taskApi";

function AdminDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // stats come from backend MongoDB aggregation — always reflects ALL tasks, not just the page
  const [stats,  setStats]  = useState({ total: 0, pending: 0, inProgress: 0, done: 0 });
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    // limit=5: only fetch 5 tasks for the "Recent Tasks" table.
    // The backend returns stats via aggregate over every task regardless of limit.
    API.get("/tasks?limit=5&page=1")
      .then((r) => {
        setRecent(r.data.data || []);
        if (r.data.stats) setStats(r.data.stats);
      })
      .catch(console.error);
  }, []);

  const { total, pending, inProgress, done } = stats;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  const statCards = [
    { label: "Total Tasks", value: total,      icon: "📋", color: "blue",   change: null },
    { label: "Pending",     value: pending,    icon: "⏳", color: "yellow", change: null },
    { label: "In Progress", value: inProgress, icon: "🔄", color: "purple", change: null },
    { label: "Completed",   value: done,       icon: "✅", color: "green",  change: `${completionRate}% rate` },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, <strong>{user.name}</strong> — here's what's happening</p>
        </div>
        <button className="primary-button" onClick={() => navigate("/admin/create-task")}>
          + Assign Task
        </button>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-grid">
        {statCards.map((s) => (
          <div className="dashboard-card" key={s.label}>
            <div className={`dashboard-card-icon ${s.color}`}>{s.icon}</div>
            <div className="dashboard-card-body">
              <p className="dashboard-card-label">{s.label}</p>
              <h2 className="dashboard-card-value">{s.value}</h2>
              {s.change && <span className="dashboard-card-change">{s.change}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="dashboard-progress-card">
        <div className="dashboard-progress-header">
          <span>Overall Completion</span>
          <strong>{completionRate}%</strong>
        </div>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${completionRate}%` }} />
        </div>
        <div className="progress-bar-legend">
          <span className="legend-dot done" /> Done ({done})
          <span className="legend-dot in-progress" /> In Progress ({inProgress})
          <span className="legend-dot pending" /> Pending ({pending})
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="dashboard-section-header">
        <h2>Recent Tasks</h2>
        <button className="link-button" onClick={() => navigate("/admin/tasks")}>View all →</button>
      </div>

      {recent.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No tasks yet</h3>
          <p>Assign your first task to get started.</p>
          <button className="primary-button" style={{ marginTop: 16 }} onClick={() => navigate("/admin/create-task")}>
            Assign Task
          </button>
        </div>
      ) : (
        <div className="admin-table-card">
          <div className="table-wrapper">
            <table className="task-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((task) => (
                  <tr key={task._id}>
                    <td className="task-title">{task.title}</td>
                    <td>
                      {task.assignedTo ? (
                        <div className="assigned-user">
                          <span className="assignee-avatar-sm">{task.assignedTo.name?.charAt(0)}</span>
                          <strong>{task.assignedTo.name}</strong>
                        </div>
                      ) : "—"}
                    </td>
                    <td>
                      <span className={`status-badge ${task.status?.toLowerCase().replace(" ", "-")}`}>
                        {task.status}
                      </span>
                    </td>
                    <td>{new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
