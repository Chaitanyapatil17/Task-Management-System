const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Pending", "In Progress", "Done"],
      default: "Pending",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },

    dueDate: {
      type: Date,
      default: null,
    },

    startDate: {
      type: Date,
      default: null,
    },

    // Task prerequisites/dependencies
    prerequisites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],

    // File attachments with versioning
    attachments: [
      {
        filename:   { type: String },
        storedName: { type: String },
        mimetype:   { type: String },
        size:       { type: Number },
        url:        { type: String },
        publicId:   { type: String },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        version: {
          type: Number,
          default: 1,
        },
        fileGroupId: {
          type: String,
          default: null,
        },
        versionHistory: [
          {
            version:    { type: Number },
            filename:   { type: String },
            storedName: { type: String },
            mimetype:   { type: String },
            size:       { type: Number },
            url:        { type: String },
            publicId:   { type: String },
            uploadedAt: { type: Date, default: Date.now },
            uploadedBy: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
              default: null,
            },
            note: { type: String, default: "" },
          },
        ],
      },
    ],

    // Subtasks with progress tracking
    subtasks: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
        },
        completed: {
          type: Boolean,
          default: false,
        },
        completedAt: {
          type: Date,
          default: null,
        },
        assignedTo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
      },
    ],

    // Tags
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // Custom fields
    customFields: [
      {
        key: {
          type: String,
          required: true,
          trim: true,
        },
        value: {
          type: String,
          trim: true,
        },
      },
    ],

    // Archive
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      default: null,
    },

    // Recurring task
    recurrence: {
      enabled: {
        type: Boolean,
        default: false,
      },
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly", "yearly"],
        default: null,
      },
      interval: {
        type: Number,
        default: 1,
        min: 1,
      },
      endDate: {
        type: Date,
        default: null,
      },
      nextOccurrence: {
        type: Date,
        default: null,
      },
      parentTask: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
        default: null,
      },
    },

    // Template
    templateName: {
      type: String,
      trim: true,
      default: null,
    },

    // Automated reminder tracking
    reminderSent: {
      dueSoon: { type: Boolean, default: false },
      overdue: { type: Boolean, default: false },
      lastDueSoonAt: { type: Date, default: null },
      lastOverdueAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Task", taskSchema);