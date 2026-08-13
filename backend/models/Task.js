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

    // Task prerequisites/dependencies
    prerequisites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],

    // File attachments
    attachments: [
      {
        filename:   { type: String },      // original file name
        storedName: { type: String },      // Cloudinary public_id
        mimetype:   { type: String },
        size:       { type: Number },
        url:        { type: String },      // Cloudinary secure URL
        publicId:   { type: String },      // Cloudinary public_id for deletion
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Task", taskSchema);