const dotenv = require("dotenv");
dotenv.config(); // Must be first

const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");
const taskRoutes         = require("./routes/taskRoutes");
const authRoutes         = require("./routes/authRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const commentRoutes      = require("./routes/commentRoutes");

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded files statically with inline disposition header
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res) => {
      res.setHeader("Content-Disposition", "inline");
    },
  })
);

app.get("/", (req, res) => {
  res.send("Task Management API Running...");
});

app.use("/api/tasks", taskRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/notifications", notificationRoutes);
// Nested: /api/tasks/:taskId/comments
app.use("/api/tasks/:taskId/comments", commentRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
