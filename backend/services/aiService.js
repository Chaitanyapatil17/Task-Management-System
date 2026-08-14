const { GoogleGenerativeAI } = require("@google/generative-ai");
const Task = require("../models/Task");
const User = require("../models/User");

// Initialize Gemini Client if key exists
const getGeminiModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) return null;
  try {
    const genAI = new GoogleGenerativeAI(apiKey.trim());
    return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  } catch (err) {
    console.error("Error initializing GoogleGenerativeAI:", err.message);
    return null;
  }
};

/**
 * Gather live database context based on user role
 */
const gatherContext = async (user) => {
  const userName = user?.name || (user?.role === "admin" ? "Admin" : "User");
  const userId = user?._id || user?.id;
  const isUserAdmin = user?.role === "admin";
  const now = new Date();

  if (isUserAdmin) {
    const [allUsers, allTasks] = await Promise.all([
      User.find().select("name email role _id").lean(),
      Task.find({ isArchived: false })
        .populate("assignedTo", "name email")
        .select("title description status priority dueDate assignedTo subtasks prerequisites")
        .lean(),
    ]);

    const stats = {
      total: allTasks.length,
      pending: allTasks.filter((t) => t.status === "Pending").length,
      inProgress: allTasks.filter((t) => t.status === "In Progress").length,
      done: allTasks.filter((t) => t.status === "Done").length,
      overdue: allTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "Done").length,
    };

    // User workload distribution
    const workload = {};
    allUsers.forEach((u) => {
      workload[u.name || "Unnamed"] = {
        userId: u._id,
        role: u.role || "user",
        pendingOrInProgress: 0,
        completed: 0,
      };
    });

    allTasks.forEach((t) => {
      const uName = t.assignedTo?.name || "Unassigned";
      if (workload[uName]) {
        if (t.status === "Done") workload[uName].completed += 1;
        else workload[uName].pendingOrInProgress += 1;
      }
    });

    const overdueList = allTasks
      .filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "Done")
      .map((t) => ({
        id: t._id,
        title: t.title,
        assignedTo: t.assignedTo?.name || "Unassigned",
        dueDate: t.dueDate,
        priority: t.priority || "Medium",
      }));

    return {
      role: "admin",
      userName,
      stats,
      workload,
      users: allUsers.map((u) => ({ id: u._id, name: u.name || "User", email: u.email, role: u.role })),
      recentTasks: allTasks.slice(0, 15).map((t) => ({
        id: t._id,
        title: t.title,
        status: t.status,
        priority: t.priority || "Medium",
        assignedTo: t.assignedTo?.name || "Unassigned",
        dueDate: t.dueDate,
      })),
      overdueList,
    };
  } else {
    // Regular user context
    const userTasks = await Task.find({ assignedTo: userId, isArchived: false })
      .populate("prerequisites", "title status")
      .select("title description status priority dueDate subtasks prerequisites createdAt")
      .sort({ priority: -1, dueDate: 1 })
      .lean();

    const pendingTasks = userTasks.filter((t) => t.status !== "Done");
    const overdueTasks = userTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "Done");

    return {
      role: "user",
      userName,
      tasksCount: userTasks.length,
      pendingCount: pendingTasks.length,
      overdueCount: overdueTasks.length,
      myTasks: userTasks.map((t) => ({
        id: t._id,
        title: t.title,
        description: t.description || "",
        status: t.status,
        priority: t.priority || "Medium",
        dueDate: t.dueDate,
        subtasks: (t.subtasks || []).map((s) => ({ title: s.title, completed: s.completed })),
        prerequisites: (t.prerequisites || []).map((p) => ({ title: p.title, status: p.status })),
      })),
    };
  }
};

/**
 * Intelligent Local Rule & Intent Engine (Offline Fallback & Fast Parsing)
 */
