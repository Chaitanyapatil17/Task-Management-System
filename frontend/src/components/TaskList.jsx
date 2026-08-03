import TaskItem from "./TaskItem";

function TaskList({ tasks, fetchTasks, setEditingTask }) {
  return (
    <div>
      <h2>All Tasks</h2>

      {tasks.length === 0 ? (
        <p>No Tasks Found</p>
      ) : (
        tasks.map((task) => (
          <TaskItem
            key={task._id}
            task={task}
            fetchTasks={fetchTasks}
            setEditingTask={setEditingTask}
          />
        ))
      )}
    </div>
  );
}

export default TaskList;