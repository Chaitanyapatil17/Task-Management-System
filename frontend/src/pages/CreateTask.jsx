import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API, { createTaskWithFiles, updateTaskWithFiles } from "../services/taskApi";

function CreateTask() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const fileInputRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "admin";
  const backPath = isAdmin ? "/admin/tasks" : "/tasks";

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "Pending",
    priority: "Medium",
    dueDate: "",
  });
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) fetchTask();
  }, [id]);

  const fetchTask = async () => {
    try {
      const res = await API.get(`/tasks/${id}`);
      const task = res.data.data;
      setFormData({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority || "Medium",
        dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
      });
      setExistingAttachments(task.attachments || []);
    } catch {
      alert("Failed to load task.");
      navigate(backPath);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (files.length + selected.length > 5) {
      alert("Maximum 5 new files allowed");
      return;
    }
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeNewFile = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
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
        await updateTaskWithFiles(id, formData, files);
      } else {
        await createTaskWithFiles(formData, files);
      }
      navigate(backPath);
    } catch {
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="page assign-task-page">
      <div className="page-header compact-header">
        <div>
          <h1>{isEditing ? "Edit Task" : "Create Task"}</h1>
          <p>{isEditing ? "Update task details" : "Create a new task for your workspace"}</p>
        </div>
      </div>

      <div className="form-card compact-form-card">
        <form onSubmit={handleSubmit} className="compact-form-layout">
          {/* Main Column */}
          <div className="form-col-main">
            <div className="form-group">
              <label>Task Title</label>
              <input
                type="text"
                name="title"
                placeholder="Enter task title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>
                Description <span className="form-help-inline">(optional)</span>
              </label>
              <textarea
                name="description"
                placeholder="Enter task description..."
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="compact-textarea"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Status</label>
                <select name="status" value={formData.status} onChange={handleChange}>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select name="priority" value={formData.priority} onChange={handleChange}>
                  <option value="Low">🟢 Low</option>
                  <option value="Medium">🟡 Medium</option>
                  <option value="High">🟠 High</option>
                  <option value="Critical">🔴 Critical</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>
                Due Date <span className="form-help-inline">(optional)</span>
              </label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                min={today}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Side Column: Attachments & Actions */}
          <div className="form-col-side">
            {/* Existing attachments */}
            {isEditing && existingAttachments.length > 0 && (
              <div className="form-group">
                <label>Existing Attachments</label>
                <div className="compact-file-chips">
                  {existingAttachments.map((a, i) => (
                    <div className="compact-file-chip existing" key={i}>
                      <span className="file-chip-icon">📎</span>
                      <a
                        href={a.url || `http://localhost:5000/uploads/${a.storedName}`}
                        target="_blank"
                        rel="noreferrer"
                        className="file-chip-name file-item-link"
                      >
                        {a.filename}
                      </a>
                      <span className="file-chip-size">{formatSize(a.size)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New attachments */}
            <div className="form-group">
              <label>
                {isEditing ? "Add More Attachments" : "Attachments"}
                <span className="form-help-inline"> (up to 5, max 10 MB)</span>
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
                  setFiles((p) => [...p, ...d]);
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
                        onClick={() => removeNewFile(i)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-actions compact-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={() => navigate(backPath)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={loading}
              >
                {loading ? "Saving…" : isEditing ? "Update Task" : "Create Task"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateTask;