const processWithOfflineEngine = async (message, context, user) => {
  const lower = (message || "").toLowerCase().trim();
  const isAdmin = user?.role === "admin";
  const userName = user?.name || (isAdmin ? "Admin" : "User");

  // 1. ADMIN INTENT: Generic "Assign a new task to team" or "Assign task" without specifics
  if (isAdmin && (lower === "assign a new task to team" || lower === "assign task" || lower === "assign new task" || lower === "create task" || lower === "new task")) {
    const teamUsers = (context.users || []).filter((u) => u.role !== "admin" || context.users.length <= 2);
    let reply = `### 📋 How to Assign a Task via Chat\n\n`;
    reply += `You can type your assignment in plain English! For example:\n\n`;
    reply += `- \`Assign task 'Update Landing Page' to ${teamUsers[0]?.name || "User"} with High priority due tomorrow\`\n`;
    reply += `- \`Create task 'Fix API Validation' for ${teamUsers[1]?.name || teamUsers[0]?.name || "User"} with Critical priority\`\n\n`;

    if (teamUsers.length > 0) {
      reply += `**Available Team Members:**\n`;
      teamUsers.forEach((u) => {
        const load = context.workload?.[u.name]?.pendingOrInProgress || 0;
        reply += `- **${u.name}** (${load} active tasks)\n`;
      });
    }
    return { reply };
  }

  // 2. ADMIN INTENT: Recommend Assignee / Workload Inquiry
  if (isAdmin && (lower.includes("who is free") || lower.includes("recommend assignee") || lower.includes("workload") || lower.includes("assign to whom") || lower.includes("least busy"))) {
    const memberEntries = Object.entries(context.workload || {}).filter(([_, info]) => info.role !== "admin" || Object.keys(context.workload).length <= 2);
    memberEntries.sort((a, b) => a[1].pendingOrInProgress - b[1].pendingOrInProgress);

    if (memberEntries.length === 0) {
      return {
        reply: "Currently there are no other team members registered. You can add new members from the **Admin > Users** page.",
      };
    }

    const freest = memberEntries[0];
    let reply = `### 👥 Team Workload & Assignee Recommendations\n\n`;
    reply += `🌟 **Recommended Assignee**: **${freest[0]}** (currently has **${freest[1].pendingOrInProgress}** active tasks).\n\n`;
    reply += `**Current Team Distribution:**\n`;
    memberEntries.forEach(([name, info]) => {
      reply += `- **${name}**: ${info.pendingOrInProgress} active / ${info.completed} completed\n`;
    });
    reply += `\n*To assign, type: "Assign task [title] to ${freest[0]}"*`;
    return { reply };
  }

  // 3. ADMIN INTENT: Project Summary / Overdue / Bottlenecks / Team Health
  if (isAdmin && (lower.includes("summary") || lower.includes("overdue") || lower.includes("bottleneck") || lower.includes("report") || lower.includes("health") || lower.includes("status"))) {
    const { stats, overdueList } = context;
    let reply = `### 📊 Project & Team Health Summary\n\n`;
    reply += `- **Total Active Tasks**: ${stats.total}\n`;
    reply += `- ⏳ **Pending**: ${stats.pending}\n`;
    reply += `- ⚡ **In Progress**: ${stats.inProgress}\n`;
    reply += `- ✅ **Completed**: ${stats.done}\n`;
    reply += `- ⚠️ **Overdue Tasks**: ${stats.overdue}\n\n`;

    if (overdueList && overdueList.length > 0) {
      reply += `**🚨 Urgent Overdue Items:**\n`;
      overdueList.slice(0, 5).forEach((t) => {
        const dateStr = t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "No date";
        reply += `- **${t.title}** (${t.priority} Priority) — Assigned to *${t.assignedTo}* (Due: ${dateStr})\n`;
      });
    } else {
      reply += `🎉 **Great news!** There are currently no overdue tasks across the team.`;
    }
    return { reply };
  }

  // 4. ADMIN / USER INTENT: Create Specific Task ("Assign task X to Y", "Create task X")
  if (lower.startsWith("assign task") || lower.startsWith("create task") || lower.startsWith("add task") || lower.includes("assign task") || lower.includes("create task")) {
    let priority = "Medium";
    let dueDate = null;

    // Detect priority
    if (lower.includes("critical priority") || lower.includes("priority critical") || lower.includes("critical")) priority = "Critical";
    else if (lower.includes("high priority") || lower.includes("priority high") || lower.includes("high")) priority = "High";
    else if (lower.includes("low priority") || lower.includes("priority low") || lower.includes("low")) priority = "Low";

    // Detect Assignee
    const usersList = isAdmin ? (context.users || []) : [{ id: user?._id || user?.id, name: userName }];
    let targetUser = null;

    for (const u of usersList) {
      const uNameLower = (u.name || "").toLowerCase();
      if (uNameLower && (lower.includes(`to ${uNameLower}`) || lower.includes(`for ${uNameLower}`) || lower.includes(uNameLower))) {
        targetUser = u;
        break;
      }
    }

    if (!targetUser && usersList.length > 0) {
      targetUser = usersList[0];
    }

    // Extract Title cleanly
    let title = message
      .replace(/^(assign task|create task|add task|create a task|assign a task)\s+/i, "")
      .replace(/(to|for)\s+[a-zA-Z0-9_\-\s]+/i, "")
      .replace(/(with\s+)?(critical|high|medium|low)\s+priority/i, "")
      .replace(/due\s+(tomorrow|next week|today|friday|monday|[0-9\-\/]+)/i, "")
      .replace(/["']/g, "")
      .trim();

    if (!title || title.length < 2) {
      title = "New Assignment";
    }

    // Parse Due Date
    if (lower.includes("tomorrow")) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      dueDate = d.toISOString();
    } else if (lower.includes("next week")) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      dueDate = d.toISOString();
    }

    if (targetUser) {
      const targetUserId = targetUser.id || targetUser._id;
      const newTask = await Task.create({
        title,
        description: `Created via TMS AI Copilot by ${userName}`,
        status: "Pending",
        priority,
        assignedTo: targetUserId,
        dueDate: dueDate ? new Date(dueDate) : null,
      });

      return {
        reply: `✨ **Task Created Successfully!**\n\n- **Title**: ${newTask.title}\n- **Assigned To**: ${targetUser.name}\n- **Priority**: ${newTask.priority}\n- **Status**: ${newTask.status}\n- **Due Date**: ${dueDate ? new Date(dueDate).toLocaleDateString() : "Not set"}`,
        action: {
          type: "TASK_CREATED",
          task: {
            id: newTask._id,
            title: newTask.title,
            priority: newTask.priority,
            assignedTo: targetUser.name,
          },
        },
      };
    }
  }

  // 5. USER INTENT: Help with Particular Task
  if (!isAdmin && (lower.includes("help") || lower.includes("start") || lower.includes("how to") || lower.includes("guide") || lower.includes("particular task"))) {
    const myTasks = context.myTasks || [];
    if (myTasks.length === 0) {
      return {
        reply: "You currently don't have any assigned tasks! Take a well-deserved break or ask your Admin if there is new work to take up. 🚀",
      };
    }

    let selectedTask = myTasks[0];
    for (const t of myTasks) {
      if (t.title && lower.includes(t.title.toLowerCase())) {
        selectedTask = t;
        break;
      }
    }

    let reply = `### 💡 Task Roadmap & Action Plan for "${selectedTask.title}"\n\n`;
    reply += `**Priority**: ${selectedTask.priority} | **Status**: ${selectedTask.status}\n\n`;
    reply += `Here is a step-by-step strategy to complete this task efficiently:\n\n`;
    reply += `1. **Clarify Requirements & Inputs**: Review all task specifications, attachments, and prerequisites.\n`;
    reply += `2. **Set Up the Foundation**: Initialize any needed branch, components, or API endpoints.\n`;
    reply += `3. **Execute Core Implementation**: Work through the main logic systematically.\n`;
    reply += `4. **Test & Validate**: Check edge cases, error states, and responsive styling.\n`;
    reply += `5. **Mark as Done & Document**: Update subtasks, post progress comments, and move to Done.\n\n`;

    if (selectedTask.prerequisites && selectedTask.prerequisites.length > 0) {
      reply += `⚠️ **Note on Prerequisites:**\n`;
      selectedTask.prerequisites.forEach((p) => {
        reply += `- *${p.title}* (${p.status})\n`;
      });
      reply += `\n`;
    }

    reply += `*Type "Generate subtasks for ${selectedTask.title}" to automatically add checklist items!*`;
    return { reply };
  }

  // 6. USER INTENT: Generate Subtasks
  if (lower.includes("generate subtask") || lower.includes("break down") || lower.includes("subtasks for") || lower.includes("subtasks")) {
    const myTasks = context.myTasks || context.recentTasks || [];
    let targetTask = myTasks[0];

    for (const t of myTasks) {
      if (t.title && lower.includes(t.title.toLowerCase())) {
        targetTask = t;
        break;
      }
    }

    if (!targetTask) {
      return {
        reply: "Please specify which task you would like to break down into subtasks.",
      };
    }

    const defaultSubtasks = [
      `Review task requirements for "${targetTask.title}"`,
      `Set up initial module structure & interface`,
      `Implement business logic and API connections`,
      `Conduct manual testing & handle error conditions`,
      `Final review, documentation, and completion`,
    ];

    const dbTask = await Task.findById(targetTask.id || targetTask._id);
    if (dbTask) {
      defaultSubtasks.forEach((stTitle) => {
        dbTask.subtasks.push({ title: stTitle, completed: false });
      });
      await dbTask.save();
    }

    let reply = `### ✨ 5 Subtasks Added to "${targetTask.title}"\n\n`;
    defaultSubtasks.forEach((st, idx) => {
      reply += `${idx + 1}. [ ] ${st}\n`;
    });
    reply += `\n*The subtasks have been added directly to your task checklist!*`;

    return {
      reply,
      action: {
        type: "SUBTASKS_ADDED",
        taskId: targetTask.id || targetTask._id,
        subtasks: defaultSubtasks,
      },
    };
  }

  // 7. USER / ADMIN INTENT: Update Task Status
  if (lower.includes("mark") || lower.includes("update status") || lower.includes("move to")) {
    let newStatus = null;
    if (lower.includes("done") || lower.includes("complete") || lower.includes("finished")) newStatus = "Done";
    else if (lower.includes("in progress") || lower.includes("ongoing")) newStatus = "In Progress";
    else if (lower.includes("pending")) newStatus = "Pending";

    if (newStatus) {
      const taskList = isAdmin ? (context.recentTasks || []) : (context.myTasks || []);
      let matchedTask = null;

      for (const t of taskList) {
        if (t.title && lower.includes(t.title.toLowerCase())) {
          matchedTask = t;
          break;
        }
      }

      if (!matchedTask && taskList.length > 0) {
        matchedTask = taskList[0];
      }

      if (matchedTask) {
        await Task.findByIdAndUpdate(matchedTask.id || matchedTask._id, { status: newStatus });

        return {
          reply: `✅ **Status Updated!**\n\nTask **"${matchedTask.title}"** is now marked as **${newStatus}**.`,
          action: {
            type: "TASK_STATUS_UPDATED",
            taskId: matchedTask.id || matchedTask._id,
            status: newStatus,
          },
        };
      }
    }
  }

  // 8. USER INTENT: View My Tasks
  if (!isAdmin && (lower.includes("my tasks") || lower.includes("pending tasks") || lower.includes("what should i do"))) {
    const myTasks = context.myTasks || [];
    if (myTasks.length === 0) {
      return {
        reply: "You currently have 0 pending tasks! All caught up. 🚀",
      };
    }

    let reply = `### 📋 Your Current Tasks (${myTasks.length} Total)\n\n`;
    myTasks.forEach((t, i) => {
      const icon = t.status === "Done" ? "✅" : t.status === "In Progress" ? "⚡" : "⏳";
      const dueStr = t.dueDate ? `(Due: ${new Date(t.dueDate).toLocaleDateString()})` : "";
      reply += `${i + 1}. ${icon} **${t.title}** — *${t.priority} Priority* ${dueStr}\n`;
    });
    reply += `\n*Ask me "Help with [task title]" anytime to get a step-by-step implementation guide!*`;
    return { reply };
  }

  // Default Fallback
  if (isAdmin) {
    return {
      reply: `I am your **Admin Copilot**! Here is how I can assist:\n\n- ➕ **Assign Tasks**: *"Assign High priority task 'API Security Audit' to John due next week"*\n- 👥 **Workload Recommendations**: *"Who is free to take up a new task?"*\n- 📊 **Team Summary**: *"Give me a summary of overdue tasks and team progress"*\n- ⚡ **Update Status**: *"Mark task 'Database Setup' as Done"*\n\nDo you have any new work or tasks you'd like to assign right now?`,
    };
  } else {
    return {
      reply: `Hi **${userName}**! I am your **Productivity Copilot**! Here is how I can assist:\n\n- 💡 **Task Assistance**: *"How do I implement my active task?"*\n- ✨ **Subtasks Generator**: *"Break down my task into 5 subtasks"*\n- 📋 **View My Tasks**: *"Show my pending tasks"*\n- ✅ **Status Updates**: *"Mark 'Auth page' as In Progress"*\n\nDid you need me to help in a particular task today?`,
    };
  }
};

