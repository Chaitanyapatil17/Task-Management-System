import API from "../services/taskApi";

function TaskItem({ task, fetchTasks, setEditingTask }) {
  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/${task._id}`);
      fetchTasks();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div
      style={{
        border: "1px solid #ccc",
        padding: "15px",
        marginTop: "10px",
        borderRadius: "8px",
      }}
    >
      <h3>{task.title}</h3>

      <p>{task.description}</p>

      <p>
        <strong>Status:</strong> {task.status}
      </p>

      <p>
        <strong>Created:</strong>{" "}
        {new Date(task.createdAt).toLocaleString()}
      </p>

      <button onClick={() => setEditingTask(task)}>
        Edit
      </button>

      <button
        onClick={handleDelete}
        style={{ marginLeft: "10px" }}
      >
        Delete
      </button>
    </div>
  );
}

export default TaskItem;