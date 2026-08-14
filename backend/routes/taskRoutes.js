const express = require("express");
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getAnalytics,
  deleteAttachment,
  uploadAttachmentVersion,
  getAttachmentVersions,
  getUserDashboardStats,
  addPrerequisites,
  removePrerequisite,
  addSubtask,
  updateSubtask,
  deleteSubtask,
  addTags,
  removeTags,
  archiveTask,
  restoreTask,
  bulkActions,
  getTemplates,
  createTemplate,
  createFromTemplate,
  getCalendarTasks,
  getKanbanTasks,
} = require("../controllers/taskController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../config/multer");

const router = express.Router();

// Dashboard stats route — must be before /:id
router.get("/dashboard/stats", protect, getUserDashboardStats);

// Analytics must be before /:id so it isn't matched as an id
router.get("/analytics", protect, getAnalytics);

// Kanban
router.get("/kanban", protect, getKanbanTasks);

// Calendar
router.get("/calendar", protect, getCalendarTasks);

// Templates
router.get("/templates", protect, getTemplates);
router.post("/templates", protect, createTemplate);
router.post("/from-template", protect, createFromTemplate);

// Bulk actions
router.post("/bulk", protect, bulkActions);

router.get("/",    protect, getTasks);
router.get("/:id", protect, getTaskById);
router.post("/",   protect, upload.array("attachments", 5), createTask);
router.put("/:id", protect, upload.array("attachments", 5), updateTask);
router.delete("/:id", protect, deleteTask);

// Attachment management & Versioning
router.delete("/:id/attachments/:attachmentId", protect, deleteAttachment);
router.post("/:id/attachments/:attachmentId/version", protect, upload.single("file"), uploadAttachmentVersion);
router.get("/:id/attachments/:attachmentId/versions", protect, getAttachmentVersions);

// Prerequisites management
router.post("/:id/prerequisites", protect, addPrerequisites);
router.delete("/:id/prerequisites/:prerequisiteId", protect, removePrerequisite);

// Subtasks
router.post("/:id/subtasks", protect, addSubtask);
router.put("/:id/subtasks/:subtaskId", protect, updateSubtask);
router.delete("/:id/subtasks/:subtaskId", protect, deleteSubtask);

// Tags
router.post("/:id/tags", protect, addTags);
router.delete("/:id/tags", protect, removeTags);

// Archive / Restore
router.post("/:id/archive", protect, archiveTask);
router.post("/:id/restore", protect, restoreTask);

module.exports = router;
