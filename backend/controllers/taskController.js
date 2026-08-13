const path = require("path");
const mongoose = require("mongoose");
const Task = require("../models/Task");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Comment = require("../models/Comment");
const cloudinary = require("../config/cloudinary");
const {
  sendTaskAssignedEmail,
  sendTaskCompletedEmail,
} = require("../services/emailService");

// =========================
// Helper: Check for circular dependencies
// =========================
const hasCircularDependency = async (taskId, prerequisiteId) => {
  // Check if adding prerequisiteId as a dependency of taskId would create a cycle
  // This means checking if taskId is already a prerequisite of prerequisiteId (directly or transitively)
  
  const visited = new Set();
  
  const checkDependencies = async (currentTaskId) => {
    if (visited.has(currentTaskId.toString())) {
      return false; // Already checked, no cycle found in this path
    }
    
    visited.add(currentTaskId.toString());
    
    if (currentTaskId.toString() === taskId.toString()) {
      return true; // Found a cycle
    }
    
    const currentTask = await Task.findById(currentTaskId).select("prerequisites");
    if (!currentTask || !currentTask.prerequisites || currentTask.prerequisites.length === 0) {
      return false;
    }
    
    for (const prereqId of currentTask.prerequisites) {
      if (await checkDependencies(prereqId)) {
        return true;
      }
    }
    
    return false;
  };
  
  return await checkDependencies(prerequisiteId);
};

// =========================
// Helper: Get all prerequisite tasks (with full details)
// =========================
const getPrerequisiteDetails = async (taskId) => {
  const task = await Task.findById(taskId)
    .populate({
      path: "prerequisites",
      select: "title status priority dueDate assignedTo",
      populate: {
        path: "assignedTo",
        select: "name email",
      },
    });
  
  return task?.prerequisites || [];
};

// =========================
// Helper: Check if all prerequisites are completed
// =========================
const areAllPrerequisitesCompleted = async (taskId) => {
  const task = await Task.findById(taskId).select("prerequisites");
  
  if (!task || !task.prerequisites || task.prerequisites.length === 0) {
    return true; // No prerequisites = all completed
  }
  
  const prerequisites = await Task.find({ _id: { $in: task.prerequisites } }).select("status");
  
  return prerequisites.every((prereq) => prereq.status === "Done");
};

// =========================
// Helper: Get incomplete prerequisites
// =========================
const getIncompletePrerequisites = async (taskId) => {
  const task = await Task.findById(taskId).select("prerequisites");
  
  if (!task || !task.prerequisites || task.prerequisites.length === 0) {
    return [];
  }
  
  const incompletePrereqs = await Task.find({
    _id: { $in: task.prerequisites },
    status: { $ne: "Done" },
  }).select("title status priority assignedTo");
  
  return incompletePrereqs;
};

