import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace("/api", "") : "http://localhost:5000");

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const socketRef = useRef(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
        setOnlineUsers([]);
        setOnlineUserIds(new Set());
      }
      return;
    }

    // Connect to Socket.io server with JWT authentication
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("connect", () => {
      setConnected(true);
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
    });

    // ── Online Presence Handlers ──
    newSocket.on("presence:sync", (userList) => {
      if (Array.isArray(userList)) {
        setOnlineUsers(userList);
        setOnlineUserIds(new Set(userList.map((u) => u.id || u._id)));
      }
    });

    newSocket.on("presence:update", (userList) => {
      if (Array.isArray(userList)) {
        setOnlineUsers(userList);
        setOnlineUserIds(new Set(userList.map((u) => u.id || u._id)));
      }
    });

    // ── Global Real-Time Event Dispatchers ──
    newSocket.on("notification:new", (notification) => {
      window.dispatchEvent(new CustomEvent("socket:notification", { detail: notification }));
    });

    newSocket.on("task:created", (task) => {
      window.dispatchEvent(new CustomEvent("socket:task:created", { detail: task }));
    });

    newSocket.on("task:updated", (task) => {
      window.dispatchEvent(new CustomEvent("socket:task:updated", { detail: task }));
    });

    newSocket.on("task:deleted", (data) => {
      window.dispatchEvent(new CustomEvent("socket:task:deleted", { detail: data }));
    });

    newSocket.on("tasks:bulk_updated", (data) => {
      window.dispatchEvent(new CustomEvent("socket:tasks:bulk_updated", { detail: data }));
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  // Helpers
  const isUserOnline = useCallback(
    (userId) => {
      if (!userId) return false;
      const idStr = typeof userId === "object" ? userId._id || userId.id : userId;
      return onlineUserIds.has(String(idStr));
    },
    [onlineUserIds]
  );

  const joinTaskRoom = useCallback((taskId) => {
    if (socketRef.current && taskId) {
      socketRef.current.emit("task:join", taskId);
    }
  }, []);

  const leaveTaskRoom = useCallback((taskId) => {
    if (socketRef.current && taskId) {
      socketRef.current.emit("task:leave", taskId);
    }
  }, []);

  const sendTyping = useCallback((taskId) => {
    if (socketRef.current && taskId) {
      socketRef.current.emit("task:typing", { taskId });
    }
  }, []);

  const sendStopTyping = useCallback((taskId) => {
    if (socketRef.current && taskId) {
      socketRef.current.emit("task:stop_typing", { taskId });
    }
  }, []);

  const value = {
    socket,
    connected,
    onlineUsers,
    onlineUserIds,
    isUserOnline,
    joinTaskRoom,
    leaveTaskRoom,
    sendTyping,
    sendStopTyping,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    return {
      socket: null,
      connected: false,
      onlineUsers: [],
      onlineUserIds: new Set(),
      isUserOnline: () => false,
      joinTaskRoom: () => {},
      leaveTaskRoom: () => {},
      sendTyping: () => {},
      sendStopTyping: () => {},
    };
  }
  return context;
}

export default SocketContext;
