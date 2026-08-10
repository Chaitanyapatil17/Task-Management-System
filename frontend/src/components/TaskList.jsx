import TaskItem from "./TaskItem";

function TaskList({ tasks, fetchTasks }) {
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>

        <h3>No Tasks Found</h3>

        <p>
          You don't have any tasks yet. Create your first task.
        </p>
      </div>
    );
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task._id}
          task={task}
          fetchTasks={fetchTasks}
        />
      ))}
    </div>
  );
}

export default TaskList;