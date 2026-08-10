import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/taskApi";

function CreateTask() {
  const navigate = useNavigate();
  const { id } = useParams();

  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "Pending",
  });

  const [loading, setLoading] = useState(false);

  // Fetch task when editing
  useEffect(() => {
    if (id) {
      fetchTask();
    }
  }, [id]);

  const fetchTask = async () => {
    try {
      const response = await API.get(`/tasks/${id}`);

      const task = response.data.data;

      setFormData({
        title: task.title,
        description: task.description,
        status: task.status,
      });
    } catch (error) {
      console.error("Error fetching task:", error);
      alert("Failed to load task.");
      navigate("/tasks");
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert("Title is required");
      return;
    }

    try {
      setLoading(true);

      if (isEditing) {
        await API.put(`/tasks/${id}`, formData);
      } else {
        await API.post("/tasks", formData);
      }

      navigate("/tasks");

    } catch (error) {
      console.error("Error saving task:", error);
      alert("Something went wrong.");

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">

      <div className="page-header">
        <div>
          <h1>
            {isEditing ? "Edit Task" : "Create Task"}
          </h1>

          <p>
            {isEditing
              ? "Update your task details"
              : "Create a new task"}
          </p>
        </div>
      </div>

      <div className="form-card">

        <form onSubmit={handleSubmit}>

          <div className="form-group">

            <label>Task Title</label>

            <input
              type="text"
              name="title"
              placeholder="Enter task title"
              value={formData.title}
              onChange={handleChange}
            />

          </div>

          <div className="form-group">

            <label>Description</label>

            <textarea
              name="description"
              placeholder="Enter task description"
              value={formData.description}
              onChange={handleChange}
            />

          </div>

          <div className="form-group">

            <label>Status</label>

            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="Pending">
                Pending
              </option>

              <option value="In Progress">
                In Progress
              </option>

              <option value="Done">
                Done
              </option>
            </select>

          </div>

          <div className="form-actions">

            <button
              type="button"
              className="cancel-button"
              onClick={() => navigate("/tasks")}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : isEditing
                ? "Update Task"
                : "Create Task"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default CreateTask;