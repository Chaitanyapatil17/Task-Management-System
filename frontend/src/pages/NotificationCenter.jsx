import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/taskApi";
import { useSocket } from "../context/SocketContext";
import "./NotificationCenter.css";

function timeAgo(date) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getNotifIcon(type) {
  switch (type) {
    case "due_soon":
      return "⏰";
    case "overdue":
      return "🚨";
    case "mention":
      return "💬";
    case "task_assigned":
      return "📋";
    case "task_completed":
      return "✅";
    case "comment":
    case "comment_reply":
      return "💬";
    case "file_uploaded":
    case "file_version_uploaded":
      return "📎";
    case "task_status_changed":
      return "⚡";
    case "weekly_digest":
      return "📊";
    default:
      return "🔔";
  }
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const { connected } = useSocket();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "admin";

  const [notifications, setNotifications] = useState([]);
  const [groupedData, setGroupedData] = useState(null);
  const [counts, setCounts] = useState({
    all: 0,
    unread: 0,
    mentions: 0,
    deadlines: 0,
    assignments: 0,
    comments: 0,
    system: 0,
  });
  const [filter, setFilter] = useState("all");
  const [groupBy, setGroupBy] = useState("none");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Preferences Modal State
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    emailAssignments: true,
    emailMentions: true,
    emailDueSoon: true,
    emailOverdue: true,
    emailStatusChange: true,
    emailWeeklyDigest: true,
    inAppAssignments: true,
    inAppMentions: true,
    inAppDueSoon: true,
    inAppOverdue: true,
    inAppStatusChange: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [triggeringCheck, setTriggeringCheck] = useState(false);
  const [triggeringDigest, setTriggeringDigest] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.getNotificationList({
        filter,
        groupBy,
        search,
      });

      if (res.data?.success) {
        setNotifications(res.data.data || []);
        setGroupedData(res.data.grouped || null);
        if (res.data.counts) setCounts(res.data.counts);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, groupBy, search]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time synchronization
  useEffect(() => {
    const handleSocketNotif = () => {
      fetchNotifications();
    };

    window.addEventListener("socket:notification", handleSocketNotif);
    return () => window.removeEventListener("socket:notification", handleSocketNotif);
  }, [fetchNotifications]);

  // Load preferences
  const fetchPreferences = async () => {
    try {
      const res = await API.getNotificationPreferences();
      if (res.data?.success) {
        setPreferences(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch preferences:", err);
    }
  };

  const handleOpenPreferences = () => {
    fetchPreferences();
    setShowPreferences(true);
  };

  const handleSavePreferences = async () => {
    try {
      setSavingPrefs(true);
      await API.updateNotificationPreferences(preferences);
      setShowPreferences(false);
      alert("Notification preferences saved successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save preferences");
    } finally {
      setSavingPrefs(false);
    }
  };

  // Actions
  const handleMarkAllRead = async () => {
    try {
      await API.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setCounts((prev) => ({ ...prev, unread: 0 }));
      fetchNotifications();
    } catch (err) {
      alert("Failed to mark all as read");
    }
  };

  const handleMarkOneRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await API.markOneRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      setCounts((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleDeleteNotif = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await API.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      fetchNotifications();
    } catch (err) {
      alert("Failed to delete notification");
    }
  };

  const handleClearRead = async () => {
    if (!window.confirm("Clear all read notifications?")) return;
    try {
      await API.clearReadNotifications();
      fetchNotifications();
    } catch (err) {
      alert("Failed to clear read notifications");
    }
  };

  const handleTriggerReminders = async () => {
    try {
      setTriggeringCheck(true);
      const res = await API.triggerCheckReminders();
      alert(res.data?.message || "Reminder scan completed!");
      fetchNotifications();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to run reminder check");
    } finally {
      setTriggeringCheck(false);
    }
  };

  const handleTriggerDigest = async () => {
    try {
      setTriggeringDigest(true);
      const res = await API.triggerSendWeeklyDigest();
      alert(res.data?.message || "Weekly digest dispatched!");
      fetchNotifications();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to dispatch weekly digest");
    } finally {
      setTriggeringDigest(false);
    }
  };

  const handleItemClick = (n) => {
    if (!n.read) handleMarkOneRead(n._id);

    const taskId = n.task?._id || n.task;
    if (taskId) {
      navigate(isAdmin ? `/admin/tasks/${taskId}/detail` : `/tasks/${taskId}/detail`);
    }
  };

  const renderNotificationCard = (n) => (
    <div
      key={n._id}
      className={`nc-item ${!n.read ? "unread" : ""}`}
      onClick={() => handleItemClick(n)}
    >
      <div className={`nc-item-icon-box ${n.type}`}>
        {getNotifIcon(n.type)}
      </div>

      <div className="nc-item-body">
        <div className="nc-item-top">
          <span className={`nc-item-type-tag ${n.type}`}>{n.type.replace(/_/g, " ")}</span>
          <span className="nc-item-time">{timeAgo(n.createdAt)}</span>
        </div>

        <p className="nc-item-msg">{n.message}</p>

        {n.task?.title && (
          <div className="nc-item-task-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            Task: {n.task.title}
          </div>
        )}
      </div>

      <div className="nc-item-actions" onClick={(e) => e.stopPropagation()}>
        {!n.read && (
          <button
            className="btn-nc-action"
            title="Mark as read"
            onClick={(e) => handleMarkOneRead(n._id, e)}
          >
            ✓
          </button>
        )}
        <button
          className="btn-nc-action delete"
          title="Delete notification"
          onClick={(e) => handleDeleteNotif(n._id, e)}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="page nc-container">
      {/* ── Top Header ── */}
      <div className="nc-header">
        <div className="nc-header-title-row">
          <h1>
            <span>Notifications</span>
            {counts.unread > 0 && (
              <span className="nc-unread-badge-pill">{counts.unread} unread</span>
            )}
          </h1>

          <div className="nc-header-actions">
            {counts.unread > 0 && (
              <button className="btn-td-secondary" onClick={handleMarkAllRead}>
                ✓ Mark all as read
              </button>
            )}

            <button className="btn-td-secondary" onClick={handleClearRead} title="Clear read notifications">
              🗑️ Clear read
            </button>

            <button
              className="btn-td-secondary"
              onClick={handleTriggerReminders}
              disabled={triggeringCheck}
              title="Scan for due soon and overdue tasks right now"
            >
              {triggeringCheck ? "Scanning…" : "⏰ Check Reminders"}
            </button>

            {isAdmin && (
              <button
                className="btn-td-secondary"
                onClick={handleTriggerDigest}
                disabled={triggeringDigest}
                title="Dispatch weekly productivity digest to all users"
              >
                {triggeringDigest ? "Sending…" : "📊 Send Digest"}
              </button>
            )}

            <button className="primary-button" onClick={handleOpenPreferences}>
              ⚙️ Preferences
            </button>
          </div>
        </div>

        {/* ── Controls Bar: Tabs, Search & Grouping ── */}
        <div className="nc-controls-bar">
          {/* Category Tabs */}
          <div className="nc-tabs-list">
            <button
              className={`nc-tab-btn ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              All <span className="nc-tab-count">{counts.all}</span>
            </button>
            <button
              className={`nc-tab-btn ${filter === "unread" ? "active" : ""}`}
              onClick={() => setFilter("unread")}
            >
              Unread <span className="nc-tab-count">{counts.unread}</span>
            </button>
            <button
              className={`nc-tab-btn ${filter === "mentions" ? "active" : ""}`}
              onClick={() => setFilter("mentions")}
            >
              💬 Mentions <span className="nc-tab-count">{counts.mentions}</span>
            </button>
            <button
              className={`nc-tab-btn ${filter === "deadlines" ? "active" : ""}`}
              onClick={() => setFilter("deadlines")}
            >
              ⏰ Deadlines <span className="nc-tab-count">{counts.deadlines}</span>
            </button>
            <button
              className={`nc-tab-btn ${filter === "assignments" ? "active" : ""}`}
              onClick={() => setFilter("assignments")}
            >
              📋 Assignments <span className="nc-tab-count">{counts.assignments}</span>
            </button>
            <button
              className={`nc-tab-btn ${filter === "comments" ? "active" : ""}`}
              onClick={() => setFilter("comments")}
            >
              💬 Comments <span className="nc-tab-count">{counts.comments}</span>
            </button>
            <button
              className={`nc-tab-btn ${filter === "system" ? "active" : ""}`}
              onClick={() => setFilter("system")}
            >
              ⚡ System <span className="nc-tab-count">{counts.system}</span>
            </button>
          </div>

          {/* Right Controls: Search & Grouping */}
          <div className="nc-right-filters">
            <input
              type="text"
              className="nc-search-input"
              placeholder="Search notifications…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="nc-group-select"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
            >
              <option value="none">Flat Stream</option>
              <option value="date">Group by Date</option>
              <option value="task">Group by Task</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Notification Stream Card ── */}
      <div className="nc-stream-card">
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
            <div className="at-spinner" style={{ margin: "0 auto 12px" }} />
            <p>Loading notification feed…</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="nc-empty">
            <div className="nc-empty-icon">🔔</div>
            <h3>No notifications in this category</h3>
            <p>You are all caught up on tasks and activity!</p>
          </div>
        ) : groupBy === "date" && groupedData ? (
          <div>
            {["Today", "Yesterday", "Earlier this week", "Older"].map((bucket) => {
              const list = groupedData[bucket] || [];
              if (list.length === 0) return null;
              return (
                <div key={bucket} className="nc-group-section">
                  <div className="nc-group-title">📅 {bucket} ({list.length})</div>
                  <div className="nc-list">
                    {list.map((n) => renderNotificationCard(n))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : groupBy === "task" && groupedData ? (
          <div>
            {(groupedData.byTask || []).map((group, idx) => (
              <div key={idx} className="nc-group-section">
                <div className="nc-group-title">
                  📁 Task: {group.task?.title || "General"} ({group.notifications.length})
                </div>
                <div className="nc-list">
                  {group.notifications.map((n) => renderNotificationCard(n))}
                </div>
              </div>
            ))}

            {(groupedData.general || []).length > 0 && (
              <div className="nc-group-section">
                <div className="nc-group-title">
                  🔔 System & Other Updates ({groupedData.general.length})
                </div>
                <div className="nc-list">
                  {groupedData.general.map((n) => renderNotificationCard(n))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="nc-list">
            {notifications.map((n) => renderNotificationCard(n))}
          </div>
        )}
      </div>

      {/* ── Notification Preferences Modal ── */}
      {showPreferences && (
        <div className="nc-modal-backdrop" onClick={() => setShowPreferences(false)}>
          <div className="nc-pref-modal" onClick={(e) => e.stopPropagation()}>
            <div className="nc-pref-header">
              <h3>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Notification Preferences
              </h3>
              <button className="version-drawer-close" onClick={() => setShowPreferences(false)}>×</button>
            </div>

            <div className="nc-pref-body">
              {/* Email Notifications Section */}
              <div>
                <div className="nc-pref-group-title">📧 Email Notification Channels</div>

                <div className="nc-pref-toggle-row">
                  <div className="nc-pref-toggle-info">
                    <span className="nc-pref-toggle-title">Task Assignments</span>
                    <span className="nc-pref-toggle-desc">Receive email when you are assigned a new task</span>
                  </div>
                  <label className="nc-switch">
                    <input
                      type="checkbox"
                      checked={preferences.emailAssignments !== false}
                      onChange={(e) => setPreferences({ ...preferences, emailAssignments: e.target.checked })}
                    />
                    <span className="nc-slider" />
                  </label>
                </div>

                <div className="nc-pref-toggle-row">
                  <div className="nc-pref-toggle-info">
                    <span className="nc-pref-toggle-title">@Mentions</span>
                    <span className="nc-pref-toggle-desc">Receive email when someone mentions you in a comment</span>
                  </div>
                  <label className="nc-switch">
                    <input
                      type="checkbox"
                      checked={preferences.emailMentions !== false}
                      onChange={(e) => setPreferences({ ...preferences, emailMentions: e.target.checked })}
                    />
                    <span className="nc-slider" />
                  </label>
                </div>

                <div className="nc-pref-toggle-row">
                  <div className="nc-pref-toggle-info">
                    <span className="nc-pref-toggle-title">Upcoming Due-Date Reminders</span>
                    <span className="nc-pref-toggle-desc">Receive email 24 hours before a task deadline</span>
                  </div>
                  <label className="nc-switch">
                    <input
                      type="checkbox"
                      checked={preferences.emailDueSoon !== false}
                      onChange={(e) => setPreferences({ ...preferences, emailDueSoon: e.target.checked })}
                    />
                    <span className="nc-slider" />
                  </label>
                </div>

                <div className="nc-pref-toggle-row">
                  <div className="nc-pref-toggle-info">
                    <span className="nc-pref-toggle-title">Overdue Task Alerts</span>
                    <span className="nc-pref-toggle-desc">Receive email alert when a deadline has passed</span>
                  </div>
                  <label className="nc-switch">
                    <input
                      type="checkbox"
                      checked={preferences.emailOverdue !== false}
                      onChange={(e) => setPreferences({ ...preferences, emailOverdue: e.target.checked })}
                    />
                    <span className="nc-slider" />
                  </label>
                </div>

                <div className="nc-pref-toggle-row">
                  <div className="nc-pref-toggle-info">
                    <span className="nc-pref-toggle-title">Weekly Productivity Digest</span>
                    <span className="nc-pref-toggle-desc">Receive weekly email summarizing your completed tasks and stats</span>
                  </div>
                  <label className="nc-switch">
                    <input
                      type="checkbox"
                      checked={preferences.emailWeeklyDigest !== false}
                      onChange={(e) => setPreferences({ ...preferences, emailWeeklyDigest: e.target.checked })}
                    />
                    <span className="nc-slider" />
                  </label>
                </div>
              </div>

              {/* In-App Notifications Section */}
              <div>
                <div className="nc-pref-group-title">🔔 In-App & Real-Time Alerts</div>

                <div className="nc-pref-toggle-row">
                  <div className="nc-pref-toggle-info">
                    <span className="nc-pref-toggle-title">In-App Mentions</span>
                    <span className="nc-pref-toggle-desc">Popups & badges when tagged in comments</span>
                  </div>
                  <label className="nc-switch">
                    <input
                      type="checkbox"
                      checked={preferences.inAppMentions !== false}
                      onChange={(e) => setPreferences({ ...preferences, inAppMentions: e.target.checked })}
                    />
                    <span className="nc-slider" />
                  </label>
                </div>

                <div className="nc-pref-toggle-row">
                  <div className="nc-pref-toggle-info">
                    <span className="nc-pref-toggle-title">In-App Due-Date Alerts</span>
                    <span className="nc-pref-toggle-desc">Deadline warning banners in app</span>
                  </div>
                  <label className="nc-switch">
                    <input
                      type="checkbox"
                      checked={preferences.inAppDueSoon !== false}
                      onChange={(e) => setPreferences({ ...preferences, inAppDueSoon: e.target.checked })}
                    />
                    <span className="nc-slider" />
                  </label>
                </div>

                <div className="nc-pref-toggle-row">
                  <div className="nc-pref-toggle-info">
                    <span className="nc-pref-toggle-title">In-App Overdue Alerts</span>
                    <span className="nc-pref-toggle-desc">Alerts when tasks become overdue</span>
                  </div>
                  <label className="nc-switch">
                    <input
                      type="checkbox"
                      checked={preferences.inAppOverdue !== false}
                      onChange={(e) => setPreferences({ ...preferences, inAppOverdue: e.target.checked })}
                    />
                    <span className="nc-slider" />
                  </label>
                </div>
              </div>
            </div>

            <div className="nc-pref-footer">
              <button className="btn-td-secondary" onClick={() => setShowPreferences(false)}>
                Cancel
              </button>
              <button className="primary-button" onClick={handleSavePreferences} disabled={savingPrefs}>
                {savingPrefs ? "Saving…" : "Save Preferences"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
