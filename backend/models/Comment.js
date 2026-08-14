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

    // Activity & message types
    type: {
      type: String,
      enum: [
        "comment",
        "reply",
        "status_change",
        "assignment",
        "attachment",
        "attachment_version",
        "priority_change",
        "due_date_change",
        "subtask_change",
        "dependency_change",
        "archive_change",
      ],
      default: "comment",
    },

    // Optional parent comment for threaded replies
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },

    // The human-readable message (user text or auto-generated)
    text: {
      type: String,
      required: true,
      trim: true,
    },

    // Mentioned users in this comment
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Emoji reactions: e.g. [{ emoji: "👍", users: [userId1, userId2] }]
    reactions: [
      {
        emoji: {
          type: String,
          required: true,
          trim: true,
        },
        users: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
      },
    ],

    // Edit tracking
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
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
