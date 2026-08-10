import { useNavigate } from "react-router-dom";
import API from "../services/taskApi";

function TaskItem({ task, fetchTasks }) {
  const navigate = useNavigate();

  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await API.delete(`/tasks/${task._id}`);

      fetchTasks();
    } catch (error) {
      console.error("Error deleting task:", error);

      alert("Failed to delete task.");
    }
  };

  const handleEdit = () => {
    navigate(`/edit-task/${task._id}`);
  };

  const statusClass = task.status
    .toLowerCase()
    .replace(" ", "-");

  return (
    <div className="task-card">

      <div className="task-card-top">

        <div>
          <h3>{task.title}</h3>

          <p className="task-description">
            {task.description || "No description provided."}
          </p>
        </div>

        <span className={`status-badge ${statusClass}`}>
          {task.status}
        </span>

      </div>

      <div className="task-card-bottom">

        <span className="task-date">
          Created:{" "}
          {new Date(task.createdAt).toLocaleDateString()}
        </span>

        <div className="task-actions">

          <button
            className="edit-button"
            onClick={handleEdit}
          >
            Edit
          </button>

          <button
            className="delete-button"
            onClick={handleDelete}
          >
            Delete
          </button>

        </div>

      </div>

    </div>
  );
}

export default TaskItem;