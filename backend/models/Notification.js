const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // Who receives this notification
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["task_assigned", "task_completed"],
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
