const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Optional — Google OAuth users have no password
    password: {
      type: String,
      minlength: 6,
      default: null,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // Populated for Google OAuth accounts
    googleId: {
      type: String,
      default: null,
      sparse: true, // allows null for non-Google accounts
    },

    // Profile picture from Google
    avatar: {
      type: String,
      default: null,
    },

    // Notification Channel & Event Preferences
    notificationPreferences: {
      emailAssignments:  { type: Boolean, default: true },
      emailMentions:     { type: Boolean, default: true },
      emailDueSoon:      { type: Boolean, default: true },
      emailOverdue:      { type: Boolean, default: true },
      emailStatusChange: { type: Boolean, default: true },
      emailWeeklyDigest: { type: Boolean, default: true },
      inAppAssignments:  { type: Boolean, default: true },
      inAppMentions:     { type: Boolean, default: true },
      inAppDueSoon:      { type: Boolean, default: true },
      inAppOverdue:      { type: Boolean, default: true },
      inAppStatusChange: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
