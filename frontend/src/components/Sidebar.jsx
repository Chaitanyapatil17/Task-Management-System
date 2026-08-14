import React, { useRef, useState, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Sidebar.css";

const FALLOFF_CURVES = {
  linear: (p) => p,
  smooth: (p) => p * p * (3 - 2 * p),
  sharp: (p) => p * p * p,
};

const Icon = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  tasks: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  chart: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  collapse: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  expand: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  kanban: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="6" height="18" rx="1"/><rect x="10" y="7" width="6" height="8" rx="1"/><rect x="17" y="11" width="6" height="6" rx="1"/>
    </svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  bell: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
};

const userLinksGrouped = [
  {
    category: "NAVIGATION",
    items: [
      { to: "/dashboard",     icon: Icon.dashboard, label: "Overview",      end: true },
      { to: "/tasks",         icon: Icon.tasks,     label: "My Tasks"                 },
      { to: "/create-task",   icon: Icon.plus,      label: "Create Task"              },
      { to: "/notifications", icon: Icon.bell,      label: "Notifications"            },
    ],
  },
];

const adminLinksGrouped = [
  {
    category: "MAIN",
    items: [
      { to: "/admin",               icon: Icon.dashboard, label: "Overview",       end: true },
      { to: "/admin/tasks",         icon: Icon.tasks,     label: "Manage Tasks"             },
      { to: "/admin/kanban",        icon: Icon.kanban,    label: "Kanban Board"             },
      { to: "/admin/calendar",      icon: Icon.calendar,  label: "Calendar"                 },
      { to: "/admin/notifications", icon: Icon.bell,      label: "Notifications"            },
    ],
  },
  {
    category: "MANAGEMENT",
    items: [
      { to: "/admin/create-task", icon: Icon.plus,    label: "Assign Task"              },
      { to: "/admin/users",       icon: Icon.users,   label: "Manage Users"             },
      { to: "/admin/analytics",   icon: Icon.chart,   label: "Analytics"                },
    ],
  },
];

function Sidebar({ collapsed, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user?.role;
  const groupedLinks = role === "admin" ? adminLinksGrouped : userLinksGrouped;

  // Flattened items for the LineSidebar physics calculations
  const allItems = groupedLinks.flatMap((g) => g.items);

  // LineSidebar physics state & refs
  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const targetsRef = useRef([]);
  const currentRef = useRef([]);
  const rafRef = useRef(null);
  const lastRef = useRef(0);

  // Calculate active index based on route
  const activeIndex = allItems.findIndex((item) => {
    if (item.end) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  });

  const activeRef = useRef(activeIndex);
  activeRef.current = activeIndex;

  const proximityRadius = 90;
  const falloff = "smooth";
  const smoothing = 90;

  const runFrame = useCallback((now) => {
    const dt = Math.min((now - lastRef.current) / 1000, 0.05);
    lastRef.current = now;
    const tau = Math.max(smoothing, 1) / 1000;
    const k = 1 - Math.exp(-dt / tau);

    let moving = false;
    const currentItems = itemRefs.current;
    for (let i = 0; i < currentItems.length; i++) {
      const el = currentItems[i];
      if (!el) continue;
      const target = Math.max(targetsRef.current[i] || 0, activeRef.current === i ? 1 : 0);
      const cur = currentRef.current[i] || 0;
      const next = cur + (target - cur) * k;
      const settled = Math.abs(target - next) < 0.0015;
      const value = settled ? target : next;
      currentRef.current[i] = value;
      el.style.setProperty("--effect", value.toFixed(4));
      if (!settled) moving = true;
    }

    rafRef.current = moving ? requestAnimationFrame(runFrame) : null;
  }, []);

  const startLoop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(runFrame);
  }, [runFrame]);

  const handlePointerMove = useCallback(
    (e) => {
      if (collapsed) return;
      const list = listRef.current;
      if (!list) return;
      const rect = list.getBoundingClientRect();
      const pointerY = e.clientY - rect.top;
      const ease = FALLOFF_CURVES[falloff] ?? FALLOFF_CURVES.linear;
      const currentItems = itemRefs.current;
      for (let i = 0; i < currentItems.length; i++) {
        const el = currentItems[i];
        if (!el) continue;
        const center = el.offsetTop + el.offsetHeight / 2;
        const distance = Math.abs(pointerY - center);
        targetsRef.current[i] = ease(Math.max(0, 1 - distance / proximityRadius));
      }
      startLoop();
    },
    [collapsed, falloff, proximityRadius, startLoop]
  );

  const handlePointerLeave = useCallback(() => {
    targetsRef.current = targetsRef.current.map(() => 0);
    startLoop();
  }, [startLoop]);

  useEffect(() => {
    startLoop();
  }, [activeIndex, startLoop]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  let globalIndexCounter = 0;

  return (
    <aside
      className={`sidebar app-line-sidebar ${collapsed ? "sidebar--collapsed" : "sidebar--expanded"}`}
      style={{
        "--accent-color": "#06b6d4",
        "--text-color": "#94a3b8",
        "--marker-color": "#334155",
        "--marker-length": collapsed ? "18px" : "32px",
        "--max-shift": collapsed ? "0px" : "14px",
      }}
    >
      {/* ── Sidebar Header / Toggle ── */}
      <div className="sidebar-top">
        <button
          className="sidebar-toggle-btn"
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="sidebar-toggle-icon">{collapsed ? Icon.expand : Icon.collapse}</span>
          {!collapsed && <span className="sidebar-toggle-label">Collapse Menu</span>}
        </button>
      </div>

      {/* ── Interactive Line Navigation ── */}
      <div
        ref={listRef}
        className="sidebar-line-nav"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {groupedLinks.map((group, gIdx) => (
          <div className="sidebar-line-group" key={gIdx}>
            {!collapsed && group.category && (
              <div className="sidebar-group-heading">{group.category}</div>
            )}

            <ul className="sidebar-line-list">
              {group.items.map((item) => {
                const currentIndex = globalIndexCounter++;
                const isActive = activeIndex === currentIndex;

                return (
                  <li
                    key={item.to}
                    ref={(el) => {
                      itemRefs.current[currentIndex] = el;
                    }}
                    className={`sidebar-line-item ${isActive ? "active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => navigate(item.to)}
                    title={collapsed ? item.label : undefined}
                  >
                    {/* Interactive Marker Line */}
                    <span className="sidebar-line-marker" aria-hidden="true" />

                    <div className="sidebar-line-content">
                      {/* Number Index */}
                      {!collapsed && (
                        <span className="sidebar-line-idx">
                          {String(currentIndex + 1).padStart(2, "0")}
                        </span>
                      )}

                      {/* Icon */}
                      <span className="sidebar-line-icon">{item.icon}</span>

                      {/* Label Text */}
                      {!collapsed && (
                        <span className="sidebar-line-text">{item.label}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* ── Sidebar Footer: User Card & Logout ── */}
      <div className="sidebar-footer">
        <div className="sidebar-user-badge" title={collapsed ? user.name : undefined}>
          <div className="sidebar-user-avatar">
            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          {!collapsed && (
            <div className="sidebar-user-details">
              <span className="sidebar-user-name">{user.name || "User"}</span>
              <span className={`sidebar-user-role ${role === "admin" ? "admin" : "user"}`}>
                {role === "admin" ? "⚡ ADMIN" : "USER"}
              </span>
            </div>
          )}
        </div>

        <button
          className="sidebar-logout-btn"
          onClick={handleLogout}
          title={collapsed ? "Sign out" : undefined}
          aria-label="Sign out"
        >
          <span className="sidebar-logout-icon">{Icon.logout}</span>
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