/**
 * Main AI Chat Processor (Gemini with Fallback)
 */
const processAIChat = async (message, user, chatHistory = []) => {
  const context = await gatherContext(user);
  const geminiModel = getGeminiModel();

  if (!geminiModel) {
    return await processWithOfflineEngine(message, context, user);
  }

  try {
    const isUserAdmin = user?.role === "admin";
    const userName = user?.name || (isUserAdmin ? "Admin" : "User");

    const systemPrompt = isUserAdmin
      ? `You are "TMS Admin Copilot", an AI assistant embedded in a Task Management System for Administrators.
Current Admin: ${userName}.
Current Database Context:
- Statistics: ${JSON.stringify(context.stats)}
- Team Members & Workload: ${JSON.stringify(context.workload)}
- Recent Tasks: ${JSON.stringify(context.recentTasks)}
- Overdue Tasks: ${JSON.stringify(context.overdueList)}

Guidelines:
1. Always be professional, concise, and proactive.
2. If the admin asks about assigning tasks or delegating work, check team workload and recommend members with the lightest workload.
3. If the admin asks to create or assign a task (e.g. "Assign task X to user Y with high priority"), provide a clear confirmation and format an action block:
ACTION: {"action": "CREATE_TASK", "title": "...", "assignedTo": "<userId or userName>", "priority": "Low|Medium|High|Critical", "dueDate": "YYYY-MM-DD"}
4. If the admin asks for project status or bottlenecks, summarize key numbers and list urgent items.
5. Use markdown formatting with bullet points and bold headers.`
      : `You are "TMS Productivity Copilot", an AI assistant embedded in a Task Management System for Team Members.
Current User: ${userName}.
User's Assigned Tasks Context:
- Total Tasks: ${context.tasksCount}
- Pending/Active Tasks: ${context.pendingCount}
- My Tasks List: ${JSON.stringify(context.myTasks)}

Guidelines:
1. Always be encouraging, actionable, and clear.
2. If the user asks for help on a task, provide step-by-step guidance, implementation structure, and edge cases to consider.
3. If the user asks to break down a task or generate subtasks, list 4-6 specific actionable subtasks and format an action block:
ACTION: {"action": "ADD_SUBTASKS", "taskId": "<taskId>", "subtasks": ["subtask 1", "subtask 2", ...]}
4. If the user asks to update a task status, format an action block:
ACTION: {"action": "UPDATE_TASK_STATUS", "taskId": "<taskId>", "status": "Pending|In Progress|Done"}
5. Use clean markdown formatting with bullet points and bold headers.`;

    let fullPrompt = `${systemPrompt}\n\n`;
    if (chatHistory && chatHistory.length > 0) {
      fullPrompt += `Previous Conversation:\n`;
      chatHistory.slice(-6).forEach((h) => {
        fullPrompt += `${h.sender === "user" ? "User" : "Assistant"}: ${h.text}\n`;
      });
      fullPrompt += `\n`;
    }
    fullPrompt += `User's New Message: ${message}\n\nAssistant Response:`;

    const result = await geminiModel.generateContent(fullPrompt);
    const responseText = result.response.text();

    const actionMatch = responseText.match(/ACTION:\s*(\{.*?\})/s);
    let parsedAction = null;
    let cleanReply = responseText;

    if (actionMatch) {
      try {
        parsedAction = JSON.parse(actionMatch[1]);
        cleanReply = responseText.replace(/ACTION:\s*\{.*?\}/s, "").trim();

        if (parsedAction.action === "CREATE_TASK") {
          let targetUserId = parsedAction.assignedTo;
          const targetUser = context.users?.find(
            (u) => u.name.toLowerCase() === (parsedAction.assignedTo || "").toLowerCase() || u.id === parsedAction.assignedTo
          );
          if (targetUser) targetUserId = targetUser.id;

          const created = await Task.create({
            title: parsedAction.title || "AI Generated Task",
            description: parsedAction.description || `Created via TMS Copilot by ${userName}`,
            priority: parsedAction.priority || "Medium",
            status: "Pending",
            assignedTo: targetUserId || user?._id || user?.id,
            dueDate: parsedAction.dueDate ? new Date(parsedAction.dueDate) : null,
          });

          parsedAction = {
            type: "TASK_CREATED",
            task: {
              id: created._id,
              title: created.title,
              priority: created.priority,
              assignedTo: targetUser ? targetUser.name : userName,
            },
          };
        } else if (parsedAction.action === "UPDATE_TASK_STATUS" && parsedAction.taskId) {
          await Task.findByIdAndUpdate(parsedAction.taskId, { status: parsedAction.status });
          parsedAction = {
            type: "TASK_STATUS_UPDATED",
            taskId: parsedAction.taskId,
            status: parsedAction.status,
          };
        } else if (parsedAction.action === "ADD_SUBTASKS" && parsedAction.taskId && Array.isArray(parsedAction.subtasks)) {
          const t = await Task.findById(parsedAction.taskId);
          if (t) {
            parsedAction.subtasks.forEach((st) => {
              t.subtasks.push({ title: st, completed: false });
            });
            await t.save();
          }
          parsedAction = {
            type: "SUBTASKS_ADDED",
            taskId: parsedAction.taskId,
            subtasks: parsedAction.subtasks,
          };
        }
      } catch (err) {
        console.warn("Failed to parse AI action block:", err.message);
      }
    }

    return {
      reply: cleanReply,
      action: parsedAction,
    };
  } catch (err) {
    console.error("Gemini API error, falling back to local engine:", err.message);
    return await processWithOfflineEngine(message, context, user);
  }
};

