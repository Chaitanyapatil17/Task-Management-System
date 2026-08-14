const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getNotifications,
  markAllRead,
  markOneRead,
  deleteNotification,
  clearReadNotifications,
  getPreferences,
  updatePreferences,
  checkRemindersManual,
  sendWeeklyDigestManual,
} = require("../controllers/notificationController");

const router = express.Router();

// Preferences
router.get("/preferences", protect, getPreferences);
router.put("/preferences", protect, updatePreferences);

// Manual Triggers for reminders & weekly digest
router.post("/check-reminders", protect, checkRemindersManual);
router.post("/send-weekly-digest", protect, sendWeeklyDigestManual);

// Clear all read
router.delete("/clear-read", protect, clearReadNotifications);

// Mark all as read
router.put("/mark-all-read", protect, markAllRead);

// Notifications collection
router.get("/", protect, getNotifications);
router.put("/:id/read", protect, markOneRead);
router.delete("/:id", protect, deleteNotification);

module.exports = router;
