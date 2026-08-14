import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getNotifications, markAllRead, markOneRead } from "../services/taskApi";
import { useSocket } from "../context/SocketContext";

// Ensure clean standard theme (remove legacy dark mode overrides)
if (typeof window !== "undefined") {
  localStorage.removeItem("tms-theme");
  document.documentElement.removeAttribute("data-theme");
}

function getNotifIcon(type) {
  switch (type) {
    case "task_assigned":
      return "📋";
    case "task_completed":
      return "✅";
    case "mention":
      return "💬";
    case "comment":
      return "💬";
    case "comment_reply":
      return "↩️";
    case "file_uploaded":
    case "file_version_uploaded":
      return "📎";
    case "task_status_changed":
      return "⚡";
    default:
      return "🔔";
  }
}

function Navbar() {
  const navigate = useNavigate();
  const { connected } = useSocket();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [notifications, setNotif] = useState([]);
  const [unreadCount, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      setNotif(res.data.data);
      setUnread(res.data.unreadCount);
    } catch {
      /* not logged in yet */
    }
  };

  useEffect(() => {
    if (user?._id || user?.id) {
      fetchNotifications();
      const iv = setInterval(fetchNotifications, 60000); // Polling backup
      return () => clearInterval(iv);
    }
  }, []);

  // Listen for Real-Time Socket Notifications
  useEffect(() => {
    const handleSocketNotif = (e) => {
      const newNotif = e.detail;
      if (newNotif) {
        setNotif((prev) => [newNotif, ...prev.filter((n) => n._id !== newNotif._id)]);
        setUnread((prev) => prev + 1);
      }
    };

    window.addEventListener("socket:notification", handleSocketNotif);
    return () => window.removeEventListener("socket:notification", handleSocketNotif);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keyboard shortcut for quick search focus (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleMarkAllRead = async () => {
    await markAllRead();
    setUnread(0);
    setNotif((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotifClick = async (n) => {
    if (!n.read) {
      await markOneRead(n._id);
      setNotif((prev) => prev.map((item) => (item._id === n._id ? { ...item, read: true } : item)));
      setUnread((c) => Math.max(0, c - 1));
    }
    setOpen(false);

    // If notification has a specific task reference, navigate to task detail
    const taskId = n.task?._id || n.task;
    if (taskId) {
      navigate(user.role === "admin" ? `/admin/tasks/${taskId}/detail` : `/tasks/${taskId}/detail`);
    } else {
      navigate(user.role === "admin" ? "/admin/tasks" : "/tasks");
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const targetPath = user.role === "admin" ? "/admin/tasks" : "/tasks";
    navigate(`${targetPath}?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <header className="navbar glass-navbar">
      {/* ── Brand Logo ── */}
      <div className="navbar-logo" onClick={() => navigate(user.role === "admin" ? "/admin" : "/dashboard")}>
        <div className="logo-badge-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <span className="logo-text">TMS</span>
      </div>

      {/* ── Center Quick Search Bar ── */}
      <form onSubmit={handleSearchSubmit} className="navbar-search-form">
        <div className="navbar-search-wrap">
          <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            className="navbar-search-input"
            placeholder="Search tasks, assignees, keywords…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <kbd className="search-shortcut">⌘K</kbd>
        </div>
      </form>

      {/* ── Right Controls ── */}
      <div className="navbar-right">
        {/* ── Notification Bell Dropdown ── */}
        <div className="notif-wrapper" ref={dropdownRef}>
          <button className={`bell-btn glass-bell ${unreadCount > 0 ? "has-unread" : ""}`} onClick={() => setOpen((p) => !p)} aria-label="Notifications">
            <svg className="bell-svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="bell-badge">
                <span className="bell-pulse-dot" />
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="notif-dropdown glass-dropdown">
              <div className="notif-header">
                <div className="notif-title-row">
                  <span className="notif-header-title">Notifications</span>
                  {unreadCount > 0 && <span className="notif-badge-pill">{unreadCount} new</span>}
                </div>
                {unreadCount > 0 && (
                  <button className="notif-mark-read" onClick={handleMarkAllRead}>
                    Mark all read
                  </button>
                )}
              </div>
              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="notif-empty">
                    <span className="empty-bell">🔔</span>
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n._id} className={`notif-item ${!n.read ? "notif-unread" : ""}`} onClick={() => handleNotifClick(n)}>
                      <div className="notif-icon">{getNotifIcon(n.type)}</div>
                      <div className="notif-body">
                        <p className="notif-msg">{n.message}</p>
                        <span className="notif-time">{timeAgo(n.createdAt)}</span>
                      </div>
                      {!n.read && <span className="notif-dot" />}
                    </div>
                  ))
                )}
              </div>
              <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "center", background: "rgba(0,0,0,0.2)" }}>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    color: "#38bdf8",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  onClick={() => {
                    setOpen(false);
                    navigate(user.role === "admin" ? "/admin/notifications" : "/notifications");
                  }}
                >
                  View All Notifications & Preferences →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── User Profile Badge ── */}
        <div className="navbar-user-card">
          <div className="navbar-avatar-container">
            <div className="navbar-avatar">{user.name ? user.name.charAt(0).toUpperCase() : "U"}</div>
            <span
              className={`online-indicator ${connected ? "online" : "offline"}`}
              style={{
                backgroundColor: connected ? "#10b981" : "#64748b",
                boxShadow: connected ? "0 0 8px #10b981" : "none",
              }}
              title={connected ? "Online (Connected)" : "Disconnected"}
            />
          </div>
          <div className="navbar-user-text">
            <span className="navbar-user-name">{user.name || "User"}</span>
            <span className={`navbar-role-tag ${user.role === "admin" ? "admin" : "user"}`}>
              {user.role === "admin" ? "⚡ ADMIN" : "USER"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
