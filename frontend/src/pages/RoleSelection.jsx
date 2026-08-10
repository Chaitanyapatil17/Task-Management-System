import { useNavigate } from "react-router-dom";

function RoleSelection() {
  const navigate = useNavigate();

  return (
    <div className="role-page">

      <div className="role-container">

        <div className="role-logo">
          TMS
        </div>

        <h1>Task Management System</h1>

        <p className="role-subtitle">
          Select how you want to continue
        </p>

        <div className="role-options">

          {/* User */}
          <div
            className="role-card"
            onClick={() => navigate("/tasks")}
          >
            <div className="role-icon user-icon">
              👤
            </div>

            <h2>User</h2>

            <p>
              Create and manage your tasks
            </p>

            <button>
              Continue as User
            </button>
          </div>


          {/* Admin */}
          <div
            className="role-card"
            onClick={() => navigate("/admin")}
          >
            <div className="role-icon admin-icon">
              🛡️
            </div>

            <h2>Admin</h2>

            <p>
              Monitor and manage all tasks
            </p>

            <button>
              Continue as Admin
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}

export default RoleSelection;