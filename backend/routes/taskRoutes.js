const express = require("express");
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getAnalytics,
  deleteAttachment,
  getUserDashboardStats,
  addPrerequisites,
  removePrerequisite,
} = require("../controllers/taskController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../config/multer");

const router = express.Router();

// Dashboard stats route — must be before /:id
router.get("/dashboard/stats", protect, getUserDashboardStats);

// Analytics must be before /:id so it isn't matched as an id
router.get("/analytics", protect, getAnalytics);

router.get("/",    protect, getTasks);
router.get("/:id", protect, getTaskById);
router.post("/",   protect, upload.array("attachments", 5), createTask);
router.put("/:id", protect, upload.array("attachments", 5), updateTask);
router.delete("/:id", protect, deleteTask);

// Attachment management
router.delete("/:id/attachments/:attachmentId", protect, deleteAttachment);

// Prerequisites management
router.post("/:id/prerequisites", protect, addPrerequisites);
router.delete("/:id/prerequisites/:prerequisiteId", protect, removePrerequisite);

module.exports = router;
