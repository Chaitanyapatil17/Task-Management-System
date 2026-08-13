import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// Attach JWT token to every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Notification helpers ──────────────────────────────────────────
export const getNotifications = () => API.get("/notifications");

export const markAllRead = () => API.put("/notifications/mark-all-read");

export const markOneRead = (id) => API.put(`/notifications/${id}/read`);

// ── File-upload helpers ───────────────────────────────────────────
// Wraps a plain formData object + optional File[] into multipart/form-data
export const createTaskWithFiles = (data, files = []) => {
  const fd = new FormData();
  fd.append("title", data.title);
  fd.append("description", data.description || "");
  fd.append("status", data.status);
  if (data.assignedTo) fd.append("assignedTo", data.assignedTo);
  if (data.priority)   fd.append("priority",   data.priority);
  if (data.dueDate)    fd.append("dueDate",    data.dueDate);
  files.forEach((f) => fd.append("attachments", f));
  return API.post("/tasks", fd, { headers: { "Content-Type": "multipart/form-data" } });
};

export const updateTaskWithFiles = (id, data, files = []) => {
  const fd = new FormData();
  if (data.title       !== undefined) fd.append("title",       data.title);
  if (data.description !== undefined) fd.append("description", data.description);
  if (data.status      !== undefined) fd.append("status",      data.status);
  if (data.priority    !== undefined) fd.append("priority",    data.priority);
  if (data.dueDate     !== undefined) fd.append("dueDate",     data.dueDate || "");
  files.forEach((f) => fd.append("attachments", f));
  return API.put(`/tasks/${id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
};

export default API;
