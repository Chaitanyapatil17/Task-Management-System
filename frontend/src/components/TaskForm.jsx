import { useState, useEffect } from "react";
import API from "../services/taskApi";

function TaskForm({ fetchTasks, editingTask, setEditingTask }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "Pending",
    priority: "Medium",
    dueDate: "",
    startDate: "",
    assignedTo: "",
    tags: "",
    customFields: [],
    recurrence: { enabled: false, frequency: "weekly", interval: 1, endDate: "" },
    templateName: "",
  });

  useEffect(() => {
    if (editingTask) {
      const cf = (editingTask.customFields || []).map((f) => `${f.key}:${f.value}`).join("\n");
      setFormData({
        title: editingTask.title,
        description: editingTask.description,
        status: editingTask.status,
        priority: editingTask.priority || "Medium",
        dueDate: editingTask.dueDate ? editingTask.dueDate.slice(0, 10) : "",
        startDate: editingTask.startDate ? editingTask.startDate.slice(0, 10) : "",
        assignedTo: editingTask.assignedTo?._id || "",
        tags: Array.isArray(editingTask.tags) ? editingTask.tags.join(", ") : "",
        customFields: cf,
        recurrence: editingTask.recurrence || { enabled: false, frequency: "weekly", interval: 1, endDate: "" },
        templateName: editingTask.templateName || "",
      });
    }
  }, [editingTask]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      status: "Pending",
      priority: "Medium",
      dueDate: "",
      startDate: "",
      assignedTo: "",
      tags: "",
      customFields: [],
      recurrence: { enabled: false, frequency: "weekly", interval: 1, endDate: "" },
      templateName: "",
    });
    setEditingTask(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert("Title is required");
      return;
    }

    const payload = {
      ...formData,
      tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      customFields: formData.customFields
        ? formData.customFields.split("\n").map((line) => {
            const [key, ...rest] = line.split(":");
            return { key: (key || "").trim(), value: rest.join(":").trim() };
          }).filter((f) => f.key)
        : [],
      recurrence: formData.recurrence?.enabled ? formData.recurrence : { enabled: false },
    };

    try {
      if (editingTask) {
        await API.updateTaskWithFiles(editingTask._id, payload);
      } else {
        await API.createTaskWithFiles(payload);
      }
      resetForm();
      fetchTasks();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Something went wrong!");
    }
  };

  return (
    <div className="form-card">
      <h2>{editingTask ? "✏️ Edit Task" : "➕ Add New Task"}</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="title"
          placeholder="Task Title"
          value={formData.title}
          onChange={handleChange}
        />

        <textarea
          name="description"
          placeholder="Task Description"
          value={formData.description}
          onChange={handleChange}
        />

        <div className="form-row">
          <select name="status" value={formData.status} onChange={handleChange}>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>

          <select name="priority" value={formData.priority} onChange={handleChange}>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        <div className="form-row">
          <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} />
          <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} />
        </div>

        <input
          type="text"
          name="tags"
          placeholder="Tags (comma separated)"
          value={formData.tags}
          onChange={handleChange}
        />

        <textarea
          name="customFields"
          placeholder="Custom fields (key:value per line)"
          value={formData.customFields}
          onChange={handleChange}
          rows={3}
        />

        <div className="form-card" style={{ marginTop: 12, padding: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <input type="checkbox" name="recurrence" checked={formData.recurrence?.enabled} onChange={handleChange} />
            <span>Recurring task</span>
          </label>

          {formData.recurrence?.enabled && (
            <>
              <select name="recurrence.frequency" value={formData.recurrence.frequency} onChange={handleChange}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>

              <input
                type="number"
                name="recurrence.interval"
                min="1"
                placeholder="Interval"
                value={formData.recurrence.interval}
                onChange={handleChange}
              />

              <input type="date" name="recurrence.endDate" value={formData.recurrence.endDate} onChange={handleChange} />
            </>
          )}
        </div>

        <div className="form-buttons">
          <button type="submit">{editingTask ? "Update Task" : "Add Task"}</button>
          {editingTask && (
            <button type="button" className="cancel-btn" onClick={resetForm}>Cancel</button>
          )}
        </div>
      </form>
    </div>
  );
}

export default TaskForm;
