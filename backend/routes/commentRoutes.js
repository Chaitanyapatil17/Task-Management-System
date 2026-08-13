const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const Comment = require("../models/Comment");
const Task    = require("../models/Task");

const router = express.Router({ mergeParams: true }); // mergeParams gives us :taskId

// ─────────────────────────────────────────────────────────────
// GET /api/tasks/:taskId/comments
// Returns all comments + activity for a task, oldest first
// ─────────────────────────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    // Access control: admin sees all, user only sees their own task's comments
    if (req.user.role !== "admin" && task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const comments = await Comment.find({ task: req.params.taskId })
      .populate("author", "name email role")
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/tasks/:taskId/comments
// Add a comment to a task
// ─────────────────────────────────────────────────────────────
router.post("/", protect, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Comment text is required" });
    }

    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    // Access control: admin or the assigned user can comment
    if (req.user.role !== "admin" && task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "You can only comment on your own tasks" });
    }

    const comment = await Comment.create({
      task:   req.params.taskId,
      author: req.user.id,
      type:   "comment",
      text:   text.trim(),
    });

    const populated = await comment.populate("author", "name email role");

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/tasks/:taskId/comments/:commentId
// Only the author or an admin can delete a comment
// ─────────────────────────────────────────────────────────────
router.delete("/:commentId", protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    const isOwner = comment.author.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "You can only delete your own comments" });
    }

    // Only allow deleting user comments, not auto-generated activity logs
    if (comment.type !== "comment") {
      return res.status(400).json({ success: false, message: "Activity log entries cannot be deleted" });
    }

    await Comment.findByIdAndDelete(req.params.commentId);
    res.status(200).json({ success: true, message: "Comment deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