// =========================
// Create Task
// POST /api/tasks
// =========================
const createTask = async (req, res) => {
  try {
    const { title, description, status, assignedTo, priority, dueDate } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    let taskUser;
    if (req.user.role === "admin") {
      if (!assignedTo) {
        return res.status(400).json({ success: false, message: "Please assign the task to a user" });
      }
      taskUser = assignedTo;
    } else {
      taskUser = req.user.id;
    }

    // Build attachments array — works for both Cloudinary and local disk uploads
    const attachments = (req.files || []).map((file) => ({
      filename:   file.originalname,
      storedName: file.filename,                          // public_id (Cloudinary) or filename on disk
      mimetype:   file.mimetype,
      size:       file.size,
      url:        file.path || null,                      // Cloudinary secure URL, or null for disk
      publicId:   file.filename || null,                  // Cloudinary public_id, or null for disk
    }));

    const task = await Task.create({
      title, description, status,
      assignedTo: taskUser,
      priority: priority || "Medium",
      dueDate: dueDate || null,
      attachments,
    });
    const populatedTask = await task.populate("assignedTo", "name email");

    if (req.user.role === "admin") {
      await Notification.create({
        recipient: taskUser,
        type: "task_assigned",
        message: `New task assigned to you: "${title}"`,
        task: task._id,
      });

      // Auto-log assignment activity
      await Comment.create({
        task:   task._id,
        author: req.user.id,
        type:   "assignment",
        text:   `Task assigned to ${populatedTask.assignedTo.name}`,
      });
      try {
        const assignedUser = populatedTask.assignedTo;
        await sendTaskAssignedEmail({
          userName: assignedUser.name,
          userEmail: assignedUser.email,
          taskTitle: populatedTask.title,
          taskDescription: populatedTask.description,
          taskStatus: populatedTask.status,
          attachmentCount: attachments.length,
        });
      } catch (emailError) {
        console.error("Failed to send task assignment email:", emailError.message);
      }
    }

    res.status(201).json({ success: true, message: "Task created successfully", data: populatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================
// Get All Tasks
// GET /api/tasks
// =========================
const getTasks = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      const tasks = await Task.find({ assignedTo: req.user.id })
        .populate("assignedTo", "name email")
        .sort({ createdAt: -1 });
      return res.status(200).json({ success: true, data: tasks });
    }

    const { page = 1, limit = 10, search = "", status = "", assignedTo = "" } = req.query;
    const pageNum  = Math.max(1, parseInt(page,  10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip     = (pageNum - 1) * limitNum;

    let searchUserIds = null;
    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: "i" };
      const matchingUsers = await User.find({ $or: [{ name: regex }, { email: regex }] }).select("_id");
      searchUserIds = matchingUsers.map((u) => u._id);
    }

    const buildMatch = () => {
      const match = {};
      if (status) match.status = status;
      if (assignedTo) match.assignedTo = new mongoose.Types.ObjectId(assignedTo);
      if (search.trim()) {
        const titleRegex = { $regex: search.trim(), $options: "i" };
        const conditions = [{ title: titleRegex }];
        if (searchUserIds && searchUserIds.length > 0) {
          conditions.push({ assignedTo: { $in: searchUserIds } });
        }
        match.$or = conditions;
      }
      return match;
    };

    const matchStage = buildMatch();

    const statsAgg = await Task.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const stats = { total: 0, pending: 0, inProgress: 0, done: 0 };
    statsAgg.forEach(({ _id, count }) => {
      stats.total += count;
      if (_id === "Pending")     stats.pending    = count;
      if (_id === "In Progress") stats.inProgress = count;
      if (_id === "Done")        stats.done       = count;
    });

    const [totalFiltered, tasks] = await Promise.all([
      Task.countDocuments(matchStage),
      Task.find(matchStage)
        .populate("assignedTo", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
    ]);

    const totalPages = Math.ceil(totalFiltered / limitNum);

    return res.status(200).json({
      success: true,
      data: tasks,
      stats,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages || 1,
        totalTasks: totalFiltered,
        limit: limitNum,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================
// Update Task
// PUT /api/tasks/:id
// =========================
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id).populate("assignedTo", "name email");

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }
    if (req.user.role !== "admin" && task.assignedTo._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "You can only edit your own tasks" });
    }

    const previousStatus = task.status;
    const newAttachments = (req.files || []).map((file) => ({
      filename:   file.originalname,
      storedName: file.filename,
      mimetype:   file.mimetype,
      size:       file.size,
      url:        file.path || null,
      publicId:   file.filename || null,
    }));

    // ── Validate dependencies before status change ──
    const newStatus = req.body.status;
    if (newStatus && newStatus !== previousStatus && newStatus !== "Pending") {
      // Trying to change to "In Progress" or "Done"
      const incompletePrereqs = await getIncompletePrerequisites(id);
      
      if (incompletePrereqs.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot change status to "${newStatus}" - ${incompletePrereqs.length} prerequisite task(s) must be completed first`,
          incompletePrerequisites: incompletePrereqs.map((p) => ({
            id: p._id,
            title: p.title,
            status: p.status,
          })),
        });
      }
    }

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      {
        title: req.body.title,
        description: req.body.description,
        status: req.body.status,
        priority: req.body.priority,
        dueDate: req.body.dueDate || null,
        $push: { attachments: { $each: newAttachments } },
      },
      { new: true, runValidators: true }
    ).populate("assignedTo", "name email");

    const isNowDone = req.body.status === "Done" && previousStatus !== "Done";
    const completedByUser = req.user.role !== "admin";

    // Auto-log status change activity (any status transition)
    if (req.body.status && req.body.status !== previousStatus) {
      await Comment.create({
        task:   id,
        author: req.user.id,
        type:   "status_change",
        text:   `Status changed from "${previousStatus}" to "${req.body.status}"`,
        meta:   { from: previousStatus, to: req.body.status },
      });
    }

    if (isNowDone && completedByUser) {
      const admins = await User.find({ role: "admin" }).select("name email _id");
      const completingUser = updatedTask.assignedTo;

      await Notification.insertMany(
        admins.map((admin) => ({
          recipient: admin._id,
          type: "task_completed",
          message: `"${updatedTask.title}" was marked as Done by ${completingUser.name}`,
          task: updatedTask._id,
        }))
      );

      try {
        await Promise.all(
          admins.map((admin) =>
            sendTaskCompletedEmail({
              adminEmail: admin.email,
              adminName: admin.name,
              userName: completingUser.name,
              taskTitle: updatedTask.title,
              taskDescription: updatedTask.description,
            })
          )
        );
      } catch (emailError) {
        console.error("Failed to send task completion email:", emailError.message);
      }
    }

    res.status(200).json({ success: true, message: "Task updated successfully", data: updatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================
// Delete Task
// DELETE /api/tasks/:id
// =========================
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }
    if (req.user.role !== "admin" && task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "You can only delete your own tasks" });
    }

    await Task.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================
// Get Task By ID
// GET /api/tasks/:id
// =========================
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "name email")
      .populate({
        path: "prerequisites",
        select: "title status priority dueDate assignedTo",
        populate: {
          path: "assignedTo",
          select: "name email",
        },
      });
    
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }
    
    res.status(200).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================
// Analytics
// GET /api/tasks/analytics  (admin only)
// =========================
const getAnalytics = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Run all aggregations in parallel
    const [statusBreakdown, tasksPerDay, tasksPerUser, completionPerDay] = await Promise.all([
      // 1. Status counts
      Task.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),

      // 2. Created per day (last 30 days)
      Task.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // 3. Per-user breakdown (top 10)
      Task.aggregate([
        {
          $group: {
            _id: "$assignedTo",
            total:      { $sum: 1 },
            pending:    { $sum: { $cond: [{ $eq: ["$status", "Pending"] },     1, 0] } },
            inProgress: { $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] } },
            done:       { $sum: { $cond: [{ $eq: ["$status", "Done"] },        1, 0] } },
          },
        },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
        { $unwind: "$user" },
        { $project: { name: "$user.name", email: "$user.email", total: 1, pending: 1, inProgress: 1, done: 1 } },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]),

      // 4. Completed per day (last 30 days)
      Task.aggregate([
        { $match: { status: "Done", updatedAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Build summary totals
    const totals = { total: 0, pending: 0, inProgress: 0, done: 0 };
    statusBreakdown.forEach(({ _id, count }) => {
      totals.total += count;
      if (_id === "Pending")     totals.pending    = count;
      if (_id === "In Progress") totals.inProgress = count;
      if (_id === "Done")        totals.done       = count;
    });
    totals.completionRate = totals.total > 0 ? Math.round((totals.done / totals.total) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        totals,
        statusBreakdown: statusBreakdown.map((s) => ({ name: s._id, value: s.count })),
        tasksPerDay,
        tasksPerUser,
        completionPerDay,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================
// Delete Attachment
// DELETE /api/tasks/:id/attachments/:attachmentId
// =========================
const deleteAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // Access control
    if (req.user.role !== "admin" && task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const attachment = task.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ success: false, message: "Attachment not found" });
    }

    // Delete from Cloudinary using publicId
    if (attachment.publicId) {
      try {
        // Determine resource type: images vs raw files
        const isImage = attachment.mimetype && attachment.mimetype.startsWith("image/");
        await cloudinary.uploader.destroy(attachment.publicId, {
          resource_type: isImage ? "image" : "raw",
        });
      } catch (cloudErr) {
        // Log but don't block — remove from DB regardless
        console.error("Cloudinary delete error:", cloudErr.message);
      }
    }

    // Remove from MongoDB subdocument array
    task.attachments.pull(attachmentId);
    await task.save();

    res.status(200).json({ success: true, message: "Attachment deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================
// User Dashboard Stats
// GET /api/tasks/dashboard/stats
// =========================
const getUserDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all tasks assigned to the user
    const tasks = await Task.find({ assignedTo: userId });

    // Calculate statistics
    const stats = {
      total: tasks.length,
      pending: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
    };

    const now = new Date();

    tasks.forEach((task) => {
      if (task.status === "Pending") stats.pending++;
      else if (task.status === "In Progress") stats.inProgress++;
      else if (task.status === "Done") stats.completed++;

      // Check if task is overdue (due date passed and not completed)
      if (
        task.dueDate &&
        new Date(task.dueDate) < now &&
        task.status !== "Done"
      ) {
        stats.overdue++;
      }
    });

    // Calculate completion rate
    stats.completionRate =
      stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    // Get recent tasks (last 5)
    const recentTasks = tasks
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map((task) => ({
        _id: task._id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
      }));

    res.status(200).json({
      success: true,
      data: {
        stats,
        recentTasks,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================
// Add Prerequisites to Task
// POST /api/tasks/:id/prerequisites
// =========================
const addPrerequisites = async (req, res) => {
  try {
    const { id } = req.params;
    const { prerequisiteIds } = req.body;

    // Validate prerequisiteIds
    if (!Array.isArray(prerequisiteIds)) {
      return res.status(400).json({
        success: false,
        message: "prerequisiteIds must be an array",
      });
    }

    if (prerequisiteIds.length === 0) {
      // No prerequisites to add, just return the task
      const task = await Task.findById(id)
        .populate("assignedTo", "name email")
        .populate({
          path: "prerequisites",
          select: "title status priority dueDate assignedTo",
          populate: { path: "assignedTo", select: "name email" },
        });
      return res.status(200).json({
        success: true,
        message: "No prerequisites to add",
        data: task,
      });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // Only admins can add prerequisites
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can add task prerequisites",
      });
    }

    // Validate and filter prerequisite IDs
    const validPrerequisiteIds = [];
    for (const prereqId of prerequisiteIds) {
      // Skip if empty or invalid ObjectId
      if (!prereqId || typeof prereqId !== "string" || prereqId.trim() === "") {
        continue;
      }

      // Check if prerequisite exists
      const prereqTask = await Task.findById(prereqId);
      if (!prereqTask) {
        return res.status(404).json({
          success: false,
          message: `Prerequisite task ${prereqId} not found`,
        });
      }

      // Prevent self-dependency
      if (prereqId.toString() === id.toString()) {
        return res.status(400).json({
          success: false,
          message: "A task cannot be its own prerequisite",
        });
      }

      // Check for circular dependency
      const isCircular = await hasCircularDependency(id, prereqId);
      if (isCircular) {
        return res.status(400).json({
          success: false,
          message: `Adding this prerequisite would create a circular dependency`,
        });
      }

      // Prevent duplicate prerequisites
      if (!task.prerequisites.some((p) => p.toString() === prereqId.toString())) {
        validPrerequisiteIds.push(prereqId);
      }
    }

    // Add valid prerequisites
    if (validPrerequisiteIds.length > 0) {
      task.prerequisites.push(...validPrerequisiteIds);
      await task.save();
    }

    const updatedTask = await task.populate({
      path: "prerequisites",
      select: "title status priority dueDate assignedTo",
      populate: {
        path: "assignedTo",
        select: "name email",
      },
    });

    res.status(200).json({
      success: true,
      message: "Prerequisites added successfully",
      data: updatedTask,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================
// Remove Prerequisite from Task
// DELETE /api/tasks/:id/prerequisites/:prerequisiteId
// =========================
const removePrerequisite = async (req, res) => {
  try {
    const { id, prerequisiteId } = req.params;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // Only admins can remove prerequisites
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can remove task prerequisites",
      });
    }

    // Remove the prerequisite
    task.prerequisites = task.prerequisites.filter(
      (p) => p.toString() !== prerequisiteId.toString()
    );

    await task.save();

    const updatedTask = await task.populate({
      path: "prerequisites",
      select: "title status priority dueDate assignedTo",
      populate: {
        path: "assignedTo",
        select: "name email",
      },
    });

    res.status(200).json({
      success: true,
      message: "Prerequisite removed successfully",
      data: updatedTask,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Single export at the bottom ───────────────────────────────────────────────
module.exports = { createTask, getTasks, getTaskById, updateTask, deleteTask, getAnalytics, deleteAttachment, getUserDashboardStats, addPrerequisites, removePrerequisite };
