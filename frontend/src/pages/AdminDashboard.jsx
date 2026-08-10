import { useEffect, useState } from "react";
import API from "../services/taskApi";

function AdminDashboard() {
  const [tasks, setTasks] = useState([]);

  const fetchTasks = async () => {
    try {
      const response = await API.get("/tasks");
      setTasks(response.data.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const totalTasks = tasks.length;

  const pendingTasks = tasks.filter(
    (task) => task.status === "Pending"
  ).length;

  const inProgressTasks = tasks.filter(
    (task) => task.status === "In Progress"
  ).length;

  const completedTasks = tasks.filter(
    (task) => task.status === "Done"
  ).length;

  return (
    <div className="page">

      <div className="page-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Overview of your task management system</p>
        </div>
      </div>

      <div className="dashboard-grid">

        <div className="dashboard-card">
          <div className="dashboard-card-icon blue">
            📋
          </div>

          <div>
            <p>Total Tasks</p>
            <h2>{totalTasks}</h2>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-icon yellow">
            ⏳
          </div>

          <div>
            <p>Pending</p>
            <h2>{pendingTasks}</h2>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-icon purple">
            🔄
          </div>

          <div>
            <p>In Progress</p>
            <h2>{inProgressTasks}</h2>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-icon green">
            ✅
          </div>

          <div>
            <p>Completed</p>
            <h2>{completedTasks}</h2>
          </div>
        </div>

      </div>

      <div className="admin-welcome-card">
        <h2>Welcome to Admin Panel 👋</h2>

        <p>
          From the admin panel you can monitor, create, edit,
          and delete tasks.
        </p>
      </div>

    </div>
  );
}

export default AdminDashboard;