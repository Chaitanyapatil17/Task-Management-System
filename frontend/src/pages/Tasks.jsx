import { useEffect, useState } from "react";
import API from "../services/taskApi";
import TaskList from "../components/TaskList";

function Tasks() {
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

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          <p>Manage all your tasks</p>
        </div>

        <div className="task-count">
          {tasks.length} {tasks.length === 1 ? "Task" : "Tasks"}
        </div>
      </div>

      <TaskList
        tasks={tasks}
        fetchTasks={fetchTasks}
      />
    </div>
  );
}

export default Tasks;