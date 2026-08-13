import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

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

export const getNotifications = () => API.get("/notifications");
export const markAllRead = () => API.put("/notifications/mark-all-read");
export const markOneRead = (id) => API.put(`/notifications/${id}/read`);

export const createTaskWithFiles = (data, files = []) => {
  const fd = new FormData();
  fd.append("title", data.title);
  fd.append("description", data.description || "");
  fd.append("status", data.status);
  if (data.assignedTo) fd.append("assignedTo", data.assignedTo);
  if (data.priority)   fd.append("priority",   data.priority);
  if (data.dueDate)    fd.append("dueDate",    data.dueDate);
  if (data.startDate)  fd.append("startDate",  data.startDate);
  if (data.tags)       fd.append("tags",       JSON.stringify(data.tags));
  if (data.customFields) fd.append("customFields", JSON.stringify(data.customFields));
  if (data.recurrence) fd.append("recurrence", JSON.stringify(data.recurrence));
  if (data.templateName) fd.append("templateName", data.templateName);
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
  if (data.startDate   !== undefined) fd.append("startDate",   data.startDate || "");
  if (data.tags)        fd.append("tags",        JSON.stringify(data.tags));
  if (data.customFields) fd.append("customFields", JSON.stringify(data.customFields));
  if (data.recurrence)  fd.append("recurrence",  JSON.stringify(data.recurrence));
  if (data.templateName !== undefined) fd.append("templateName", data.templateName || "");
  files.forEach((f) => fd.append("attachments", f));
  return API.put(`/tasks/${id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
};

export const addSubtask = (taskId, title) => API.post(`/tasks/${taskId}/subtasks`, { title });
export const updateSubtask = (taskId, subtaskId, data) => API.put(`/tasks/${taskId}/subtasks/${subtaskId}`, data);
export const deleteSubtask = (taskId, subtaskId) => API.delete(`/tasks/${taskId}/subtasks/${subtaskId}`);

export const addTags = (taskId, tags) => API.post(`/tasks/${taskId}/tags`, { tags });
export const removeTags = (taskId, tags) => API.delete(`/tasks/${taskId}/tags`, { data: { tags } });

export const archiveTask = (id) => API.post(`/tasks/${id}/archive`);
export const restoreTask = (id) => API.post(`/tasks/${id}/restore`);

export const bulkAction = (taskIds, action) => API.post("/tasks/bulk", { taskIds, action });

export const getTemplates = () => API.get("/tasks/templates");
export const createTemplate = (data) => API.post("/tasks/templates", data);
export const createFromTemplate = (data) => API.post("/tasks/from-template", data);

export const getKanbanTasks = () => API.get("/tasks/kanban");
export const getCalendarTasks = (start, end, assignedTo) => API.get(`/tasks/calendar?start=${start}&end=${end}${assignedTo ? `&assignedTo=${assignedTo}` : ""}`);

API.getNotifications = getNotifications;
API.markAllRead = markAllRead;
API.markOneRead = markOneRead;
API.createTaskWithFiles = createTaskWithFiles;
API.updateTaskWithFiles = updateTaskWithFiles;
API.addSubtask = addSubtask;
API.updateSubtask = updateSubtask;
API.deleteSubtask = deleteSubtask;
API.addTags = addTags;
API.removeTags = removeTags;
API.archiveTask = archiveTask;
API.restoreTask = restoreTask;
API.bulkAction = bulkAction;
API.getTemplates = getTemplates;
API.createTemplate = createTemplate;
API.createFromTemplate = createFromTemplate;
API.getKanbanTasks = getKanbanTasks;
API.getCalendarTasks = getCalendarTasks;

export default API;
