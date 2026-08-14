import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import API from "../services/taskApi";

/* ── SVG Icons ───────────────────────────────────────────── */
const Icon = {
  tasks: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  pending: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  inProgress: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  completed: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  users: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  refresh: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  ),
  calendar: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  arrowRight: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
};

function AdminDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, done: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  const fetchAdminData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const res = await API.get("/tasks?limit=5&page=1");
      setRecent(res.data.data || []);
      if (res.data.stats) setStats(res.data.stats);
    } catch (err) {
      console.error("Error fetching admin dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const { total, pending, inProgress, done } = stats;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  const statusPieData = [
    { name: "Completed", value: done, color: "#10b981" },
    { name: "In Progress", value: inProgress, color: "#f59e0b" },
    { name: "Pending", value: pending, color: "#0891b2" },
  ].filter((d) => d.value > 0);

  const statusBarData = [
    { name: "Total", count: total, color: "#059669" },
    { name: "Pending", count: pending, color: "#0891b2" },
    { name: "In Progress", count: inProgress, color: "#f59e0b" },
    { name: "Completed", count: done, color: "#10b981" },
  ];

  if (loading) {
    return (
      <div className="page user-dashboard-container">
        <div className="dashboard-hero-skeleton" />
        <div className="dashboard-kpi-grid">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="kpi-card-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page user-dashboard-container">
      {/* ── ADMIN DYNAMIC HERO BANNER ── */}
      <div className="user-dashboard-hero">
        <div className="hero-left">
          <div className="hero-date-badge">
            {Icon.calendar}
            <span>{todayFormatted}</span>
          </div>
          <h1 className="hero-greeting">
            {greeting}, <span className="user-name-highlight">{user.name || "Admin"}</span>! 👋
          </h1>
          <p className="hero-subtitle">
            System Performance Overview: <strong>{done}</strong> of <strong>{total}</strong> total system tasks completed across all users.
          </p>
        </div>

        <div className="hero-right">
          {/* Progress Ring Card */}
          <div className="hero-progress-pill">
            <div className="progress-pill-circle">
              <svg viewBox="0 0 36 36" className="circular-chart">
                <path
                  className="circle-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="circle"
                  strokeDasharray={`${completionRate}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="circle-percentage">{completionRate}%</span>
            </div>
            <div className="progress-pill-label">
              <span className="pill-title">System Health</span>
              <span className="pill-status">
                {completionRate >= 75 ? "🚀 High Completion" : "⚡ Operational"}
              </span>
            </div>
          </div>

          <div className="hero-actions">
            <button className="btn-hero-primary" onClick={() => navigate("/admin/create-task")}>
              {Icon.plus} Assign Task
            </button>
            <button className="btn-hero-secondary" onClick={() => navigate("/admin/create-user")}>
              {Icon.users} Add User
            </button>
            <button
              className={`btn-hero-icon ${refreshing ? "spinning" : ""}`}
              onClick={() => fetchAdminData(true)}
              title="Refresh System Data"
            >
              {Icon.refresh}
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI METRICS GRID ── */}
      <div className="dashboard-kpi-grid">
        {/* Total Tasks Card */}
        <div className="user-kpi-card total">
          <div className="kpi-icon-container total">
            {Icon.tasks}
          </div>
          <div className="kpi-details">
            <span className="kpi-label">System Tasks</span>
            <div className="kpi-value-row">
              <span className="kpi-value">{total}</span>
              <span className="kpi-tag total">All System</span>
            </div>
          </div>
        </div>

        {/* Pending Card */}
        <div className="user-kpi-card pending">
          <div className="kpi-icon-container pending">
            {Icon.pending}
          </div>
          <div className="kpi-details">
            <span className="kpi-label">Pending</span>
            <div className="kpi-value-row">
              <span className="kpi-value">{pending}</span>
              <span className="kpi-tag pending">Awaiting action</span>
            </div>
          </div>
        </div>

        {/* In Progress Card */}
        <div className="user-kpi-card in-progress">
          <div className="kpi-icon-container in-progress">
            {Icon.inProgress}
          </div>
          <div className="kpi-details">
            <span className="kpi-label">In Progress</span>
            <div className="kpi-value-row">
              <span className="kpi-value">{inProgress}</span>
              <span className="kpi-tag in-progress">Active work</span>
            </div>
          </div>
        </div>

        {/* Completed Card */}
        <div className="user-kpi-card completed">
          <div className="kpi-icon-container completed">
            {Icon.completed}
          </div>
          <div className="kpi-details">
            <span className="kpi-label">Completed</span>
            <div className="kpi-value-row">
              <span className="kpi-value">{done}</span>
              <span className="kpi-tag completed">{completionRate}% rate</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── VISUAL CHARTS SECTION ── */}
      <div className="dashboard-charts-grid">
        {/* Status Distribution Donut Chart */}
        <div className="dashboard-chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">System Status Overview</h3>
              <p className="chart-subtitle">Distribution of all tasks across the platform</p>
            </div>
            <span className="chart-badge">Live Aggregation</span>
          </div>

          <div className="chart-body donut-chart-container" style={{ width: "100%", height: 230, minHeight: 230, position: "relative" }}>
            {statusPieData.length === 0 ? (
              <div className="chart-empty-state">
                <p>No task data available</p>
              </div>
            ) : (
              <div style={{ width: "100%", height: 230, position: "relative" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card-bg, #ffffff)",
                        borderColor: "var(--gray-200, #e2e8f0)",
                        color: "var(--gray-800, #1e293b)",
                        borderRadius: "8px",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value) => <span className="chart-legend-label">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* System Workload Bar Chart */}
        <div className="dashboard-chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Task Breakdown Metrics</h3>
              <p className="chart-subtitle">Volume per lifecycle stage</p>
            </div>
            <span className="chart-badge indigo">System Metrics</span>
          </div>

          <div className="chart-body bar-chart-container" style={{ width: "100%", height: 230, minHeight: 230, position: "relative" }}>
            <div style={{ width: "100%", height: 230, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusBarData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="var(--gray-400)" fontSize={12} tickLine={false} />
                  <YAxis allowDecimals={false} stroke="var(--gray-400)" fontSize={12} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(5, 150, 105, 0.08)" }}
                    contentStyle={{
                      backgroundColor: "var(--card-bg, #ffffff)",
                      borderColor: "var(--gray-200, #e2e8f0)",
                      color: "var(--gray-800, #1e293b)",
                      borderRadius: "8px",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {statusBarData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ── RECENT TASKS TABLE ── */}
      <div className="user-workspace-section">
        <div className="workspace-header">
          <div className="workspace-title-block">
            <h2 className="workspace-title">Recently Assigned Tasks</h2>
            <span className="workspace-count-badge">{recent.length} recent</span>
          </div>
          <button className="btn-indigo-secondary" onClick={() => navigate("/admin/tasks")}>
            View All System Tasks {Icon.arrowRight}
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="user-empty-workspace">
            <div className="empty-workspace-icon">📋</div>
            <h3>No recent tasks</h3>
            <p>Assign your first system task to get started.</p>
            <button className="btn-indigo-primary" onClick={() => navigate("/admin/create-task")}>
              {Icon.plus} Assign Task Now
            </button>
          </div>
        ) : (
          <div className="admin-table-card">
            <div className="table-wrapper">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Task Title</th>
                    <th>Assigned User</th>
                    <th>Status</th>
                    <th>Created Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((task) => (
                    <tr key={task._id}>
                      <td className="task-title">
                        <strong>{task.title}</strong>
                      </td>
                      <td>
                        {task.assignedTo ? (
                          <div className="assigned-user">
                            <span className="assignee-avatar-sm">
                              {task.assignedTo.name?.charAt(0).toUpperCase()}
                            </span>
                            <span>{task.assignedTo.name}</span>
                          </div>
                        ) : (
                          <span className="unassigned-text">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`task-status-pill ${task.status?.toLowerCase().replace(" ", "-")}`}>
                          {task.status}
                        </span>
                      </td>
                      <td>
                        {new Date(task.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td>
                        <a href={`/admin/tasks/${task._id}/detail`} className="task-detail-action-link">
                          View {Icon.arrowRight}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
