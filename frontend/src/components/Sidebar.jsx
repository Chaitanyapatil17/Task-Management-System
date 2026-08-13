import { NavLink, useNavigate } from "react-router-dom";

const Icon = {
  dashboard: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  tasks: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  plus: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  users: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  chart: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6"  y1="20" x2="6"  y2="14"/>
    </svg>
  ),
  logout: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  collapse: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  expand: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  kanban: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="6" height="18" rx="1"/><rect x="10" y="7" width="6" height="8" rx="1"/><rect x="17" y="11" width="6" height="6" rx="1"/>
    </svg>
  ),
  calendar: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
};

const userLinks = [
  { to: "/dashboard",     icon: Icon.dashboard, label: "Dashboard",    end: true },
  { to: "/tasks",         icon: Icon.tasks,     label: "My Tasks"               },
  { to: "/create-task",   icon: Icon.plus,      label: "Create Task"            },
];
const adminLinks = [
  { to: "/admin",           icon: Icon.dashboard, label: "Dashboard",     end: true },
  { to: "/admin/tasks",     icon: Icon.tasks,     label: "Manage Tasks"           },
  { to: "/admin/kanban",    icon: Icon.kanban,    label: "Kanban Board"           },
  { to: "/admin/calendar",  icon: Icon.calendar,  label: "Calendar"               },
  { to: "/admin/create-task", icon: Icon.plus,    label: "Assign Task"            },
  { to: "/admin/users",     icon: Icon.users,     label: "Manage Users"           },
  { to: "/admin/analytics", icon: Icon.chart,     label: "Analytics"              },
];

function Sidebar({ collapsed, onToggle }) {
  const navigate = useNavigate();
  const user  = JSON.parse(localStorage.getItem("user") || "{}");
  const role  = user?.role;
  const links = role === "admin" ? adminLinks : userLinks;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <aside className={`sidebar${collapsed ? " sidebar--collapsed" : ""}`}>
      <button
        className="sidebar-toggle"
        onClick={onToggle}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? Icon.expand : Icon.collapse}
        {!collapsed && <span className="sidebar-toggle-label">Collapse</span>}
      </button>

      <div className="sidebar-section">
        {!collapsed && (
          <div className="sidebar-heading">{role === "admin" ? "Admin" : "User"}</div>
        )}
        <nav className="sidebar-menu">
          {links.map(({ to, icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
              title={collapsed ? label : undefined}
            >
              <span className="sidebar-link-icon">{icon}</span>
              {!collapsed && <span className="sidebar-link-label">{label}</span>}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-user" title={collapsed ? user.name : undefined}>
          <div className="sidebar-user-avatar">{user.name?.charAt(0)?.toUpperCase()}</div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user.name}</span>
              <span className="sidebar-user-role">{role}</span>
            </div>
          )}
        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
          title={collapsed ? "Sign out" : undefined}
        >
          <span className="sidebar-link-icon">{Icon.logout}</span>
          {!collapsed && <span className="sidebar-link-label">Sign out</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
