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

// Notifications Endpoints
export const getNotifications = () => API.get("/notifications");
export const getNotificationList = (params = {}) => {
  const q = new URLSearchParams();
  if (params.filter) q.set("filter", params.filter);
  if (params.groupBy) q.set("groupBy", params.groupBy);
  if (params.search) q.set("search", params.search);
  if (params.page) q.set("page", params.page);
  if (params.limit) q.set("limit", params.limit);
  return API.get(`/notifications?${q.toString()}`);
};
export const markAllRead = () => API.put("/notifications/mark-all-read");
export const markOneRead = (id) => API.put(`/notifications/${id}/read`);
export const deleteNotification = (id) => API.delete(`/notifications/${id}`);
export const clearReadNotifications = () => API.delete("/notifications/clear-read");

export const getNotificationPreferences = () => API.get("/notifications/preferences");
export const updateNotificationPreferences = (data) => API.put("/notifications/preferences", data);
export const triggerCheckReminders = () => API.post("/notifications/check-reminders");
export const triggerSendWeeklyDigest = () => API.post("/notifications/send-weekly-digest");

// Collaboration & Presence Endpoints
export const getCollaborators = () => API.get("/auth/collaborators");
export const getPresenceStatus = () => API.get("/auth/presence");

// Comments & Reactions
export const getTaskComments = (taskId) => API.get(`/tasks/${taskId}/comments`);
export const postTaskComment = (taskId, data) => API.post(`/tasks/${taskId}/comments`, data);
export const reactToComment = (taskId, commentId, emoji) => API.post(`/tasks/${taskId}/comments/${commentId}/reactions`, { emoji });
export const editTaskComment = (taskId, commentId, text) => API.put(`/tasks/${taskId}/comments/${commentId}`, { text });
export const deleteTaskComment = (taskId, commentId) => API.delete(`/tasks/${taskId}/comments/${commentId}`);

// Attachment Versioning
export const uploadAttachmentVersion = (taskId, attachmentId, file, note = "") => {
  const fd = new FormData();
  fd.append("file", file);
  if (note) fd.append("note", note);
  return API.post(`/tasks/${taskId}/attachments/${attachmentId}/version`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const getAttachmentVersions = (taskId, attachmentId) => API.get(`/tasks/${taskId}/attachments/${attachmentId}/versions`);

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

// AI Copilot Endpoints
export const sendAIChat = (message, history = []) => API.post("/ai/chat", { message, history });
export const getAIGreeting = () => API.get("/ai/greeting");
export const generateSubtasksAI = (data) => API.post("/ai/generate-subtasks", data);
export const getAIInsights = () => API.get("/ai/insights");

API.getNotifications = getNotifications;
API.getNotificationList = getNotificationList;
API.markAllRead = markAllRead;
API.markOneRead = markOneRead;
API.deleteNotification = deleteNotification;
API.clearReadNotifications = clearReadNotifications;
API.getNotificationPreferences = getNotificationPreferences;
API.updateNotificationPreferences = updateNotificationPreferences;
API.triggerCheckReminders = triggerCheckReminders;
API.triggerSendWeeklyDigest = triggerSendWeeklyDigest;
API.getCollaborators = getCollaborators;
API.getPresenceStatus = getPresenceStatus;
API.getTaskComments = getTaskComments;
API.postTaskComment = postTaskComment;
API.reactToComment = reactToComment;
API.editTaskComment = editTaskComment;
API.deleteTaskComment = deleteTaskComment;
API.uploadAttachmentVersion = uploadAttachmentVersion;
API.getAttachmentVersions = getAttachmentVersions;
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
API.sendAIChat = sendAIChat;
API.getAIGreeting = getAIGreeting;
API.generateSubtasksAI = generateSubtasksAI;
API.getAIInsights = getAIInsights;

export default API;
