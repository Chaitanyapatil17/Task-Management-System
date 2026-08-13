const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // "comment"         — user-written message
    // "status_change"   — auto-logged when status changes
    // "assignment"      — auto-logged when task is assigned
    // "attachment"      — auto-logged when files are uploaded
    type: {
      type: String,
      enum: ["comment", "status_change", "assignment", "attachment"],
      default: "comment",
    },

    // The human-readable message (user text or auto-generated)
    text: {
      type: String,
      required: true,
      trim: true,
    },

    // Extra metadata for activity entries (e.g. old/new status)
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Comment", commentSchema);
