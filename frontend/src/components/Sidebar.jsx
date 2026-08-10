import { NavLink, useNavigate } from "react-router-dom";

function Sidebar() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  const role = user?.role;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login");
  };

  return (
    <aside className="sidebar">

      {/* USER SIDEBAR */}
      {role === "user" && (
        <div className="sidebar-section">

          <div className="sidebar-heading">
            USER
          </div>

          <NavLink
            to="/tasks"
            className={({ isActive }) =>
              isActive
                ? "sidebar-link active"
                : "sidebar-link"
            }
          >
            <span>📋</span>
            Tasks
          </NavLink>

          <NavLink
            to="/create-task"
            className={({ isActive }) =>
              isActive
                ? "sidebar-link active"
                : "sidebar-link"
            }
          >
            <span>➕</span>
            Create Task
          </NavLink>

        </div>
      )}


      {/* ADMIN SIDEBAR */}
      {role === "admin" && (
        <div className="sidebar-section">

          <div className="sidebar-heading">
            ADMIN
          </div>

          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              isActive
                ? "sidebar-link active"
                : "sidebar-link"
            }
          >
            <span>📊</span>
            Dashboard
          </NavLink>

          <NavLink
            to="/admin/tasks"
            className={({ isActive }) =>
              isActive
                ? "sidebar-link active"
                : "sidebar-link"
            }
          >
            <span>🛠️</span>
            Manage Tasks
          </NavLink>

        </div>
      )}


      {/* LOGOUT */}
      <div className="sidebar-bottom">

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          <span>🚪</span>
          Logout
        </button>

      </div>

    </aside>
  );
}

export default Sidebar;