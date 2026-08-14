const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

let io = null;

// Map: userId (string) -> Set of socket IDs
const onlineSockets = new Map();
// Map: userId (string) -> user info object { id, name, email, avatar, role, lastSeen }
const onlineUsersInfo = new Map();

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const rawToken =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization;

      if (!rawToken) {
        return next(new Error("Authentication required"));
      }

      const token = rawToken.startsWith("Bearer ")
        ? rawToken.slice(7)
        : rawToken;

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded || !decoded.id) {
        return next(new Error("Invalid authentication token"));
      }

      // Fetch user details for presence info
      const user = await User.findById(decoded.id).select("name email role avatar");
      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      };

      next();
    } catch (err) {
      console.error("Socket authentication error:", err.message);
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.id;

    // Track user socket
    if (!onlineSockets.has(userId)) {
      onlineSockets.set(userId, new Set());
    }
    onlineSockets.get(userId).add(socket.id);
    onlineUsersInfo.set(userId, {
      ...socket.user,
      lastSeen: new Date(),
    });

    // Join user's personal private room for notifications/direct alerts
    socket.join(`user:${userId}`);

    // Broadcast updated presence to all clients
    broadcastPresence();

    // Send initial presence list to the newly connected socket
    socket.emit("presence:sync", getOnlineUsersList());

    // ─────────────────────────────────────────────
    // Task Room Subscription
    // ─────────────────────────────────────────────
    socket.on("task:join", (taskId) => {
      if (taskId) {
        const room = `task:${taskId}`;
        socket.join(room);
        // Notify others in the room
        socket.to(room).emit("task:user_joined", {
          taskId,
          user: socket.user,
        });
      }
    });

    socket.on("task:leave", (taskId) => {
      if (taskId) {
        const room = `task:${taskId}`;
        socket.leave(room);
        socket.to(room).emit("task:user_left", {
          taskId,
          user: socket.user,
        });
      }
    });

    // ─────────────────────────────────────────────
    // Live Typing Indicators
    // ─────────────────────────────────────────────
    socket.on("task:typing", ({ taskId }) => {
      if (taskId) {
        socket.to(`task:${taskId}`).emit("task:user_typing", {
          taskId,
          user: socket.user,
        });
      }
    });

    socket.on("task:stop_typing", ({ taskId }) => {
      if (taskId) {
        socket.to(`task:${taskId}`).emit("task:user_stop_typing", {
          taskId,
          user: socket.user,
        });
      }
    });

    // ─────────────────────────────────────────────
    // Disconnect
    // ─────────────────────────────────────────────
    socket.on("disconnect", () => {
      if (onlineSockets.has(userId)) {
        const userSocketSet = onlineSockets.get(userId);
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          onlineSockets.delete(userId);
          if (onlineUsersInfo.has(userId)) {
            onlineUsersInfo.get(userId).lastSeen = new Date();
          }
          // Broadcast offline event
          broadcastPresence();
        }
      }
    });
  });

  return io;
};

const broadcastPresence = () => {
  if (!io) return;
  const list = getOnlineUsersList();
  io.emit("presence:update", list);
};

const getOnlineUsersList = () => {
  const list = [];
  for (const [userId] of onlineSockets) {
    const info = onlineUsersInfo.get(userId);
    if (info) {
      list.push(info);
    }
  }
  return list;
};

const getOnlineUserIds = () => {
  return Array.from(onlineSockets.keys());
};

const getIO = () => {
  return io;
};

const emitToTask = (taskId, event, data) => {
  if (io && taskId) {
    io.to(`task:${taskId}`).emit(event, data);
  }
};

const emitToUser = (userId, event, data) => {
  if (io && userId) {
    io.to(`user:${userId.toString()}`).emit(event, data);
  }
};

const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToTask,
  emitToUser,
  emitToAll,
  getOnlineUsersList,
  getOnlineUserIds,
};
