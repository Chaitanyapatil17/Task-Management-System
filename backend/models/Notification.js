const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // Who receives this notification
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Who sent/triggered this notification (optional)
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    type: {
      type: String,
      enum: [
        "task_assigned",
        "task_completed",
        "task_status_changed",
        "task_updated",
        "mention",
        "comment",
        "comment_reply",
        "file_uploaded",
        "file_version_uploaded",
        "due_soon",
        "overdue",
        "weekly_digest",
      ],
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    // Link to the related task
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },

    // Link to the related comment (optional)
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },

    // Extra metadata (e.g. dueDate, stats, custom payload)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Notification", notificationSchema);
