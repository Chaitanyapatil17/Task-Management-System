import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/taskApi";

function AdminTasks() {
  const [tasks, setTasks] = useState([]);

  const navigate = useNavigate();

  const fetchTasks = async () => {
    try {
      const response = await API.get("/tasks");

      setTasks(response.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await API.delete(`/tasks/${id}`);

      fetchTasks();
    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.message ||
          "Failed to delete task"
      );
    }
  };

  return (
    <div className="page">

      <div className="page-header">

        <div>
          <h1>Manage Tasks</h1>

          <p>
            Admin can view, edit and delete all tasks
          </p>
        </div>

        <div className="task-count">
          {tasks.length} Tasks
        </div>

      </div>


      <div className="admin-table-card">

        <div className="table-wrapper">

          <table className="task-table">

            <thead>
              <tr>
                <th>Title</th>
                <th>Description</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>

              {tasks.length === 0 ? (

                <tr>
                  <td colSpan="5">
                    No tasks found
                  </td>
                </tr>

              ) : (

                tasks.map((task) => (

                  <tr key={task._id}>

                    <td className="task-title">
                      {task.title}
                    </td>

                    <td>
                      {task.description}
                    </td>

                    <td>
                      <span
                        className={`status-badge ${
                          task.status
                            .toLowerCase()
                            .replace(" ", "-")
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>

                    <td>
                      {new Date(
                        task.createdAt
                      ).toLocaleDateString()}
                    </td>

                    <td>

                      <div className="admin-actions">

                        {/* EDIT */}
                        <button
                          className="edit-button"
                          onClick={() =>
                            navigate(
                              `/admin/edit-task/${task._id}`
                            )
                          }
                        >
                          Edit
                        </button>

                        {/* DELETE */}
                        <button
                          className="delete-button"
                          onClick={() =>
                            handleDelete(task._id)
                          }
                        >
                          Delete
                        </button>

                      </div>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}

export default AdminTasks;