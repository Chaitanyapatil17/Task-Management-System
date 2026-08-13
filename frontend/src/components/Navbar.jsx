import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getNotifications, markAllRead, markOneRead } from "../services/taskApi";

// ── Dark mode hook (shared via localStorage + data-theme on <html>) ──────────
export function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem("tms-theme") === "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("tms-theme", dark ? "dark" : "light");
  }, [dark]);

  return [dark, setDark];
}

// Apply saved theme immediately on first load (before React hydrates)
const saved = localStorage.getItem("tms-theme");
if (saved) document.documentElement.setAttribute("data-theme", saved);

function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [dark, setDark]           = useDarkMode();
  const [notifications, setNotif] = useState([]);
  const [unreadCount, setUnread]  = useState(0);
  const [open, setOpen]           = useState(false);
  const dropdownRef               = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      setNotif(res.data.data);
      setUnread(res.data.unreadCount);
    } catch { /* not logged in yet */ }
  };

  useEffect(() => {
    if (user?._id || user?.id) {
      fetchNotifications();
      const iv = setInterval(fetchNotifications, 30000);
      return () => clearInterval(iv);
    }
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMarkAllRead = async () => {
    await markAllRead();
    setUnread(0);
    setNotif((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotifClick = async (n) => {
    if (!n.read) {
      await markOneRead(n._id);
      setNotif((prev) => prev.map((item) => item._id === n._id ? { ...item, read: true } : item));
      setUnread((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    navigate(user.role === "admin" ? "/admin/tasks" : "/tasks");
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
    <header className="navbar">
      <div className="navbar-logo">TMS</div>
      <div className="navbar-title">Task Management System</div>

      <div className="navbar-right">

        {/* ── Dark mode toggle ─────────────────────────────── */}
        <button
          className="dark-toggle"
          onClick={() => setDark((d) => !d)}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          title={dark ? "Light mode" : "Dark mode"}
        >
          {dark ? (
            /* Sun icon */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            /* Moon icon */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        {/* ── Bell ─────────────────────────────────────────── */}
        <div className="notif-wrapper" ref={dropdownRef}>
          <button className="bell-btn" onClick={() => setOpen((p) => !p)} aria-label="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && <span className="bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </button>

          {open && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <span className="notif-header-title">Notifications</span>
                {unreadCount > 0 && (
                  <button className="notif-mark-read" onClick={handleMarkAllRead}>Mark all read</button>
                )}
              </div>
              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="notif-empty"><span>🔔</span><p>No notifications yet</p></div>
                ) : (
                  notifications.map((n) => (
                    <div key={n._id} className={`notif-item ${!n.read ? "notif-unread" : ""}`} onClick={() => handleNotifClick(n)}>
                      <div className="notif-icon">{n.type === "task_assigned" ? "📋" : "✅"}</div>
                      <div className="notif-body">
                        <p className="notif-msg">{n.message}</p>
                        <span className="notif-time">{timeAgo(n.createdAt)}</span>
                      </div>
                      {!n.read && <span className="notif-dot" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── User info ─────────────────────────────────────── */}
        <div className="navbar-user-info">
          <div className="navbar-user-text">
            <span className="navbar-user-name">{user.name || "User"}</span>
            <span className="navbar-user-role">{user.role || ""}</span>
          </div>
          <div className="navbar-avatar">
            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
        </div>

      </div>
    </header>
  );
}

export default Navbar;
