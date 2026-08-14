const express = require("express");
const {
  chatWithAI,
  getGreeting,
  generateSubtasks,
  getAIInsights,
} = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All AI routes require authentication
router.post("/chat", protect, chatWithAI);
router.get("/greeting", protect, getGreeting);
router.post("/generate-subtasks", protect, generateSubtasks);
router.get("/insights", protect, getAIInsights);

module.exports = router;
