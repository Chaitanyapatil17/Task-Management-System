import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/taskApi";
import { useSocket } from "../context/SocketContext";

function AdminUsers() {
  const navigate = useNavigate();
  const { isUserOnline } = useSocket();

  const [users, setUsers] = useState([]);

  const currentUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const fetchUsers = async () => {
    try {
      const response = await API.get("/auth/users");
      setUsers(response.data.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this user?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await API.delete(`/auth/users/${id}`);
      alert("User deleted successfully");
      fetchUsers();
    } catch (error) {
      console.error("Delete user error:", error);
      alert(
        error.response?.data?.message ||
          "Failed to delete user"
      );
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Manage Users</h1>
          <p>Create and manage users in the system</p>
        </div>

        <div className="header-buttons">
          <button
            className="primary-button"
            onClick={() => navigate("/admin/create-admin")}
          >
            + Create Admin
          </button>

          <button
            className="primary-button"
            onClick={() => navigate("/admin/create-user")}
          >
            + Create User
          </button>
        </div>
      </div>

      <div className="admin-table-card">
        {users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>No Users Found</h3>
            <p>There are currently no users.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="task-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => {
                  const isCurrentUser =
                    user._id === currentUser?.id ||
                    user._id === currentUser?._id;
                  const isOnline = isUserOnline(user._id);

                  return (
                    <tr key={user._id}>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: "12px",
                            fontWeight: 600,
                            color: isOnline ? "#34d399" : "#64748b",
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              backgroundColor: isOnline ? "#10b981" : "#64748b",
                              boxShadow: isOnline ? "0 0 6px #10b981" : "none",
                            }}
                          />
                          {isOnline ? "Online" : "Offline"}
                        </span>
                      </td>

                      <td className="task-title">
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 6,
                              backgroundColor: "rgba(99, 102, 241, 0.2)",
                              color: "#818cf8",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {user.name?.charAt(0)?.toUpperCase()}
                          </span>
                          {user.name}
                        </div>
                      </td>

                      <td>{user.email}</td>

                      <td>
                        <span className={`user-role-badge ${user.role}`}>
                          {user.role}
                        </span>
                      </td>

                      <td>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>

                      <td>
                        {isCurrentUser ? (
                          <span className="current-user">Current User</span>
                        ) : (
                          <button
                            className="delete-button"
                            onClick={() => handleDelete(user._id)}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminUsers;