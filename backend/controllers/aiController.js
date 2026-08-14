const {
  processAIChat,
  getProactiveGreeting,
  breakDownTaskIntoSubtasks,
  gatherContext,
} = require("../services/aiService");
const Task = require("../models/Task");
const User = require("../models/User");

// Helper to get full user details
const resolveUser = async (reqUser) => {
  if (!reqUser) return { id: null, name: "User", role: "user" };
  try {
    const userDoc = await User.findById(reqUser.id || reqUser._id).select("name email role _id").lean();
    if (userDoc) return userDoc;
  } catch {
    // fallback
  }
  return {
    id: reqUser.id || reqUser._id,
    role: reqUser.role || "user",
    name: reqUser.role === "admin" ? "Admin" : "User",
  };
};

/**
 * @desc Handle chat query from user or admin
 * @route POST /api/ai/chat
 * @access Private
 */
const chatWithAI = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const fullUser = await resolveUser(req.user);
    const result = await processAIChat(message.trim(), fullUser, history || []);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in chatWithAI controller:", error);
    return res.status(500).json({
      success: false,
      message: "Internal AI processing error",
      error: error.message,
    });
  }
};

/**
 * @desc Get proactive role-based greeting & suggestion chips
 * @route GET /api/ai/greeting
 * @access Private
 */
const getGreeting = async (req, res) => {
  try {
    const fullUser = await resolveUser(req.user);
    const greetingData = await getProactiveGreeting(fullUser);
    return res.status(200).json({
      success: true,
      data: greetingData,
    });
  } catch (error) {
    console.error("Error in getGreeting controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load proactive greeting",
      error: error.message,
    });
  }
};

/**
 * @desc Generate subtasks for a task
 * @route POST /api/ai/generate-subtasks
 * @access Private
 */
const generateSubtasks = async (req, res) => {
  try {
    const { taskId, title, description, autoApply } = req.body;
    const fullUser = await resolveUser(req.user);

    let taskTitle = title;
    let taskDesc = description;
    let targetTask = null;

    if (taskId) {
      targetTask = await Task.findById(taskId);
      if (targetTask) {
        taskTitle = taskTitle || targetTask.title;
        taskDesc = taskDesc || targetTask.description;
      }
    }

    if (!taskTitle) {
      return res.status(400).json({
        success: false,
        message: "Task title is required to generate subtasks",
      });
    }

    const subtasks = await breakDownTaskIntoSubtasks(taskTitle, taskDesc, fullUser);

    if (autoApply && targetTask) {
      subtasks.forEach((st) => {
        targetTask.subtasks.push({ title: st, completed: false });
      });
      await targetTask.save();
    }

    return res.status(200).json({
      success: true,
      data: {
        taskId: targetTask?._id || taskId,
        subtasks,
        applied: !!(autoApply && targetTask),
      },
    });
  } catch (error) {
    console.error("Error in generateSubtasks controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate subtasks",
      error: error.message,
    });
  }
};

/**
 * @desc Get AI Insights & Workload Analytics
 * @route GET /api/ai/insights
 * @access Private
 */
const getAIInsights = async (req, res) => {
  try {
    const fullUser = await resolveUser(req.user);
    const context = await gatherContext(fullUser);
    return res.status(200).json({
      success: true,
      data: context,
    });
  } catch (error) {
    console.error("Error in getAIInsights controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch AI insights",
      error: error.message,
    });
  }
};

module.exports = {
  chatWithAI,
  getGreeting,
  generateSubtasks,
  getAIInsights,
};
