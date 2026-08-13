import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { createTaskWithFiles } from "../services/taskApi";

function AdminCreateTask() {
  const navigate     = useNavigate();
  const fileInputRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    title: "", description: "", status: "Pending",
    priority: "Medium", dueDate: "", assignedTo: "",
  });
  const [files,        setFiles]        = useState([]);
  const [loading,      setLoading]      = useState(false);
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

  useEffect(() => { fetchUsers(); }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (files.length + selected.length > 5) { alert("Maximum 5 files allowed"); return; }
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim())  { alert("Task title is required"); return; }
    if (!formData.assignedTo)    { alert("Please select a user");   return; }
    try {
      setLoading(true);
      await createTaskWithFiles(formData, files);
      navigate("/admin/tasks");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to assign task");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Assign Task</h1>
          <p>Create a task and assign it to a user</p>
        </div>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label htmlFor="title">Task Title</label>
            <input id="title" type="text" name="title" placeholder="Enter task title" value={formData.title} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" placeholder="Enter task description (optional)" value={formData.description} onChange={handleChange} rows="4" />
          </div>

          {/* Status + Priority */}
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

          {/* Due date + Assign To */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dueDate">Due Date <span className="form-help-inline">(optional)</span></label>
              <input id="dueDate" type="date" name="dueDate" value={formData.dueDate} min={today} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label htmlFor="assignedTo">Assign To</label>
              <select id="assignedTo" name="assignedTo" value={formData.assignedTo} onChange={handleChange} disabled={usersLoading}>
                <option value="">{usersLoading ? "Loading users..." : "Select a user"}</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                ))}
              </select>
              {!usersLoading && users.length === 0 && (
                <small className="form-help">No users found. Create one from Manage Users.</small>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div className="form-group">
            <label>Attachments <span className="form-help-inline">(up to 5 files, max 10 MB each)</span></label>
            <div className="file-drop-zone" onClick={() => fileInputRef.current.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const d = Array.from(e.dataTransfer.files); if (files.length + d.length > 5) { alert("Max 5"); return; } setFiles((p) => [...p, ...d]); }}>
              <div className="file-drop-icon">📎</div>
              <p className="file-drop-text">Click to browse or drag & drop files here</p>
              <p className="file-drop-hint">PDF, Images, Word, Excel, ZIP — up to 10 MB</p>
              <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={handleFileChange} accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" />
            </div>
            {files.length > 0 && (
              <div className="file-list">
                {files.map((f, i) => (
                  <div className="file-item" key={i}>
                    <span className="file-item-icon">📄</span>
                    <div className="file-item-info"><span className="file-item-name">{f.name}</span><span className="file-item-size">{formatSize(f.size)}</span></div>
                    <button type="button" className="file-item-remove" onClick={() => removeFile(i)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={() => navigate("/admin/tasks")}>Cancel</button>
            <button type="submit" className="primary-button" disabled={loading || usersLoading || users.length === 0}>
              {loading ? "Assigning…" : "Assign Task"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default AdminCreateTask;
