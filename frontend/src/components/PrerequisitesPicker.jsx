import { useState, useRef, useEffect, useMemo } from "react";
import "./PrerequisitesPicker.css";

export default function PrerequisitesPicker({
  availableTasks = [],
  selectedPrerequisites = [],
  onAdd,
  onRemove,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter tasks based on search and status
  const filteredTasks = useMemo(() => {
    return availableTasks.filter((task) => {
      const matchesSearch =
        task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (statusFilter !== "all") {
        return task.status === statusFilter;
      }
      return true;
    });
  }, [availableTasks, searchTerm, statusFilter]);

  const handleSelectTask = (task) => {
    onAdd(task);
    setSearchTerm("");
    // Keep open or close smoothly
  };

  const getStatusClass = (status) => {
    const s = (status || "").toLowerCase().replace(" ", "-");
    return s || "pending";
  };

  return (
    <div className="prereq-picker-container" ref={containerRef}>
      {/* ── Main Interactive Trigger Box ── */}
      <div
        className={`prereq-trigger-box ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div className="prereq-trigger-left">
          <span className="prereq-trigger-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </span>
          <span className="prereq-trigger-text">
            {selectedPrerequisites.length === 0
              ? "+ Select prerequisite tasks..."
              : `Link more tasks (${availableTasks.length} available)`}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {selectedPrerequisites.length > 0 && (
            <span className="prereq-trigger-badge">
              {selectedPrerequisites.length} linked
            </span>
          )}
          <span className={`prereq-chevron ${isOpen ? "open" : ""}`}>▼</span>
        </div>
      </div>

      {/* ── Searchable Frosted Dropdown Modal ── */}
      {isOpen && (
        <div className="prereq-dropdown-panel">
          {/* Quick Search */}
          <div className="prereq-search-wrap">
            <span className="prereq-search-icon">🔍</span>
            <input
              type="text"
              className="prereq-search-input"
              placeholder="Search tasks by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
            {searchTerm && (
              <button
                type="button"
                className="prereq-search-clear"
                onClick={() => setSearchTerm("")}
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Filter Tabs */}
          <div className="prereq-filter-tabs">
            {["all", "Done", "In Progress", "Pending"].map((filter) => (
              <button
                key={filter}
                type="button"
                className={`prereq-filter-pill ${statusFilter === filter ? "active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setStatusFilter(filter);
                }}
              >
                {filter === "all" ? "All Tasks" : filter}
              </button>
            ))}
          </div>

          {/* List of Tasks */}
          <div className="prereq-items-list">
            {filteredTasks.length === 0 ? (
              <div className="prereq-empty-results">
                {availableTasks.length === 0
                  ? "No tasks available to link as prerequisites."
                  : "No matching tasks found."}
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task._id}
                  className="prereq-item-row"
                  onClick={() => handleSelectTask(task)}
                >
                  <div className="prereq-item-main">
                    <span className="prereq-item-title">{task.title}</span>
                    <span className={`prereq-item-tag ${getStatusClass(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                  <span className="prereq-item-action">+ Link</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Active Linked Prerequisites Chips Display ── */}
      {selectedPrerequisites.length > 0 && (
        <div className="prereq-selected-container">
          <div className="prereq-chips-grid">
            {selectedPrerequisites.map((p) => (
              <div key={p._id} className="prereq-chip-card">
                <span className="prereq-chip-icon">🔗</span>
                <span className="prereq-chip-name" title={p.title}>
                  {p.title}
                </span>
                <span className={`prereq-chip-status ${getStatusClass(p.status)}`}>
                  {p.status}
                </span>
                <button
                  type="button"
                  className="prereq-chip-delete"
                  onClick={() => onRemove(p._id)}
                  title="Remove prerequisite"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
