const Notification = require("../models/Notification");
const User = require("../models/User");
const {
  checkDueAndOverdueTasks,
  sendWeeklyProductivityDigest,
} = require("../services/reminderScheduler");

/**
 * Helper to compute date grouping bucket
 */
function getDateBucket(date) {
  const d = new Date(date);
  const now = new Date();
  
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (d >= startOfToday) return "Today";
  if (d >= startOfYesterday) return "Yesterday";
  if (d >= startOfWeek) return "Earlier this week";
  return "Older";
}

/**
 * GET /api/notifications
 * Fetch notifications with filters, grouping, search, and category counts.
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      filter = "all",
      search = "",
      groupBy = "none",
      page = 1,
      limit = 50,
    } = req.query;

    const query = { recipient: userId };

    // Apply Type / Status Filters
    if (filter === "unread") {
      query.read = false;
    } else if (filter === "mentions") {
      query.type = "mention";
    } else if (filter === "deadlines") {
      query.type = { $in: ["due_soon", "overdue"] };
    } else if (filter === "assignments") {
      query.type = { $in: ["task_assigned", "task_completed", "task_status_changed"] };
    } else if (filter === "comments") {
      query.type = { $in: ["comment", "comment_reply"] };
    } else if (filter === "system") {
      query.type = { $in: ["weekly_digest", "file_uploaded", "file_version_uploaded"] };
    }

    // Apply Search
    if (search.trim()) {
      query.message = { $regex: search.trim(), $options: "i" };
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Fetch notifications + counts in parallel
    const [notifications, totalFiltered, allUserNotifs] = await Promise.all([
      Notification.find(query)
        .populate("task", "title status priority dueDate")
        .populate("sender", "name email role avatar")
        .populate("comment", "text")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Notification.countDocuments(query),
      Notification.find({ recipient: userId }).select("type read"),
    ]);

    // Compute category counts for tabs
    const counts = {
      all: allUserNotifs.length,
      unread: allUserNotifs.filter((n) => !n.read).length,
      mentions: allUserNotifs.filter((n) => n.type === "mention").length,
      deadlines: allUserNotifs.filter((n) => n.type === "due_soon" || n.type === "overdue").length,
      assignments: allUserNotifs.filter((n) => ["task_assigned", "task_completed", "task_status_changed"].includes(n.type)).length,
      comments: allUserNotifs.filter((n) => ["comment", "comment_reply"].includes(n.type)).length,
      system: allUserNotifs.filter((n) => ["weekly_digest", "file_uploaded", "file_version_uploaded"].includes(n.type)).length,
    };

    // Apply Grouping if requested
    let groupedData = null;

    if (groupBy === "date") {
      groupedData = {
        Today: [],
        Yesterday: [],
        "Earlier this week": [],
        Older: [],
      };
      notifications.forEach((n) => {
        const bucket = getDateBucket(n.createdAt);
        if (groupedData[bucket]) {
          groupedData[bucket].push(n);
        } else {
          groupedData.Older.push(n);
        }
      });
    } else if (groupBy === "task") {
      const taskGroups = {};
      const noTaskGroup = [];

      notifications.forEach((n) => {
        if (n.task && n.task._id) {
          const taskId = n.task._id.toString();
          if (!taskGroups[taskId]) {
            taskGroups[taskId] = {
              task: n.task,
              notifications: [],
            };
          }
          taskGroups[taskId].notifications.push(n);
        } else {
          noTaskGroup.push(n);
        }
      });

      groupedData = {
        byTask: Object.values(taskGroups),
        general: noTaskGroup,
      };
    }

    res.status(200).json({
      success: true,
      data: notifications,
      grouped: groupedData,
      counts,
      unreadCount: counts.unread,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalFiltered / limitNum) || 1,
        totalItems: totalFiltered,
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/notifications/mark-all-read
 */
const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { read: true }
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/notifications/:id/read
 */
const markOneRead = async (req, res) => {
  try {
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { read: true },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/notifications/:id
 */
const deleteNotification = async (req, res) => {
  try {
    const deleted = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id,
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/notifications/clear-read
 */
const clearReadNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      recipient: req.user.id,
      read: true,
    });

    res.status(200).json({
      success: true,
      message: `Cleared ${result.deletedCount} read notifications`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/notifications/preferences
 */
const getPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("notificationPreferences");
    const defaultPrefs = {
      emailAssignments: true,
      emailMentions: true,
      emailDueSoon: true,
      emailOverdue: true,
      emailStatusChange: true,
      emailWeeklyDigest: true,
      inAppAssignments: true,
      inAppMentions: true,
      inAppDueSoon: true,
      inAppOverdue: true,
      inAppStatusChange: true,
    };

    const preferences = { ...defaultPrefs, ...(user?.notificationPreferences?.toObject() || {}) };

    res.status(200).json({ success: true, data: preferences });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/notifications/preferences
 */
const updatePreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.notificationPreferences = {
      ...(user.notificationPreferences?.toObject() || {}),
      ...req.body,
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: "Notification preferences updated successfully",
      data: user.notificationPreferences,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/notifications/check-reminders
 * Trigger manual scan of due soon and overdue tasks
 */
const checkRemindersManual = async (req, res) => {
  try {
    await checkDueAndOverdueTasks();
    res.status(200).json({
      success: true,
      message: "Due-date reminders and overdue checks processed successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/notifications/send-weekly-digest
 * Trigger manual dispatch of weekly productivity digest
 */
const sendWeeklyDigestManual = async (req, res) => {
  try {
    await sendWeeklyProductivityDigest();
    res.status(200).json({
      success: true,
      message: "Weekly productivity digest dispatched to users",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getNotifications,
  markAllRead,
  markOneRead,
  deleteNotification,
  clearReadNotifications,
  getPreferences,
  updatePreferences,
  checkRemindersManual,
  sendWeeklyDigestManual,
};