/**
 * Generate Proactive Welcome & Quick Suggestions
 */
const getProactiveGreeting = async (user) => {
  const isUserAdmin = user?.role === "admin";
  const userName = user?.name || (isUserAdmin ? "Admin" : "User");
  const context = await gatherContext(user);

  if (isUserAdmin) {
    const overdueCount = context.stats.overdue;
    return {
      role: "admin",
      greeting: `Hello **${userName}**! 👑\n\nDo you have **any works or new tasks to assign** today? Or would you like a quick overview of team progress?`,
      chips: [
        { label: "➕ Quick Assign Task", prompt: "Assign a new task to team" },
        { label: "👥 Who is Free?", prompt: "Who is free to take up a new task?" },
        { label: `📊 Team Health (${overdueCount} Overdue)`, prompt: "Give me a summary of overdue tasks and team workload" },
        { label: "⚡ Bottleneck Check", prompt: "Check for any project bottlenecks" },
      ],
      stats: context.stats,
    };
  } else {
    const topTask = context.myTasks && context.myTasks[0];
    const greetingMsg = topTask
      ? `Hi **${userName}**! 👋 You have **${context.pendingCount} active task(s)**.\n\nYour highest priority task is **"${topTask.title}"** (${topTask.priority} Priority).\n\n**Did you need me to help in a particular task today?**`
      : `Hi **${userName}**! 👋 You have no pending tasks right now.\n\n**Did you need me to help you with anything or prepare for upcoming work?**`;

    return {
      role: "user",
      greeting: greetingMsg,
      chips: [
        { label: topTask ? `💡 Help with "${topTask.title.slice(0, 18)}..."` : "💡 Help with a task", prompt: topTask ? `Help me with task ${topTask.title}` : "Help me with my tasks" },
        { label: "✨ Break into Subtasks", prompt: topTask ? `Generate subtasks for ${topTask.title}` : "Break my task into subtasks" },
        { label: "📋 My Pending Tasks", prompt: "Show my pending tasks" },
        { label: "✅ Mark Active Task Done", prompt: topTask ? `Mark task ${topTask.title} as Done` : "Mark task as Done" },
      ],
      tasksCount: context.tasksCount,
      pendingCount: context.pendingCount,
    };
  }
};

/**
 * Break down a task into subtasks using AI
 */
const breakDownTaskIntoSubtasks = async (taskTitle, taskDescription, user) => {
  const geminiModel = getGeminiModel();
  if (geminiModel) {
    try {
      const prompt = `Break down the following software task into 4 to 6 clear, actionable, and logical subtasks:
Task Title: ${taskTitle}
Description: ${taskDescription || "None provided"}

Return ONLY a JSON array of strings, for example:
["Step 1: Setup...", "Step 2: Implement...", "Step 3: Test..."]`;

      const result = await geminiModel.generateContent(prompt);
      const txt = result.response.text();
      const jsonMatch = txt.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      console.warn("AI Subtask breakdown failed, using fallback:", err.message);
    }
  }

  // Fallback subtasks
  return [
    `Review specifications and requirements for ${taskTitle}`,
    `Create initial schema/UI prototype and structure`,
    `Implement core business logic & data handling`,
    `Perform functional & responsive testing`,
    `Final code review, verification, and deployment`,
  ];
};

module.exports = {
  processAIChat,
  getProactiveGreeting,
  breakDownTaskIntoSubtasks,
  gatherContext,
};
