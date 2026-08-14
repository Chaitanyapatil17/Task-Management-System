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
  overdue: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  chart: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  arrowRight: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
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
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
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
  alertCircle: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  checkCircle: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
};

function UserDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [stats, setStats] = useState(null);
  const [allTasks, setAllTasks] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  // Time-of-day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  // Today's formatted date string
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  useEffect(() => {
    fetchDashboardData();

    const handleRealtimeUpdate = () => {
      fetchDashboardData(true);
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
  }, []);

  const fetchDashboardData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      // Fetch dashboard stats & all user assigned tasks concurrently
      const [statsRes, tasksRes] = await Promise.all([
        API.get("/tasks/dashboard/stats"),
        API.get("/tasks"),
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.data.stats);
        setRecentTasks(statsRes.data.data.recentTasks || []);
      }

      if (tasksRes.data.success) {
        setAllTasks(tasksRes.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(err.response?.data?.message || "Failed to load dashboard statistics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Quick Status Updater for tasks on dashboard
  const handleStatusChange = async (taskId, currentTask, newStatus) => {
    if (currentTask.status === newStatus) return;
    try {
      setUpdatingTaskId(taskId);
      setActionError(null);

      await API.put(`/tasks/${taskId}`, {
        title: currentTask.title,
        description: currentTask.description || "",
        status: newStatus,
        priority: currentTask.priority || "Medium",
        dueDate: currentTask.dueDate || "",
      });

      // Refresh data after status change
      await fetchDashboardData(true);
    } catch (err) {
      console.error("Error updating task status:", err);
      const errMsg = err.response?.data?.message || "Failed to update task status";
      setActionError(errMsg);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Priority breakdown for chart
  const priorityChartData = useMemo(() => {
    const counts = { High: 0, Medium: 0, Low: 0 };
    allTasks.forEach((t) => {
      const p = t.priority || "Medium";
      if (counts[p] !== undefined) counts[p]++;
      else counts.Medium++;
    });
    return [
      { name: "High", count: counts.High, color: "#f87171" },
      { name: "Medium", count: counts.Medium, color: "#38bdf8" },
      { name: "Low", count: counts.Low, color: "#34d399" },
    ];
  }, [allTasks]);

  // Task Status distribution data for pie chart
  const statusPieData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Completed", value: stats.completed || 0, color: "#34d399" },
      { name: "In Progress", value: stats.inProgress || 0, color: "#06b6d4" },
      { name: "Pending", value: stats.pending || 0, color: "#fbbf24" },
    ].filter((item) => item.value > 0);
  }, [stats]);

  // Filter tasks based on activeTab & searchQuery
  const filteredTasks = useMemo(() => {
    const now = new Date();
    return allTasks.filter((task) => {
      // Search filter
      const matchesSearch =
        task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Tab filter
      if (activeTab === "high") return task.priority === "High";
      if (activeTab === "pending") return task.status === "Pending";
      if (activeTab === "in-progress") return task.status === "In Progress";
      if (activeTab === "completed") return task.status === "Done";
      if (activeTab === "due-soon") {
        if (!task.dueDate || task.status === "Done") return false;
        const due = new Date(task.dueDate);
        const diffDays = (due - now) / (1000 * 60 * 60 * 24);
        return diffDays <= 3; // Overdue or due within 3 days
      }

      return true;
    });
  }, [allTasks, activeTab, searchQuery]);

  // Helper for due date status badge
  const getDueDateInfo = (dueDateStr, status) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dueDay = new Date(due);
    dueDay.setHours(0, 0, 0, 0);

    const diffDays = Math.round((dueDay - now) / (1000 * 60 * 60 * 24));

    if (status === "Done") {
      return { text: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }), type: "done" };
    }
    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)}d`, type: "overdue" };
    }
    if (diffDays === 0) {
      return { text: "Due Today", type: "urgent" };
    }
    if (diffDays === 1) {
      return { text: "Due Tomorrow", type: "soon" };
    }
    if (diffDays <= 3) {
      return { text: `Due in ${diffDays}d`, type: "soon" };
    }
    return { text: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }), type: "normal" };
  };

  /* ── Skeleton Loading ──────────────────────────────────── */
  if (loading) {
    return (
      <div className="page user-dashboard-container">
        <div className="dashboard-hero-skeleton">
          <div className="skeleton-line title" />
          <div className="skeleton-line subtitle" />
        </div>
        <div className="dashboard-kpi-grid">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="kpi-card-skeleton" />
          ))}
        </div>
        <div className="dashboard-charts-grid">
          <div className="chart-card-skeleton" />
          <div className="chart-card-skeleton" />
        </div>
      </div>
    );
  }

  /* ── Error State ───────────────────────────────────────── */
  if (error) {
    return (
      <div className="page user-dashboard-container">
        <div className="dashboard-error-card">
          <div className="error-icon-wrapper">{Icon.alertCircle}</div>
          <h2>Unable to load dashboard</h2>
          <p>{error}</p>
          <button className="btn-indigo-primary" onClick={() => fetchDashboardData()}>
            {Icon.refresh} Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const completionRate = stats?.completionRate || 0;

  return (
    <div className="page user-dashboard-container">
      {/* Action error toast alert */}
      {actionError && (
        <div className="dashboard-alert-banner warning">
          <div className="alert-content">
            {Icon.alertCircle}
            <span>{actionError}</span>
          </div>
          <button className="alert-close-btn" onClick={() => setActionError(null)}>×</button>
        </div>
      )}

      {/* ── HERO WELCOME BANNER (Modern Indigo Palette) ── */}
      <div className="user-dashboard-hero">
        <div className="hero-left">
          <div className="hero-date-badge">
            {Icon.calendar}
            <span>{todayFormatted}</span>
          </div>
          <h1 className="hero-greeting">
            {greeting}, <span className="user-name-highlight">{user.name || "User"}</span>! 👋
          </h1>
          <p className="hero-subtitle">
            Here is your real-time productivity overview. You have completed{" "}
            <strong>{stats?.completed || 0}</strong> out of <strong>{stats?.total || 0}</strong> assigned tasks.
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
              <span className="pill-title">Completion Goal</span>
              <span className="pill-status">
                {completionRate >= 80 ? "🚀 Outstanding work!" : completionRate >= 50 ? "⚡ Great progress" : "🎯 Keep pushing"}
              </span>
            </div>
          </div>

          <div className="hero-actions">
            <button className="btn-hero-primary" onClick={() => navigate("/create-task")}>
              {Icon.plus} Create Task
            </button>
            <button className="btn-hero-secondary" onClick={() => navigate("/tasks")}>
              View All Tasks
            </button>
            <button
              className={`btn-hero-icon ${refreshing ? "spinning" : ""}`}
              onClick={() => fetchDashboardData(true)}
              title="Refresh Dashboard"
            >
              {Icon.refresh}
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI METRICS GRID (Indigo & Emerald Palette) ── */}
      <div className="dashboard-kpi-grid">
        {/* Total Tasks Card */}
        <div className="user-kpi-card total">
          <div className="kpi-icon-container total">
            {Icon.tasks}
          </div>
          <div className="kpi-details">
            <span className="kpi-label">Total Assigned</span>
            <div className="kpi-value-row">
              <span className="kpi-value">{stats?.total || 0}</span>
              <span className="kpi-tag total">Active pool</span>
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
              <span className="kpi-value">{stats?.inProgress || 0}</span>
              <span className="kpi-tag in-progress">Active work</span>
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
              <span className="kpi-value">{stats?.pending || 0}</span>
              <span className="kpi-tag pending">Queued</span>
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
              <span className="kpi-value">{stats?.completed || 0}</span>
              <span className="kpi-tag completed">Achieved</span>
            </div>
          </div>
        </div>

        {/* Overdue Card */}
        <div className={`user-kpi-card overdue ${stats?.overdue > 0 ? "has-overdue" : ""}`}>
          <div className="kpi-icon-container overdue">
            {Icon.overdue}
          </div>
          <div className="kpi-details">
            <span className="kpi-label">Overdue</span>
            <div className="kpi-value-row">
              <span className="kpi-value">{stats?.overdue || 0}</span>
              <span className={`kpi-tag overdue ${stats?.overdue > 0 ? "urgent" : ""}`}>
                {stats?.overdue > 0 ? "Requires Action" : "All Clear"}
              </span>
            </div>
          </div>
        </div>

        {/* Completion Rate Card */}
        <div className="user-kpi-card rate">
          <div className="kpi-icon-container rate">
            {Icon.chart}
          </div>
          <div className="kpi-details">
            <span className="kpi-label">Success Rate</span>
            <div className="kpi-value-row">
              <span className="kpi-value">{completionRate}%</span>
              <div className="mini-progress-bar">
                <div className="mini-bar-fill" style={{ width: `${completionRate}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── VISUAL ANALYTICS SECTION (Recharts Charts) ── */}
      <div className="dashboard-charts-grid">
        {/* Status Distribution Donut Chart */}
        <div className="dashboard-chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Status Breakdown</h3>
              <p className="chart-subtitle">Distribution of assigned task statuses</p>
            </div>
            <span className="chart-badge">Real-time</span>
          </div>

          <div className="chart-body donut-chart-container" style={{ width: "100%", height: 230, minHeight: 230, position: "relative" }}>
            {statusPieData.length === 0 ? (
              <div className="chart-empty-state">
                <p>No task statistics to visualize yet</p>
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
                      itemStyle={{ color: "#0891b2" }}
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

        {/* Priority Breakdown Bar Chart */}
        <div className="dashboard-chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Workload Priority</h3>
              <p className="chart-subtitle">Task breakdown by priority level</p>
            </div>
            <span className="chart-badge indigo">Workload</span>
          </div>

          <div className="chart-body bar-chart-container" style={{ width: "100%", height: 230, minHeight: 230, position: "relative" }}>
            <div style={{ width: "100%", height: 230, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityChartData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="var(--gray-400)" fontSize={12} tickLine={false} />
                  <YAxis allowDecimals={false} stroke="var(--gray-400)" fontSize={12} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(6, 182, 212, 0.08)" }}
                    contentStyle={{
                      backgroundColor: "var(--card-bg, #ffffff)",
                      borderColor: "var(--gray-200, #e2e8f0)",
                      color: "var(--gray-800, #1e293b)",
                      borderRadius: "8px",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                    itemStyle={{ color: "#0891b2" }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {priorityChartData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ── TASK PRODUCTIVITY CENTER / WORKSPACE ── */}
      <div className="user-workspace-section">
        {/* Workspace Toolbar & Filter Tabs */}
        <div className="workspace-header">
          <div className="workspace-title-block">
            <h2 className="workspace-title">My Tasks Workspace</h2>
            <span className="workspace-count-badge">{filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Search Field */}
          <div className="workspace-search-box">
            {Icon.search}
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="workspace-search-input"
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={() => setSearchQuery("")}>×</button>
            )}
          </div>
        </div>

        {/* Tab Selector */}
        <div className="workspace-tabs-bar">
          <button
            className={`workspace-tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All Tasks ({allTasks.length})
          </button>
          <button
            className={`workspace-tab ${activeTab === "high" ? "active" : ""}`}
            onClick={() => setActiveTab("high")}
          >
            🔥 High Priority ({allTasks.filter((t) => t.priority === "High").length})
          </button>
          <button
            className={`workspace-tab ${activeTab === "due-soon" ? "active" : ""}`}
            onClick={() => setActiveTab("due-soon")}
          >
            ⏳ Due Soon / Overdue
          </button>
          <button
            className={`workspace-tab ${activeTab === "in-progress" ? "active" : ""}`}
            onClick={() => setActiveTab("in-progress")}
          >
            ⚡ In Progress ({allTasks.filter((t) => t.status === "In Progress").length})
          </button>
          <button
            className={`workspace-tab ${activeTab === "completed" ? "active" : ""}`}
            onClick={() => setActiveTab("completed")}
          >
            ✅ Completed ({allTasks.filter((t) => t.status === "Done").length})
          </button>
        </div>

        {/* Task Grid */}
        {filteredTasks.length === 0 ? (
          <div className="user-empty-workspace">
            <div className="empty-workspace-icon">{Icon.checkCircle}</div>
            <h3>No tasks found</h3>
            <p>
              {searchQuery
                ? `No tasks matching "${searchQuery}"`
                : activeTab !== "all"
                ? "No tasks match the selected filter category."
                : "You don't have any assigned tasks right now."}
            </p>
            {activeTab !== "all" || searchQuery ? (
              <button className="btn-indigo-secondary" onClick={() => { setActiveTab("all"); setSearchQuery(""); }}>
                Reset Filters
              </button>
            ) : (
              <button className="btn-indigo-primary" onClick={() => navigate("/create-task")}>
                {Icon.plus} Create Your First Task
              </button>
            )}
          </div>
        ) : (
          <div className="user-task-card-grid">
            {filteredTasks.map((task) => {
              const dueInfo = getDueDateInfo(task.dueDate, task.status);
              const isUpdating = updatingTaskId === task._id;

              return (
                <div key={task._id} className={`user-dashboard-task-card ${task.status === "Done" ? "completed-card" : ""}`}>
                  <div className="task-card-header">
                    <div className="task-card-tags">
                      <span className={`task-status-pill ${task.status?.toLowerCase().replace(" ", "-")}`}>
                        {task.status}
                      </span>
                      {task.priority && (
                        <span className={`task-priority-pill ${task.priority?.toLowerCase()}`}>
                          {task.priority === "High" ? "🔥 High" : task.priority === "Medium" ? "⚡ Medium" : "🌱 Low"}
                        </span>
                      )}
                    </div>
                    {dueInfo && (
                      <span className={`task-due-badge ${dueInfo.type}`}>
                        {dueInfo.text}
                      </span>
                    )}
                  </div>

                  <h3 className="task-card-title">{task.title}</h3>
                  {task.description && (
                    <p className="task-card-description">
                      {task.description.length > 100 ? `${task.description.substring(0, 100)}...` : task.description}
                    </p>
                  )}

                  <div className="task-card-footer">
                    {/* Inline Status Control Dropdown / Selector */}
                    <div className="quick-status-selector">
                      <label className="selector-label">Status:</label>
                      <select
                        className="status-select-dropdown"
                        value={task.status}
                        disabled={isUpdating}
                        onChange={(e) => handleStatusChange(task._id, task, e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Completed</option>
                      </select>
                    </div>

                    <a
                      href={`/tasks/${task._id}/detail`}
                      className="task-detail-action-link"
                      title="View Details"
                    >
                      Details {Icon.arrowRight}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default UserDashboard;
