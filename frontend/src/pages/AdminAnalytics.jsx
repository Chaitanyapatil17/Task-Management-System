import { useEffect, useState } from "react";
import API from "../services/taskApi";

/* ─── helpers ─────────────────────────────────────────────── */
const fmtDate = (d) => {
  if (!d) return "";
  const [, m, day] = d.split("-");
  const M = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${M[+m]} ${+day}`;
};

const STATUS_COLORS = {
  Pending:      "#fbbf24",
  "In Progress":"#38bdf8",
  Done:         "#34d399",
};

/* ─── SVG Donut Chart ─────────────────────────────────────── */
function DonutChart({ data, size = 200 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <p className="analytics-empty">No tasks yet.</p>;

  const cx = size / 2, cy = size / 2, r = size * 0.38, stroke = size * 0.18;
  let offset = 0;
  const circumference = 2 * Math.PI * r;

  const slices = data.map((d) => {
    const pct   = d.value / total;
    const dash  = pct * circumference;
    const gap   = circumference - dash;
    const slice = { ...d, pct, dash, gap, offset };
    offset += pct * circumference;
    return slice;
  });

  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s) => (
          <circle
            key={s.name}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={STATUS_COLORS[s.name] || "rgba(255, 255, 255, 0.15)"}
            strokeWidth={stroke}
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={-s.offset + circumference / 4}
            style={{ transition: "stroke-dasharray .5s ease" }}
          />
        ))}
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize="26" fontWeight="800" fill="#ffffff">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="12" fill="rgba(255, 255, 255, 0.6)">Total</text>
      </svg>

      <div className="donut-legend">
        {slices.map((s) => (
          <div className="donut-legend-item" key={s.name}>
            <span className="donut-legend-dot" style={{ background: STATUS_COLORS[s.name] || "#e5e7eb" }} />
            <span className="donut-legend-label">{s.name}</span>
            <span className="donut-legend-value">{s.value}</span>
            <span className="donut-legend-pct">{Math.round(s.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── CSS Bar Chart ───────────────────────────────────────── */
function BarChart({ data, valueKey = "count", labelKey = "_id", color = "#21F1A8", label = "" }) {
  if (!data || data.length === 0) return <p className="analytics-empty">No data for this period.</p>;
  const max = Math.max(...data.map((d) => d[valueKey] || 0), 1);

  return (
    <div className="bar-chart">
      {data.map((d, i) => {
        const val = d[valueKey] || 0;
        const pct = Math.round((val / max) * 100);
        return (
          <div className="bar-row" key={i}>
            <span className="bar-label">{d[labelKey] ? fmtDate(d[labelKey]) || d[labelKey] : "—"}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="bar-value">{val}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Horizontal stacked bar per user ────────────────────── */
function UserBars({ users }) {
  if (!users || users.length === 0) return <p className="analytics-empty">No user data found.</p>;
  const maxTotal = Math.max(...users.map((u) => u.total), 1);

  return (
    <div className="user-bars">
      {users.map((u, i) => (
        <div className="user-bar-row" key={i}>
          <div className="user-bar-meta">
            <span className="user-bar-avatar">{u.name?.charAt(0)}</span>
            <span className="user-bar-name">{u.name}</span>
            <span className="user-bar-total">{u.total}</span>
          </div>
          <div className="user-bar-track">
            {u.pending    > 0 && <div className="user-bar-seg" style={{ width: `${(u.pending    / maxTotal) * 100}%`, background: "#f59e0b" }} title={`Pending: ${u.pending}`}    />}
            {u.inProgress > 0 && <div className="user-bar-seg" style={{ width: `${(u.inProgress / maxTotal) * 100}%`, background: "#3b82f6" }} title={`In Progress: ${u.inProgress}`} />}
            {u.done       > 0 && <div className="user-bar-seg" style={{ width: `${(u.done       / maxTotal) * 100}%`, background: "#21F1A8" }} title={`Done: ${u.done}`}           />}
          </div>
          <span className="user-bar-rate">{u.total > 0 ? Math.round((u.done / u.total) * 100) : 0}%</span>
        </div>
      ))}
      <div className="user-bar-legend">
        <span><span className="ubl-dot" style={{background:"#f59e0b"}} /> Pending</span>
        <span><span className="ubl-dot" style={{background:"#3b82f6"}} /> In Progress</span>
        <span><span className="ubl-dot" style={{background:"#21F1A8"}} /> Done</span>
      </div>
    </div>
  );
}

/* ─── Card wrapper ────────────────────────────────────────── */
function Card({ title, subtitle, children }) {
  return (
    <div className="analytics-card">
      <div className="analytics-card-header">
        <h3 className="analytics-card-title">{title}</h3>
        {subtitle && <p className="analytics-card-sub">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────── */
export default function AdminAnalytics() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    API.get("/tasks/analytics")
      .then((r) => {
        if (r.data && r.data.data) {
          setData(r.data.data);
        } else {
          setError("Unexpected response format from server.");
        }
        setLoading(false);
      })
      .catch((e) => {
        const msg = e.response?.data?.message || e.message || "Failed to load analytics";
        setError(`${e.response?.status ? `[${e.response.status}] ` : ""}${msg}`);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="page">
      <div className="page-header"><div><h1>Analytics</h1><p>Loading charts…</p></div></div>
      <div className="analytics-loading"><div className="at-spinner" /><p>Fetching data from server…</p></div>
    </div>
  );

  if (error) return (
    <div className="page">
      <div className="page-header"><div><h1>Analytics</h1></div></div>
      <div className="empty-state">
        <div className="empty-icon">⚠️</div>
        <h3>Could not load analytics</h3>
        <p>{error}</p>
        <button className="primary-button" style={{ marginTop: 20 }} onClick={() => { setError(""); setLoading(true); API.get("/tasks/analytics").then((r) => { setData(r.data.data); setLoading(false); }).catch((e) => { setError(e.message); setLoading(false); }); }}>
          Retry
        </button>
      </div>
    </div>
  );

  const { totals, statusBreakdown, tasksPerDay, tasksPerUser, completionPerDay } = data;

  const kpis = [
    { label: "Total Tasks",     value: totals.total,          icon: "📋", accent: "#21F1A8" },
    { label: "Pending",         value: totals.pending,        icon: "⏳", accent: "#f59e0b" },
    { label: "In Progress",     value: totals.inProgress,     icon: "🔄", accent: "#3b82f6" },
    { label: "Completed",       value: totals.done,           icon: "✅", accent: "#21F1A8" },
    { label: "Completion Rate", value: `${totals.completionRate}%`, icon: "🎯", accent: "#21F1A8" },
  ];

  return (
    <div className="page">

      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p>Visual overview of all task statistics</p>
        </div>
        <span className="task-count">Live data</span>
      </div>

      {/* KPI row */}
      <div className="analytics-kpi-row">
        {kpis.map(({ label, value, icon, accent }) => (
          <div className="analytics-kpi" key={label} style={{ borderTop: `3px solid ${accent}` }}>
            <span className="analytics-kpi-icon">{icon}</span>
            <span className="analytics-kpi-value">{value}</span>
            <span className="analytics-kpi-label">{label}</span>
          </div>
        ))}
      </div>

      {/* Row 1: Donut + User bars */}
      <div className="analytics-row-2">
        <Card title="Task Status Breakdown" subtitle="Distribution of all tasks by status">
          <DonutChart data={statusBreakdown} size={220} />
        </Card>

        <Card title="Tasks per User" subtitle="Stacked breakdown by status per team member">
          <UserBars users={tasksPerUser} />
        </Card>
      </div>

      {/* Row 2: Tasks created per day */}
      <Card title="Tasks Created (Last 30 Days)" subtitle="Number of new tasks created each day">
        <BarChart data={tasksPerDay} valueKey="count" labelKey="_id" color="#3b82f6" />
      </Card>

      {/* Row 3: Tasks completed per day */}
      <Card title="Tasks Completed (Last 30 Days)" subtitle="Number of tasks marked as Done each day">
        <BarChart data={completionPerDay} valueKey="count" labelKey="_id" color="#21F1A8" />
      </Card>

      {/* Row 4: User performance table */}
      <Card title="User Performance Summary" subtitle="Detailed task counts per team member">
        {tasksPerUser.length === 0 ? (
          <p className="analytics-empty">No user data found.</p>
        ) : (
          <div className="table-wrapper">
            <table className="task-table">
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>Email</th>
                  <th>Total</th><th>Pending</th><th>In Progress</th><th>Completed</th><th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {tasksPerUser.map((u, i) => {
                  const rate = u.total > 0 ? Math.round((u.done / u.total) * 100) : 0;
                  return (
                    <tr key={u.email || i}>
                      <td className="row-num">{i + 1}</td>
                      <td>
                        <div className="assigned-user">
                          <span className="assignee-avatar-sm">{u.name?.charAt(0)}</span>
                          <span className="task-title">{u.name}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: "#9ca3af" }}>{u.email}</td>
                      <td><strong>{u.total}</strong></td>
                      <td><span className="status-badge pending">{u.pending}</span></td>
                      <td><span className="status-badge in-progress">{u.inProgress}</span></td>
                      <td><span className="status-badge done">{u.done}</span></td>
                      <td>
                        <div className="analytics-rate-bar">
                          <div className="analytics-rate-fill" style={{ width: `${rate}%` }} />
                          <span className="analytics-rate-text">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

    </div>
  );
}
