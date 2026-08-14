import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { createTaskWithFiles } from "../services/taskApi";
import PrerequisitesPicker from "../components/PrerequisitesPicker";

function AdminCreateTask() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "Pending",
    priority: "Medium",
    dueDate: "",
    assignedTo: "",
  });
  const [files, setFiles] = useState([]);
  const [prerequisites, setPrerequisites] = useState([]);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await API.get("/auth/users");
      setUsers(res.data.data.filter((u) => u.role === "user"));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchAvailableTasks = async () => {
    try {
      const res = await API.get("/tasks?limit=1000");
      const filtered = res.data.data.filter((t) => !prerequisites.some((p) => p._id === t._id));
      setAvailableTasks(filtered);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchAvailableTasks();
  }, [prerequisites]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (files.length + selected.length > 5) {
      alert("Maximum 5 files allowed");
      return;
    }
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const addPrerequisite = (task) => {
    if (!prerequisites.some((p) => p._id === task._id)) {
      setPrerequisites((prev) => [...prev, { ...task }]);
    }
  };

  const removePrerequisite = (taskId) => {
    setPrerequisites((prev) => prev.filter((p) => p._id !== taskId));
  };

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("Task title is required");
      return;
    }
    if (!formData.assignedTo) {
      alert("Please select a user");
      return;
    }
    try {
      setLoading(true);
      const taskResponse = await createTaskWithFiles(formData, files);
      const taskId = taskResponse.data.data._id;

      if (prerequisites.length > 0) {
        const prerequisiteIds = prerequisites.map((p) => p._id);
        await API.post(`/tasks/${taskId}/prerequisites`, { prerequisiteIds });
      }

      navigate("/admin/tasks");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to assign task");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="page assign-task-page">
      <div className="page-header compact-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>Assign Task</h1>
          <p>Create a task and assign it to a team member</p>
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("open-ai-chat", { detail: { prompt: "Help me create and assign a new task to the best team member" } }))}
          className="btn-hero-primary"
          style={{
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            border: "none",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ✨ AI Task Delegator
        </button>
      </div>

      <div className="form-card compact-form-card">
        <form onSubmit={handleSubmit} className="compact-form-layout">
          {/* Left Column: Basic Details */}
          <div className="form-col-main">
            <div className="form-group">
              <label htmlFor="title">Task Title</label>
              <input
                id="title"
                type="text"
                name="title"
                placeholder="Enter task title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">
                Description <span className="form-help-inline">(optional)</span>
              </label>
              <textarea
                id="description"
                name="description"
                placeholder="Enter task description..."
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="compact-textarea"
              />
            </div>

            {/* Status & Priority Row */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select id="status" name="status" value={formData.status} onChange={handleChange}>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="priority">Priority</label>
                <select id="priority" name="priority" value={formData.priority} onChange={handleChange}>
                  <option value="Low">🟢 Low</option>
                  <option value="Medium">🟡 Medium</option>
                  <option value="High">🟠 High</option>
                  <option value="Critical">🔴 Critical</option>
                </select>
              </div>
            </div>

            {/* Due Date & Assignee Row */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="dueDate">
                  Due Date <span className="form-help-inline">(optional)</span>
                </label>
                <input
                  id="dueDate"
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  min={today}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="assignedTo">Assign To</label>
                <select
                  id="assignedTo"
                  name="assignedTo"
                  value={formData.assignedTo}
                  onChange={handleChange}
                  disabled={usersLoading}
                  required
                >
                  <option value="">
                    {usersLoading ? "Loading users..." : "Select a user"}
                  </option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Right Column: Prerequisites, Attachments & Actions */}
          <div className="form-col-side">
            {/* Prerequisites */}
            <div className="form-group">
              <label>
                Prerequisites <span className="form-help-inline">(optional)</span>
              </label>
              <PrerequisitesPicker
                availableTasks={availableTasks}
                selectedPrerequisites={prerequisites}
                onAdd={addPrerequisite}
                onRemove={removePrerequisite}
              />
            </div>

            {/* Attachments */}
            <div className="form-group">
              <label>
                Attachments <span className="form-help-inline">(up to 5 files, max 10MB)</span>
              </label>
              <div
                className="compact-drop-zone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const d = Array.from(e.dataTransfer.files);
                  if (files.length + d.length > 5) {
                    alert("Max 5 files");
                    return;
                  }
                  setFiles((prev) => [...prev, ...d]);
                }}
              >
                <span className="drop-zone-icon">📎</span>
                <span className="drop-zone-text">Click or drag files here</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                />
              </div>

              {files.length > 0 && (
                <div className="compact-file-chips">
                  {files.map((f, i) => (
                    <div className="compact-file-chip" key={i}>
                      <span className="file-chip-name">{f.name}</span>
                      <span className="file-chip-size">{formatSize(f.size)}</span>
                      <button
                        type="button"
                        className="file-chip-remove"
                        onClick={() => removeFile(i)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons inside the side column */}
            <div className="form-actions compact-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={() => navigate("/admin/tasks")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={loading || usersLoading || users.length === 0}
              >
                {loading ? "Assigning…" : "Assign Task"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminCreateTask;
