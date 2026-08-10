const express = require("express");

const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();


// ========================================
// USER + ADMIN
// ========================================

// Get all tasks
router.get("/", protect, getTasks);

// Get single task
router.get("/:id", protect, getTaskById);

// Create task
router.post("/", protect, createTask);


// ========================================
// ADMIN ONLY
// ========================================

// Update task
router.put("/:id", protect, adminOnly, updateTask);

// Delete task
router.delete("/:id", protect, adminOnly, deleteTask);


module.exports = router;