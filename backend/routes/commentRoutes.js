const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const Comment = require("../models/Comment");
const Task = require("../models/Task");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { emitToTask, emitToUser } = require("../utils/socket");
const { sendMentionEmail } = require("../services/emailService");

const router = express.Router({ mergeParams: true }); // mergeParams gives us :taskId

// ─────────────────────────────────────────────────────────────
// GET /api/tasks/:taskId/comments
// Returns all comments, replies + activity for a task, oldest first
// ─────────────────────────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // Access control: admin sees all, user only sees their own task's comments
    if (req.user.role !== "admin" && task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const comments = await Comment.find({ task: req.params.taskId })
      .populate("author", "name email role avatar")
      .populate("mentions", "name email role avatar")
      .populate("reactions.users", "name email")
      .populate({
        path: "parentComment",
        select: "text author",
        populate: { path: "author", select: "name email" },
      })
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/tasks/:taskId/comments
// Add a comment or threaded reply to a task with @mentions & real-time broadcast
// ─────────────────────────────────────────────────────────────
router.post("/", protect, async (req, res) => {
  try {
    const { text, parentComment, mentions } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Comment text is required" });
    }

    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // Access control: admin or the assigned user can comment
    if (req.user.role !== "admin" && task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "You can only comment on your own tasks" });
    }

    let parentCommentDoc = null;
    if (parentComment) {
      parentCommentDoc = await Comment.findById(parentComment);
    }

    // Parse / validate mention IDs
    let mentionIds = [];
    if (Array.isArray(mentions)) {
      mentionIds = mentions.filter((m) => m && m.toString() !== req.user.id);
    }

    const comment = await Comment.create({
      task: req.params.taskId,
      author: req.user.id,
      type: parentComment ? "reply" : "comment",
      text: text.trim(),
      parentComment: parentComment || null,
      mentions: mentionIds,
    });

    const populated = await Comment.findById(comment._id)
      .populate("author", "name email role avatar")
      .populate("mentions", "name email role avatar")
      .populate("reactions.users", "name email")
      .populate({
        path: "parentComment",
        select: "text author",
        populate: { path: "author", select: "name email" },
      });

    // ── Emit Real-Time Socket Event to Task Room ──
    emitToTask(req.params.taskId, "comment:created", populated);

    // ── Trigger Notifications ──
    const notifiedUserIds = new Set();

    // 1. Notify Mentioned Users
    for (const mentionedId of mentionIds) {
      const mentionedUserIdStr = mentionedId.toString();
      if (mentionedUserIdStr !== req.user.id && !notifiedUserIds.has(mentionedUserIdStr)) {
        notifiedUserIds.add(mentionedUserIdStr);
        
        // Fetch mentioned user with preferences
        const mentionedUser = await User.findById(mentionedId).select("name email notificationPreferences");
        const prefs = mentionedUser?.notificationPreferences || {};

        // In-app notification (default true)
        if (prefs.inAppMentions !== false) {
          const notif = await Notification.create({
            recipient: mentionedId,
            sender: req.user.id,
            type: "mention",
            message: `${req.user.name} mentioned you in "${task.title}": "${text.slice(0, 80)}${text.length > 80 ? "…" : ""}"`,
            task: task._id,
            comment: comment._id,
          });
          const populatedNotif = await notif.populate("task", "title");
          emitToUser(mentionedId, "notification:new", populatedNotif);
        }

        // Email notification (default true)
        if (prefs.emailMentions !== false && mentionedUser?.email) {
          try {
            await sendMentionEmail({
              userName: mentionedUser.name,
              userEmail: mentionedUser.email,
              senderName: req.user.name,
              taskTitle: task.title,
              commentText: text,
              taskId: task._id,
            });
          } catch (err) {
            console.error(`Failed to send mention email to ${mentionedUser.email}:`, err.message);
          }
        }
      }
    }

    // 2. Notify Parent Comment Author (if reply)
    if (
      parentCommentDoc &&
      parentCommentDoc.author.toString() !== req.user.id &&
      !notifiedUserIds.has(parentCommentDoc.author.toString())
    ) {
      notifiedUserIds.add(parentCommentDoc.author.toString());
      const notif = await Notification.create({
        recipient: parentCommentDoc.author,
        sender: req.user.id,
        type: "comment_reply",
        message: `${req.user.name} replied to your comment on "${task.title}"`,
        task: task._id,
        comment: comment._id,
      });
      const populatedNotif = await notif.populate("task", "title");
      emitToUser(parentCommentDoc.author, "notification:new", populatedNotif);
    }

    // 3. Notify Task Assignee (if commenter is admin and assignee not notified yet)
    if (
      task.assignedTo &&
      task.assignedTo.toString() !== req.user.id &&
      !notifiedUserIds.has(task.assignedTo.toString())
    ) {
      notifiedUserIds.add(task.assignedTo.toString());
      const notif = await Notification.create({
        recipient: task.assignedTo,
        sender: req.user.id,
        type: "comment",
        message: `${req.user.name} commented on "${task.title}"`,
        task: task._id,
        comment: comment._id,
      });
      const populatedNotif = await notif.populate("task", "title");
      emitToUser(task.assignedTo, "notification:new", populatedNotif);
    }

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/tasks/:taskId/comments/:commentId/reactions
// Toggle emoji reaction (👍, ❤️, 🎉, 🚀, 👀, 🔥, etc.) on a comment
// ─────────────────────────────────────────────────────────────
router.post("/:commentId/reactions", protect, async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji || !emoji.trim()) {
      return res.status(400).json({ success: false, message: "Emoji is required" });
    }

    const cleanEmoji = emoji.trim();
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    const userId = req.user.id;
    let existingReaction = comment.reactions.find((r) => r.emoji === cleanEmoji);

    if (existingReaction) {
      const userIndex = existingReaction.users.findIndex(
        (u) => u.toString() === userId
      );
      if (userIndex > -1) {
        // User already reacted -> remove reaction (toggle off)
        existingReaction.users.splice(userIndex, 1);
        if (existingReaction.users.length === 0) {
          comment.reactions = comment.reactions.filter((r) => r.emoji !== cleanEmoji);
        }
      } else {
        // Add user reaction
        existingReaction.users.push(userId);
      }
    } else {
      // Add new reaction entry
      comment.reactions.push({
        emoji: cleanEmoji,
        users: [userId],
      });
    }

    await comment.save();

    const populated = await Comment.findById(comment._id)
      .populate("author", "name email role avatar")
      .populate("mentions", "name email role avatar")
      .populate("reactions.users", "name email")
      .populate({
        path: "parentComment",
        select: "text author",
        populate: { path: "author", select: "name email" },
      });

    // Broadcast reaction change to task room
    emitToTask(req.params.taskId, "comment:reaction_updated", populated);

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/tasks/:taskId/comments/:commentId
// Edit an existing comment text (Author only)
// ─────────────────────────────────────────────────────────────
router.put("/:commentId", protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Comment text cannot be empty" });
    }

    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    if (comment.author.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "You can only edit your own comments" });
    }

    if (comment.type !== "comment" && comment.type !== "reply") {
      return res.status(400).json({ success: false, message: "Activity log entries cannot be edited" });
    }

    comment.text = text.trim();
    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();

    const populated = await Comment.findById(comment._id)
      .populate("author", "name email role avatar")
      .populate("mentions", "name email role avatar")
      .populate("reactions.users", "name email")
      .populate({
        path: "parentComment",
        select: "text author",
        populate: { path: "author", select: "name email" },
      });

    // Broadcast edit to task room
    emitToTask(req.params.taskId, "comment:updated", populated);

    res.status(200).json({ success: true, data: populated });
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

    // Only allow deleting user comments or replies, not auto-generated activity logs
    if (comment.type !== "comment" && comment.type !== "reply") {
      return res.status(400).json({ success: false, message: "Activity log entries cannot be deleted" });
    }

    // Delete comment and any nested replies to it
    await Comment.deleteMany({ parentComment: req.params.commentId });
    await Comment.findByIdAndDelete(req.params.commentId);

    // Broadcast delete event to task room
    emitToTask(req.params.taskId, "comment:deleted", {
      commentId: req.params.commentId,
      taskId: req.params.taskId,
    });

    res.status(200).json({ success: true, message: "Comment and any replies deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
