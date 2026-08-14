import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { sendAIChat, getAIGreeting } from "../services/taskApi";
import "./AIChatBot.css";

function AIChatBot() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [greetingData, setGreetingData] = useState(null);
  const [hasUnread, setHasUnread] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "admin";

  // Load proactive greeting when user is logged in
  useEffect(() => {
    if (!user?.name && !user?.email) return;

    const fetchGreeting = async () => {
      try {
        const res = await getAIGreeting();
        if (res.data?.success) {
          setGreetingData(res.data.data);
          setMessages([
            {
              id: "msg-0",
              sender: "assistant",
              text: res.data.data.greeting,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        }
      } catch (err) {
        console.warn("Could not fetch AI greeting:", err);
        setMessages([
          {
            id: "msg-0",
            sender: "assistant",
            text: isAdmin
              ? `Hello **${user.name || "Admin"}**! 👑\n\nDo you have **any works or new tasks to assign** today? Or would you like a quick overview of team progress?`
              : `Hi **${user.name || "User"}**! 👋\n\n**Did you need me to help in a particular task today?** I can help you break down steps, draft outlines, or organize subtasks.`,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    };

    fetchGreeting();
  }, [user?.role, user?.name]);

  // Listen for global "open-ai-chat" custom event
  useEffect(() => {
    const handleOpenAIChat = (e) => {
      setIsOpen(true);
      setIsMinimized(false);
      setHasUnread(false);
      if (e.detail?.prompt) {
        handleSend(e.detail.prompt);
      }
    };

    window.addEventListener("open-ai-chat", handleOpenAIChat);
    return () => window.removeEventListener("open-ai-chat", handleOpenAIChat);
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized, loading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
    setIsMinimized(false);
    setHasUnread(false);
  };

  const handleClearChat = () => {
    if (greetingData) {
      setMessages([
        {
          id: `msg-${Date.now()}`,
          sender: "assistant",
          text: greetingData.greeting,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } else {
      setMessages([]);
    }
  };

  const handleSend = async (overrideText) => {
    const textToSend = typeof overrideText === "string" ? overrideText : inputMessage;
    if (!textToSend || !textToSend.trim() || loading) return;

    const userMsg = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setLoading(true);

    try {
      const chatHistory = messages.map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const res = await sendAIChat(textToSend.trim(), chatHistory);
      if (res.data?.success) {
        const { reply, action } = res.data.data;
        const aiMsg = {
          id: `ai-${Date.now()}`,
          sender: "assistant",
          text: reply,
          action: action,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err) {
      console.error("AI Chat Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "assistant",
          text: "⚠️ Sorry, I encountered an issue processing your request. Please try asking again!",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Simple Markdown renderer for rich replies
  const renderFormattedText = (text) => {
    if (!text) return null;

    const lines = text.split("\n");
    return lines.map((line, idx) => {
      // Headers (### or ##)
      if (line.startsWith("### ")) {
        return (
          <h4 key={idx} className="ai-markdown-h4">
            {line.replace("### ", "")}
          </h4>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h3 key={idx} className="ai-markdown-h3">
            {line.replace("## ", "")}
          </h3>
        );
      }

      // Checkbox list
      if (line.trim().startsWith("[ ] ") || line.trim().match(/^\d+\.\s*\[\s*\]/)) {
        const itemText = line.replace(/^\d+\.\s*\[\s*\]\s*/, "").replace(/^\[ \]\s*/, "");
        return (
          <div key={idx} className="ai-checkbox-item">
            <span className="ai-check-icon">⬜</span>
            <span>{parseInlineStyles(itemText)}</span>
          </div>
        );
      }

      // Bullet points
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        return (
          <li key={idx} className="ai-markdown-li">
            {parseInlineStyles(line.trim().substring(2))}
          </li>
        );
      }

      // Numbered list
      if (line.trim().match(/^\d+\.\s+/)) {
        return (
          <div key={idx} className="ai-numbered-line">
            {parseInlineStyles(line.trim())}
          </div>
        );
      }

      // Empty line
      if (!line.trim()) {
        return <div key={idx} className="ai-markdown-spacer" />;
      }

      // Regular paragraph
      return (
        <p key={idx} className="ai-markdown-p">
          {parseInlineStyles(line)}
        </p>
      );
    });
  };

  // Parse inline **bold**, *italic*, `code`
  const parseInlineStyles = (str) => {
    if (!str) return "";
    const parts = [];
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push(str.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith("**") && token.endsWith("**")) {
        parts.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
      } else if (token.startsWith("*") && token.endsWith("*")) {
        parts.push(<em key={match.index}>{token.slice(1, -1)}</em>);
      } else if (token.startsWith("`") && token.endsWith("`")) {
        parts.push(
          <code
            key={match.index}
            className="ai-inline-code"
            onClick={() => {
              // Clicking code snippet can prefill or copy
              setInputMessage(token.slice(1, -1));
            }}
            title="Click to copy into message box"
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < str.length) {
      parts.push(str.substring(lastIndex));
    }

    return parts.length > 0 ? parts : str;
  };

  if (!user?.name && !user?.email) return null;

  return (
    <div className="ai-copilot-container">
      {/* ── Floating Launcher Trigger ── */}
      {!isOpen && (
        <button
          className="ai-floating-trigger"
          onClick={toggleOpen}
          aria-label="Open AI Copilot"
          title={isAdmin ? "Open Admin AI Assistant" : "Open Task AI Assistant"}
        >
          <div className="ai-trigger-spark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          </div>
          <span className="ai-trigger-label">{isAdmin ? "Admin AI" : "AI Copilot"}</span>
          {hasUnread && <span className="ai-unread-dot" />}
        </button>
      )}

      {/* ── Chat Modal / Panel ── */}
      {isOpen && (
        <div className={`ai-chat-window ${isMinimized ? "ai-minimized" : ""}`}>
          {/* ── Header ── */}
          <div className="ai-chat-header">
            <div className="ai-header-info">
              <div className="ai-avatar-badge">
                <span className="ai-spark-icon">✨</span>
                <span className="ai-status-indicator" />
              </div>
              <div className="ai-title-wrap">
                <div className="ai-title-row">
                  <span className="ai-title">TMS AI Copilot</span>
                  <span className="ai-live-badge">Online</span>
                </div>
                <span className="ai-role-tag">
                  {isAdmin ? "⚡ Admin Delegation Mode" : "🚀 Personal Productivity Mode"}
                </span>
              </div>
            </div>

            <div className="ai-header-actions">
              <button
                className="ai-icon-btn"
                onClick={handleClearChat}
                title="Reset Conversation"
                aria-label="Reset Chat"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10"/>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                </svg>
              </button>

              <button
                className="ai-icon-btn"
                onClick={() => setIsMinimized((m) => !m)}
                title={isMinimized ? "Expand" : "Minimize"}
                aria-label="Minimize"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>

              <button
                className="ai-icon-btn ai-close-btn"
                onClick={toggleOpen}
                title="Close"
                aria-label="Close"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          {!isMinimized && (
            <>
              {/* Proactive Quick Chips Header */}
              {greetingData?.chips && greetingData.chips.length > 0 && (
                <div className="ai-chips-carousel">
                  {greetingData.chips.map((chip, i) => (
                    <button
                      key={i}
                      className="ai-chip-pill"
                      onClick={() => handleSend(chip.prompt)}
                      disabled={loading}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Messages Container */}
              <div className="ai-messages-list">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`ai-message-row ${msg.sender === "user" ? "ai-row-user" : "ai-row-assistant"}`}
                  >
                    {msg.sender === "assistant" && (
                      <div className="ai-msg-avatar">✨</div>
                    )}

                    <div className="ai-bubble-wrap">
                      <div className={`ai-bubble ${msg.sender === "user" ? "ai-bubble-user" : "ai-bubble-assistant"}`}>
                        {renderFormattedText(msg.text)}

                        {/* Interactive Action Card if Task was Created or Updated */}
                        {msg.action && msg.action.type === "TASK_CREATED" && (
                          <div className="ai-action-card">
                            <div className="ai-card-header">
                              <span className="ai-card-tag">✅ Task Created</span>
                              <span className="ai-card-prio">{msg.action.task?.priority || "Medium"}</span>
                            </div>
                            <h5 className="ai-card-title">{msg.action.task?.title}</h5>
                            <p className="ai-card-assigned">
                              Assigned to: <strong>{msg.action.task?.assignedTo}</strong>
                            </p>
                            <button
                              className="ai-card-action-btn"
                              onClick={() => {
                                toggleOpen();
                                navigate(isAdmin ? "/admin/tasks" : "/tasks");
                              }}
                            >
                              View in Tasks →
                            </button>
                          </div>
                        )}

                        {msg.action && msg.action.type === "TASK_STATUS_UPDATED" && (
                          <div className="ai-action-card">
                            <span className="ai-card-tag">⚡ Status Updated</span>
                            <p className="ai-card-assigned">New Status: <strong>{msg.action.status}</strong></p>
                          </div>
                        )}
                      </div>
                      <span className="ai-timestamp">{msg.time}</span>
                    </div>
                  </div>
                ))}

                {/* Typing Loading Indicator */}
                {loading && (
                  <div className="ai-message-row ai-row-assistant">
                    <div className="ai-msg-avatar">✨</div>
                    <div className="ai-bubble ai-bubble-assistant ai-bubble-typing">
                      <span className="ai-dot" />
                      <span className="ai-dot" />
                      <span className="ai-dot" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* ── Input Area ── */}
              <div className="ai-input-area">
                <div className="ai-input-wrap">
                  <textarea
                    ref={inputRef}
                    className="ai-textarea"
                    placeholder={
                      isAdmin
                        ? 'Ask "Any tasks to assign?", "Who is free?", or "Assign task..."'
                        : 'Ask "Help me with task...", "Break into subtasks...", or status update'
                    }
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    disabled={loading}
                  />

                  <button
                    className={`ai-send-btn ${inputMessage.trim() ? "can-send" : ""}`}
                    onClick={() => handleSend()}
                    disabled={!inputMessage.trim() || loading}
                    aria-label="Send Message"
                    title="Send message (Enter)"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </div>
                <span className="ai-input-hint">Press <strong>Enter ↵</strong> to send</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default AIChatBot;
