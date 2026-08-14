const Task = require("../models/Task");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { emitToUser } = require("../utils/socket");
const {
  sendDueSoonEmail,
  sendOverdueEmail,
  sendWeeklyDigestEmail,
} = require("./emailService");

/**
 * Scan for tasks that are due soon (within 24 hours) or overdue,
 * and dispatch in-app notifications and email alerts according to user preferences.
 */
async function checkDueAndOverdueTasks() {
  try {
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Fetch active non-done tasks with due dates
    const tasks = await Task.find({
      isArchived: false,
      status: { $ne: "Done" },
      dueDate: { $ne: null },
    }).populate("assignedTo", "name email notificationPreferences");

    for (const task of tasks) {
      if (!task.assignedTo) continue;

      const user = task.assignedTo;
      const userPrefs = user.notificationPreferences || {};
      const dueDate = new Date(task.dueDate);

      // Initialize reminder tracking if missing
      if (!task.reminderSent) {
        task.reminderSent = { dueSoon: false, overdue: false };
      }

      // ── 1. Due Soon (Within 24 hours) ──
      if (dueDate >= now && dueDate <= next24h && !task.reminderSent.dueSoon) {
        // In-App Notification (default: true)
        if (userPrefs.inAppDueSoon !== false) {
          const notif = await Notification.create({
            recipient: user._id,
            type: "due_soon",
            message: `Upcoming deadline: "${task.title}" is due on ${dueDate.toLocaleDateString()}`,
            task: task._id,
            metadata: { dueDate: task.dueDate, priority: task.priority },
          });

          emitToUser(user._id, "notification:new", notif);
        }

        // Email Alert (default: true)
        if (userPrefs.emailDueSoon !== false && user.email) {
          try {
            await sendDueSoonEmail({
              userName: user.name,
              userEmail: user.email,
              taskTitle: task.title,
              dueDate: task.dueDate,
              taskId: task._id,
            });
          } catch (emailErr) {
            console.error(`Failed to send due soon email to ${user.email}:`, emailErr.message);
          }
        }

        task.reminderSent.dueSoon = true;
        task.reminderSent.lastDueSoonAt = new Date();
        await task.save();
      }

      // ── 2. Overdue (Past Due Date) ──
      else if (dueDate < now && !task.reminderSent.overdue) {
        // In-App Notification (default: true)
        if (userPrefs.inAppOverdue !== false) {
          const notif = await Notification.create({
            recipient: user._id,
            type: "overdue",
            message: `🚨 Task overdue: "${task.title}" has passed its deadline (${dueDate.toLocaleDateString()})`,
            task: task._id,
            metadata: { dueDate: task.dueDate, priority: task.priority },
          });

          emitToUser(user._id, "notification:new", notif);
        }

        // Email Alert (default: true)
        if (userPrefs.emailOverdue !== false && user.email) {
          try {
            await sendOverdueEmail({
              userName: user.name,
              userEmail: user.email,
              taskTitle: task.title,
              dueDate: task.dueDate,
              taskId: task._id,
            });
          } catch (emailErr) {
            console.error(`Failed to send overdue email to ${user.email}:`, emailErr.message);
          }
        }

        task.reminderSent.overdue = true;
        task.reminderSent.lastOverdueAt = new Date();
        await task.save();
      }
    }
  } catch (err) {
    console.error("Error running due/overdue reminder check:", err);
  }
}

/**
 * Generates and sends a weekly productivity digest to all active users.
 */
async function sendWeeklyProductivityDigest() {
  try {
    const users = await User.find({}).select("name email role notificationPreferences");
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekRange = `${oneWeekAgo.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

    for (const user of users) {
      const userPrefs = user.notificationPreferences || {};
      if (userPrefs.emailWeeklyDigest === false) continue;

      const userTasks = await Task.find({
        assignedTo: user._id,
        isArchived: false,
      });

      const completedCount = userTasks.filter((t) => t.status === "Done").length;
      const inProgressCount = userTasks.filter((t) => t.status === "In Progress").length;
      const pendingCount = userTasks.filter((t) => t.status === "Pending").length;
      const overdueCount = userTasks.filter((t) => t.status !== "Done" && t.dueDate && new Date(t.dueDate) < now).length;

      // In-app digest notification
      const notif = await Notification.create({
        recipient: user._id,
        type: "weekly_digest",
        message: `📊 Weekly Productivity Digest: ${completedCount} completed, ${inProgressCount} in progress, ${overdueCount} overdue.`,
        metadata: { completedCount, inProgressCount, pendingCount, overdueCount, weekRange },
      });
      emitToUser(user._id, "notification:new", notif);

      // Email Digest
      if (user.email) {
        try {
          await sendWeeklyDigestEmail({
            userName: user.name,
            userEmail: user.email,
            completedCount,
            pendingCount,
            inProgressCount,
            overdueCount,
            weekRange,
          });
        } catch (emailErr) {
          console.error(`Failed to send weekly digest email to ${user.email}:`, emailErr.message);
        }
      }
    }
  } catch (err) {
    console.error("Error generating weekly productivity digest:", err);
  }
}

/**
 * Starts the background interval job on server startup.
 */
function startReminderScheduler() {
  // Initial check after 10 seconds of server startup
  setTimeout(() => {
    checkDueAndOverdueTasks();
  }, 10000);

  // Run due & overdue checks every 15 minutes
  setInterval(() => {
    checkDueAndOverdueTasks();
  }, 15 * 60 * 1000);
}

module.exports = {
  checkDueAndOverdueTasks,
  sendWeeklyProductivityDigest,
  startReminderScheduler,
};
