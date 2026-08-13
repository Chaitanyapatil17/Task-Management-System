import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { getCalendarTasks } from "../services/taskApi";

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export default function CalendarView() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [viewMode, setViewMode] = useState("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [users, setUsers] = useState([]);
  const [userFilter, setUserFilter] = useState("");

  useEffect(() => {
    API.get("/auth/users")
      .then((r) => setUsers(r.data.data.filter((u) => u.role === "user")))
      .catch(console.error);
  }, []);

  const fetchCalendar = async () => {
    try {
      let start, end;
      if (viewMode === "week") {
        const weekStart = startOfWeek(currentDate);
        start = addDays(weekStart, -1);
        end = addDays(weekStart, 7);
      } else {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        start = new Date(year, month, 1);
        end = new Date(year, month + 1, 0);
      }
      const res = await getCalendarTasks(
        start.toISOString().slice(0, 10),
        end.toISOString().slice(0, 10),
        userFilter || undefined
      );
      setTasks(res.data.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to load calendar");
    }
  };

  useEffect(() => { fetchCalendar(); }, [viewMode, currentDate, userFilter]);

  const days = useMemo(() => {
    if (viewMode === "week") {
      const weekStart = startOfWeek(currentDate);
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    }
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = first.getDay() || 7;
    const days = [];
    for (let i = 1 - startDay; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [viewMode, currentDate]);

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      const key = new Date(t.dueDate).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tasks]);

  const goPrev = () => {
    if (viewMode === "week") {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
  };

  const goNext = () => {
    if (viewMode === "week") {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };

  const goToday = () => setCurrentDate(new Date());

  const todayStr = new Date().toDateString();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Calendar</h1>
          <p>View tasks by due date</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select
            className="filter-select"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            style={{ minWidth: 160 }}
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>{u.name}</option>
            ))}
          </select>

          <div style={{ display: "flex", background: "var(--gray-100)", borderRadius: "var(--radius)", padding: 3 }}>
            <button
              onClick={() => setViewMode("week")}
              style={{
                padding: "6px 14px",
                border: "none",
                borderRadius: "var(--radius-sm)",
                background: viewMode === "week" ? "#fff" : "transparent",
                color: viewMode === "week" ? "var(--primary-dark)" : "var(--gray-500)",
                fontWeight: viewMode === "week" ? 700 : 500,
                cursor: "pointer",
                fontSize: 13,
                boxShadow: viewMode === "week" ? "var(--shadow-sm)" : "none",
              }}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode("month")}
              style={{
                padding: "6px 14px",
                border: "none",
                borderRadius: "var(--radius-sm)",
                background: viewMode === "month" ? "#fff" : "transparent",
                color: viewMode === "month" ? "var(--primary-dark)" : "var(--gray-500)",
                fontWeight: viewMode === "month" ? 700 : 500,
                cursor: "pointer",
                fontSize: 13,
                boxShadow: viewMode === "month" ? "var(--shadow-sm)" : "none",
              }}
            >
              Month
            </button>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button className="cancel-button" onClick={goPrev} style={{ padding: "6px 12px" }}>‹</button>
            <button className="cancel-button" onClick={goToday} style={{ padding: "6px 12px", fontSize: 12 }}>Today</button>
            <button className="cancel-button" onClick={goNext} style={{ padding: "6px 12px" }}>›</button>
          </div>
        </div>
      </div>

      <div style={{
        background: "#fff",
        border: "1px solid var(--gray-200)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: viewMode === "week" ? "repeat(7, 1fr)" : "repeat(7, 1fr)",
        }}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
            <div key={i} style={{
              padding: "10px 12px",
              borderBottom: "1px solid var(--gray-200)",
              borderRight: i < 6 ? "1px solid var(--gray-200)" : "none",
              background: "var(--gray-50)",
              textAlign: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--gray-500)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}>
              {d}
            </div>
          ))}
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: viewMode === "week" ? "repeat(7, 1fr)" : "repeat(7, 1fr)",
          minHeight: 500,
        }}>
          {days.map((day, i) => {
            const key = day.toDateString();
            const isToday = key === todayStr;
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const dayTasks = tasksByDate[key] || [];

            return (
              <div
                key={i}
                style={{
                  minHeight: 100,
                  borderRight: i % 7 !== 6 ? "1px solid var(--gray-200)" : "none",
                  borderBottom: "1px solid var(--gray-200)",
                  padding: 8,
                  background: isToday ? "var(--primary-light)" : isCurrentMonth ? "#fff" : "var(--gray-50)",
                  position: "relative",
                }}
              >
                <div style={{
                  fontSize: 12,
                  fontWeight: isToday ? 700 : 500,
                  color: isToday ? "var(--primary-dark)" : isCurrentMonth ? "var(--gray-700)" : "var(--gray-400)",
                  marginBottom: 6,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span>{day.getDate()}</span>
                  {isToday && <span style={{ fontSize: 10, background: "var(--primary)", color: "#fff", padding: "1px 6px", borderRadius: "10px" }}>Today</span>}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {dayTasks.map((task) => (
                    <div
                      key={task._id}
                      onClick={() => navigate(`/admin/tasks/${task._id}/detail`)}
                      style={{
                        padding: "5px 8px",
                        borderRadius: "var(--radius-sm)",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        background: task.status === "Done" ? "var(--success-light)" : task.status === "In Progress" ? "#dbeafe" : "var(--warning-light)",
                        color: task.status === "Done" ? "#065f46" : task.status === "In Progress" ? "#1e40af" : "#92400e",
                        borderLeft: `3px solid ${task.status === "Done" ? "var(--success)" : task.status === "In Progress" ? "#3b82f6" : "var(--warning)"}`,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        transition: "all .15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateX(2px)";
                        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateX(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      {task.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
