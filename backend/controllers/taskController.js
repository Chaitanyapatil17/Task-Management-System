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
// Helpers
// =========================
const hasCircularDependency = async (taskId, prerequisiteId) => {
  const visited = new Set();
  const checkDependencies = async (currentTaskId) => {
    if (visited.has(currentTaskId.toString())) return false;
    visited.add(currentTaskId.toString());
    if (currentTaskId.toString() === taskId.toString()) return true;
    const currentTask = await Task.findById(currentTaskId).select("prerequisites");
    if (!currentTask || !currentTask.prerequisites || currentTask.prerequisites.length === 0) return false;
    for (const prereqId of currentTask.prerequisites) {
      if (await checkDependencies(prereqId)) return true;
    }
    return false;
  };
  return await checkDependencies(prerequisiteId);
};

const areAllPrerequisitesCompleted = async (taskId) => {
  const task = await Task.findById(taskId).select("prerequisites");
  if (!task || !task.prerequisites || task.prerequisites.length === 0) return true;
  const prerequisites = await Task.find({ _id: { $in: task.prerequisites } }).select("status");
  return prerequisites.every((prereq) => prereq.status === "Done");
};

const getIncompletePrerequisites = async (taskId) => {
  const task = await Task.findById(taskId).select("prerequisites");
  if (!task || !task.prerequisites || task.prerequisites.length === 0) return [];
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
    const { title, description, status, assignedTo, priority, dueDate, startDate, tags, customFields, recurrence, templateName } = req.body;

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

    const attachments = (req.files || []).map((file) => ({
      filename:   file.originalname,
      storedName: file.filename,
      mimetype:   file.mimetype,
      size:       file.size,
      url:        file.path || null,
      publicId:   file.filename || null,
    }));

    const parsedTags = Array.isArray(tags) ? tags.filter((t) => t && t.trim()) : [];
    const parsedCustomFields = Array.isArray(customFields)
      ? customFields.filter((f) => f && f.key && f.key.trim()).map((f) => ({ key: f.key.trim(), value: (f.value || "").trim() }))
      : [];
    const parsedRecurrence = recurrence && recurrence.enabled
      ? {
          enabled: true,
          frequency: recurrence.frequency || null,
          interval: recurrence.interval || 1,
          endDate: recurrence.endDate || null,
          nextOccurrence: recurrence.nextOccurrence || null,
        }
      : { enabled: false };

    const task = await Task.create({
      title, description, status,
      assignedTo: taskUser,
      priority: priority || "Medium",
      dueDate: dueDate || null,
      startDate: startDate || null,
      tags: parsedTags,
      customFields: parsedCustomFields,
      recurrence: parsedRecurrence,
      templateName: templateName || null,
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
      const tasks = await Task.find({ assignedTo: req.user.id, isArchived: { $ne: true } })
        .populate("assignedTo", "name email")
        .sort({ createdAt: -1 });
      return res.status(200).json({ success: true, data: tasks });
    }

    const { page = 1, limit = 10, search = "", status = "", assignedTo = "", tags = "", archived = "false", startDate = "", endDate = "" } = req.query;
    const pageNum  = Math.max(1, parseInt(page,  10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip     = (pageNum - 1) * limitNum;

    const match = {};

    if (archived === "true") {
      match.isArchived = true;
    } else {
      match.$or = [{ isArchived: false }, { isArchived: { $exists: false } }];
    }

    if (status) match.status = status;
    if (assignedTo) match.assignedTo = new mongoose.Types.ObjectId(assignedTo);

    if (tags) {
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        match.tags = { $in: tagList };
      }
    }

    if (startDate) {
      match.createdAt = { ...(match.createdAt || {}), $gte: new Date(startDate) };
    }
    if (endDate) {
      match.createdAt = { ...(match.createdAt || {}), $lte: new Date(endDate) };
    }

    let searchUserIds = null;
    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: "i" };
      const matchingUsers = await User.find({ $or: [{ name: regex }, { email: regex }] }).select("_id");
      searchUserIds = matchingUsers.map((u) => u._id);
      const titleRegex = { $regex: search.trim(), $options: "i" };
      const conditions = [{ title: titleRegex }];
      if (searchUserIds && searchUserIds.length > 0) {
        conditions.push({ assignedTo: { $in: searchUserIds } });
      }
      match.$and = match.$and || [];
      match.$and.push({ $or: conditions });
    }

    const [totalFiltered, tasks] = await Promise.all([
      Task.countDocuments(match),
      Task.find(match)
        .populate("assignedTo", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
    ]);

    const statsAgg = await Task.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const stats = { total: 0, pending: 0, inProgress: 0, done: 0 };
    statsAgg.forEach(({ _id, count }) => {
      stats.total += count;
      if (_id === "Pending")     stats.pending    = count;
      if (_id === "In Progress") stats.inProgress = count;
      if (_id === "Done")        stats.done       = count;
    });

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

    const newStatus = req.body.status;
    if (newStatus && newStatus !== previousStatus && newStatus !== "Pending") {
      const incompletePrereqs = await getIncompletePrerequisites(id);
      if (incompletePrereqs.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot change status to "${newStatus}" - ${incompletePrereqs.length} prerequisite task(s) must be completed first`,
          incompletePrerequisites: incompletePrereqs.map((p) => ({ id: p._id, title: p.title, status: p.status })),
        });
      }
    }

    const updatePayload = {
      title: req.body.title,
      description: req.body.description,
      status: req.body.status,
      priority: req.body.priority,
      dueDate: req.body.dueDate || null,
      startDate: req.body.startDate || null,
    };

    if (req.body.tags !== undefined) {
      updatePayload.tags = Array.isArray(req.body.tags) ? req.body.tags.filter((t) => t && t.trim()) : [];
    }
    if (req.body.customFields !== undefined) {
      updatePayload.customFields = Array.isArray(req.body.customFields)
        ? req.body.customFields.filter((f) => f && f.key && f.key.trim()).map((f) => ({ key: f.key.trim(), value: (f.value || "").trim() }))
        : [];
    }
    if (req.body.recurrence !== undefined) {
      const r = req.body.recurrence;
      updatePayload.recurrence = r && r.enabled
        ? { enabled: true, frequency: r.frequency || null, interval: r.interval || 1, endDate: r.endDate || null, nextOccurrence: r.nextOccurrence || null }
        : { enabled: false };
    }
    if (req.body.templateName !== undefined) {
      updatePayload.templateName = req.body.templateName || null;
    }
    if (newAttachments.length > 0) {
      updatePayload.$push = { attachments: { $each: newAttachments } };
    }

    const updatedTask = await Task.findByIdAndUpdate(id, updatePayload, { new: true, runValidators: true }).populate("assignedTo", "name email");

    const isNowDone = req.body.status === "Done" && previousStatus !== "Done";
    const completedByUser = req.user.role !== "admin";

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
        populate: { path: "assignedTo", select: "name email" },
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
// GET /api/tasks/analytics
// =========================
const getAnalytics = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [statusBreakdown, tasksPerDay, tasksPerUser, completionPerDay] = await Promise.all([
      Task.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Task.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
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
      Task.aggregate([
        { $match: { status: "Done", updatedAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

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

    if (req.user.role !== "admin" && task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const attachment = task.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ success: false, message: "Attachment not found" });
    }

    if (attachment.publicId) {
      try {
        const isImage = attachment.mimetype && attachment.mimetype.startsWith("image/");
        await cloudinary.uploader.destroy(attachment.publicId, {
          resource_type: isImage ? "image" : "raw",
        });
      } catch (cloudErr) {
        console.error("Cloudinary delete error:", cloudErr.message);
      }
    }

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
    const tasks = await Task.find({ assignedTo: userId, isArchived: { $ne: true } });

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

      if (
        task.dueDate &&
        new Date(task.dueDate) < now &&
        task.status !== "Done"
      ) {
        stats.overdue++;
      }
    });

    stats.completionRate =
      stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

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
      data: { stats, recentTasks },
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

    if (!Array.isArray(prerequisiteIds)) {
      return res.status(400).json({ success: false, message: "prerequisiteIds must be an array" });
    }

    if (prerequisiteIds.length === 0) {
      const task = await Task.findById(id)
        .populate("assignedTo", "name email")
        .populate({ path: "prerequisites", select: "title status priority dueDate assignedTo", populate: { path: "assignedTo", select: "name email" } });
      return res.status(200).json({ success: true, message: "No prerequisites to add", data: task });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admins can add task prerequisites" });
    }

    const validPrerequisiteIds = [];
    for (const prereqId of prerequisiteIds) {
      if (!prereqId || typeof prereqId !== "string" || prereqId.trim() === "") continue;
      const prereqTask = await Task.findById(prereqId);
      if (!prereqTask) {
        return res.status(404).json({ success: false, message: `Prerequisite task ${prereqId} not found` });
      }
      if (prereqId.toString() === id.toString()) {
        return res.status(400).json({ success: false, message: "A task cannot be its own prerequisite" });
      }
      const isCircular = await hasCircularDependency(id, prereqId);
      if (isCircular) {
        return res.status(400).json({ success: false, message: "Adding this prerequisite would create a circular dependency" });
      }
      if (!task.prerequisites.some((p) => p.toString() === prereqId.toString())) {
        validPrerequisiteIds.push(prereqId);
      }
    }

    if (validPrerequisiteIds.length > 0) {
      task.prerequisites.push(...validPrerequisiteIds);
      await task.save();
    }

    const updatedTask = await task.populate({
      path: "prerequisites",
      select: "title status priority dueDate assignedTo",
      populate: { path: "assignedTo", select: "name email" },
    });

    res.status(200).json({ success: true, message: "Prerequisites added successfully", data: updatedTask });
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
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admins can remove task prerequisites" });
    }

    task.prerequisites = task.prerequisites.filter(
      (p) => p.toString() !== prerequisiteId.toString()
    );
    await task.save();

    const updatedTask = await task.populate({
      path: "prerequisites",
      select: "title status priority dueDate assignedTo",
      populate: { path: "assignedTo", select: "name email" },
    });

    res.status(200).json({ success: true, message: "Prerequisite removed successfully", data: updatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================
// Subtasks
// =========================

// POST /api/tasks/:id/subtasks
const addSubtask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Subtask title is required" });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (req.user.role !== "admin" && task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    task.subtasks.push({ title: title.trim() });
    await task.save();

    const updatedTask = await Task.findById(id).populate("assignedTo", "name email");
    res.status(200).json({ success: true, message: "Subtask added", data: updatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/tasks/:id/subtasks/:subtaskId
const updateSubtask = async (req, res) => {
  try {
    const { id, subtaskId } = req.params;
    const { title, completed, assignedTo } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (req.user.role !== "admin" && task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const subtask = task.subtasks.id(subtaskId);
    if (!subtask) {
      return res.status(404).json({ success: false, message: "Subtask not found" });
    }

    if (title !== undefined) subtask.title = title.trim();
    if (completed !== undefined) {
      subtask.completed = completed;
      subtask.completedAt = completed ? new Date() : null;
    }
    if (assignedTo !== undefined) {
      subtask.assignedTo = assignedTo || null;
    }

    await task.save();
    const updatedTask = await Task.findById(id).populate("assignedTo", "name email");
    res.status(200).json({ success: true, message: "Subtask updated", data: updatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/tasks/:id/subtasks/:subtaskId
const deleteSubtask = async (req, res) => {
  try {
    const { id, subtaskId } = req.params;
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (req.user.role !== "admin" && task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    task.subtasks = task.subtasks.filter((s) => s._id.toString() !== subtaskId.toString());
    await task.save();

    const updatedTask = await Task.findById(id).populate("assignedTo", "name email");
    res.status(200).json({ success: true, message: "Subtask deleted", data: updatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================
// Tags
// =========================

// POST /api/tasks/:id/tags
const addTags = async (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (req.user.role !== "admin" && task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const newTags = Array.isArray(tags) ? tags.filter((t) => t && t.trim()) : [];
    const existingLower = new Set(task.tags.map((t) => t.toLowerCase()));
    const uniqueNew = newTags.filter((t) => !existingLower.has(t.toLowerCase()));
    task.tags.push(...uniqueNew);
    await task.save();

    const updatedTask = await Task.findById(id).populate("assignedTo", "name email");
    res.status(200).json({ success: true, message: "Tags added", data: updatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/tasks/:id/tags
const removeTags = async (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (req.user.role !== "admin" && task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const tagsToRemove = Array.isArray(tags) ? tags.map((t) => t.trim().toLowerCase()).filter(Boolean) : [];
    task.tags = task.tags.filter((t) => !tagsToRemove.includes(t.toLowerCase()));
    await task.save();

    const updatedTask = await Task.findById(id).populate("assignedTo", "name email");
    res.status(200).json({ success: true, message: "Tags removed", data: updatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================
// Archive / Restore
// =========================

// POST /api/tasks/:id/archive
const archiveTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (req.user.role !== "admin" && task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    task.isArchived = true;
    task.archivedAt = new Date();
    await task.save();

    res.status(200).json({ success: true, message: "Task archived", data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/tasks/:id/restore
const restoreTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (req.user.role !== "admin" && task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    task.isArchived = false;
    task.archivedAt = null;
    await task.save();

    res.status(200).json({ success: true, message: "Task restored", data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================
// Bulk Actions
// POST /api/tasks/bulk
// =========================
const bulkActions = async (req, res) => {
  try {
    const { taskIds, action } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ success: false, message: "taskIds array is required" });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admins can perform bulk actions" });
    }

    const tasks = await Task.find({ _id: { $in: taskIds } });
    if (tasks.length === 0) {
      return res.status(404).json({ success: false, message: "No matching tasks found" });
    }

    switch (action) {
      case "delete":
        await Task.deleteMany({ _id: { $in: taskIds } });
        return res.status(200).json({ success: true, message: `${tasks.length} task(s) deleted` });

      case "archive":
        await Task.updateMany({ _id: { $in: taskIds } }, { isArchived: true, archivedAt: new Date() });
        return res.status(200).json({ success: true, message: `${tasks.length} task(s) archived` });

      case "restore":
        await Task.updateMany({ _id: { $in: taskIds } }, { isArchived: false, archivedAt: null });
        return res.status(200).json({ success: true, message: `${tasks.length} task(s) restored` });

      case "markDone":
        await Task.updateMany({ _id: { $in: taskIds } }, { status: "Done" });
        return res.status(200).json({ success: true, message: `${tasks.length} task(s) marked as Done` });

      case "markPending":
        await Task.updateMany({ _id: { $in: taskIds } }, { status: "Pending" });
        return res.status(200).json({ success: true, message: `${tasks.length} task(s) marked as Pending` });

      default:
        return res.status(400).json({ success: false, message: `Unknown action: ${action}` });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================
// Templates
// =========================

// GET /api/tasks/templates
const getTemplates = async (req, res) => {
  try {
    const templates = await Task.find({ templateName: { $ne: null, $ne: "" } })
      .select("title description priority tags customFields subtasks templateName")
      .sort({ templateName: 1 });

    const grouped = templates.reduce((acc, t) => {
      const name = t.templateName || "Uncategorized";
      if (!acc[name]) acc[name] = [];
      acc[name].push(t);
      return acc;
    }, {});

    res.status(200).json({ success: true, data: grouped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/tasks/templates
const createTemplate = async (req, res) => {
  try {
    const { title, description, priority, tags, customFields, subtasks, templateName } = req.body;

    if (!title || !title.trim() || !templateName || !templateName.trim()) {
      return res.status(400).json({ success: false, message: "Title and template name are required" });
    }

    const template = await Task.create({
      title: title.trim(),
      description: description || "",
      priority: priority || "Medium",
      status: "Pending",
      assignedTo: req.user.id,
      tags: Array.isArray(tags) ? tags.filter((t) => t && t.trim()) : [],
      customFields: Array.isArray(customFields)
        ? customFields.filter((f) => f && f.key && f.key.trim()).map((f) => ({ key: f.key.trim(), value: (f.value || "").trim() }))
        : [],
      subtasks: Array.isArray(subtasks)
        ? subtasks.filter((s) => s && s.title && s.title.trim()).map((s) => ({ title: s.title.trim(), completed: false }))
        : [],
      templateName: templateName.trim(),
      isArchived: true,
    });

    res.status(201).json({ success: true, message: "Template created", data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/tasks/from-template
const createFromTemplate = async (req, res) => {
  try {
    const { templateId, title, assignedTo, dueDate, startDate, status } = req.body;

    if (!templateId) {
      return res.status(400).json({ success: false, message: "templateId is required" });
    }

    const template = await Task.findById(templateId);
    if (!template || !template.templateName) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }

    const taskUser = req.user.role === "admin" ? assignedTo : req.user.id;
    if (req.user.role === "admin" && !assignedTo) {
      return res.status(400).json({ success: false, message: "Please assign the task to a user" });
    }

    const task = await Task.create({
      title: title || template.title,
      description: template.description,
      status: status || "Pending",
      assignedTo: taskUser,
      priority: template.priority,
      dueDate: dueDate || null,
      startDate: startDate || null,
      tags: template.tags,
      customFields: template.customFields,
      subtasks: template.subtasks.map((s) => ({ title: s.title, completed: false })),
      attachments: [],
    });

    const populatedTask = await task.populate("assignedTo", "name email");

    if (req.user.role === "admin") {
      await Notification.create({
        recipient: taskUser,
        type: "task_assigned",
        message: `New task assigned from template: "${task.title}"`,
        task: task._id,
      });
      await Comment.create({
        task:   task._id,
        author: req.user.id,
        type:   "assignment",
        text:   `Task created from template "${template.templateName}" and assigned to ${populatedTask.assignedTo.name}`,
      });
    }

    res.status(201).json({ success: true, message: "Task created from template", data: populatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================
// Calendar
// GET /api/tasks/calendar
// =========================
const getCalendarTasks = async (req, res) => {
  try {
    const { start, end, assignedTo } = req.query;

    if (!start || !end) {
      return res.status(400).json({ success: false, message: "start and end query parameters are required" });
    }

    const match = {
      isArchived: { $ne: true },
      dueDate: {
        $gte: new Date(start),
        $lte: new Date(end),
      },
    };

    if (req.user.role !== "admin") {
      match.assignedTo = req.user.id;
    } else if (assignedTo) {
      match.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }

    const tasks = await Task.find(match)
      .populate("assignedTo", "name email")
      .sort({ dueDate: 1 });

    res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================
// Kanban
// GET /api/tasks/kanban
// =========================
const getKanbanTasks = async (req, res) => {
  try {
    const match = { isArchived: { $ne: true } };

    if (req.user.role !== "admin") {
      match.assignedTo = req.user.id;
    }

    const tasks = await Task.find(match)
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });

    const grouped = {
      Pending: [],
      "In Progress": [],
      Done: [],
    };

    tasks.forEach((t) => {
      if (grouped[t.status]) {
        grouped[t.status].push(t);
      } else {
        grouped.Pending.push(t);
      }
    });

    res.status(200).json({ success: true, data: grouped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getAnalytics,
  deleteAttachment,
  getUserDashboardStats,
  addPrerequisites,
  removePrerequisite,
  addSubtask,
  updateSubtask,
  deleteSubtask,
  addTags,
  removeTags,
  archiveTask,
  restoreTask,
  bulkActions,
  getTemplates,
  createTemplate,
  createFromTemplate,
  getCalendarTasks,
  getKanbanTasks,
};
