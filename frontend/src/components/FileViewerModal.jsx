import { useEffect, useState, useRef } from "react";
import { getInlineFileUrl, getFileType, formatFileSize } from "../utils/fileUtils";
import API from "../services/taskApi";

function FileViewerModal({ file, taskId, onVersionUploaded, onClose }) {
  if (!file) return null;

  const [activeFile, setActiveFile] = useState(file);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [versionHistory, setVersionHistory] = useState(file.versionHistory || []);
  const [imgZoom, setImgZoom] = useState(1);
  const [imgRotate, setImgRotate] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [uploadNote, setUploadNote] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    setActiveFile(file);
    setVersionHistory(file.versionHistory || []);
    setImgZoom(1);
    setImgRotate(0);
    setImgError(false);
  }, [file]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const fetchVersions = async () => {
    if (!taskId || !file._id) return;
    try {
      setHistoryLoading(true);
      const res = await API.getAttachmentVersions(taskId, file._id);
      if (res.data?.success) {
        setVersionHistory(res.data.data.history || []);
      }
    } catch (err) {
      console.error("Failed to load versions:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleToggleHistory = () => {
    if (!showHistory && (!versionHistory || versionHistory.length === 0)) {
      fetchVersions();
    }
    setShowHistory((p) => !p);
  };

  const handleUploadNewVersion = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || !taskId || !file._id) return;

    try {
      setUploadingVersion(true);
      const res = await API.uploadAttachmentVersion(taskId, file._id, selectedFile, uploadNote.trim());
      if (res.data?.success) {
        const updatedTask = res.data.data;
        const newAttachment = res.data.attachment || updatedTask.attachments.find((a) => a._id === file._id);
        if (newAttachment) {
          setActiveFile(newAttachment);
          setVersionHistory(newAttachment.versionHistory || []);
        }
        setUploadNote("");
        if (onVersionUploaded) {
          onVersionUploaded(updatedTask);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to upload new version");
    } finally {
      setUploadingVersion(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const inlineUrl = getInlineFileUrl(activeFile);
  const rawUrl = activeFile.url || (activeFile.storedName ? `http://localhost:5000/uploads/${activeFile.storedName}` : "#");
  const fileName = activeFile.filename || activeFile.name || "Attachment";
  const fileType = getFileType(fileName, activeFile.mimetype);
  const fileSizeStr = formatFileSize(activeFile.size);
  const currentVersion = activeFile.version || 1;

  const handleOpenNewTab = () => {
    window.open(inlineUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="file-viewer-backdrop" onClick={onClose}>
      <div className="file-viewer-modal" onClick={(e) => e.stopPropagation()}>
        {/* ── Header Bar ── */}
        <div className="file-viewer-header">
          <div className="file-info-block">
            <span className="file-icon-badge">
              {fileType === "image" ? "🖼️" : fileType === "pdf" ? "📄" : fileType === "video" ? "🎬" : "📎"}
            </span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 className="file-name-title">{fileName}</h3>
                <span className="version-pill-badge">v{currentVersion}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
                {fileSizeStr && <span className="file-size-subtitle">{fileSizeStr}</span>}
                {activeFile.uploadedAt && (
                  <span className="file-size-subtitle">
                    • {new Date(activeFile.uploadedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="file-header-actions">
            {/* Version History Toggle */}
            <button
              className={`btn-file-action ${showHistory ? "primary" : "secondary"}`}
              onClick={handleToggleHistory}
              title="View attachment version history"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Versions ({versionHistory.length + 1})
            </button>

            {/* Upload New Version Button */}
            {taskId && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleUploadNewVersion}
                />
                <button
                  className="btn-file-action primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingVersion}
                  title="Upload a revised version of this file"
                  style={{ background: "linear-gradient(135deg, #2563eb, #3b82f6)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {uploadingVersion ? "Uploading…" : "New Version"}
                </button>
              </>
            )}

            {/* Open in New Tab */}
            <button className="btn-file-action secondary" onClick={handleOpenNewTab} title="Open inline in browser tab">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Open Tab
            </button>

            {/* Download */}
            <a href={rawUrl} download={fileName} className="btn-file-action secondary" title="Download file">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download
            </a>

            <button className="btn-file-close" onClick={onClose} title="Close (Esc)">
              ×
            </button>
          </div>
        </div>

        {/* ── Main Modal Body (Viewer + Optional Version Drawer) ── */}
        <div style={{ display: "flex", flex: 1, minHeight: 0, position: "relative" }}>
          {/* Content Viewer Body */}
          <div className="file-viewer-body" style={{ flex: 1 }}>
            {fileType === "image" && !imgError ? (
              <div className="viewer-image-container" style={{ position: "relative" }}>
                {/* Floating Image Control Bar */}
                <div className="viewer-img-controls">
                  <button onClick={() => setImgZoom((z) => Math.min(z + 0.25, 3))} title="Zoom In">+</button>
                  <button onClick={() => setImgZoom((z) => Math.max(z - 0.25, 0.5))} title="Zoom Out">−</button>
                  <button onClick={() => setImgRotate((r) => (r + 90) % 360)} title="Rotate 90°">🔄</button>
                  <button onClick={() => { setImgZoom(1); setImgRotate(0); }} title="Reset">Reset</button>
                </div>
                <img
                  src={inlineUrl}
                  alt={fileName}
                  className="viewer-preview-img"
                  style={{
                    transform: `scale(${imgZoom}) rotate(${imgRotate}deg)`,
                    transition: "transform 0.2s ease",
                  }}
                  onError={() => setImgError(true)}
                />
              </div>
            ) : fileType === "image" && imgError ? (
              <div className="viewer-fallback-container">
                <span className="fallback-icon">🖼️</span>
                <h4>{fileName}</h4>
                <p>Preview unavailable. The image may be missing or inaccessible.</p>
                <button className="btn-file-action primary" onClick={handleOpenNewTab}>
                  Try Opening Inline in Browser
                </button>
              </div>
            ) : fileType === "pdf" ? (
              <iframe src={inlineUrl} title={fileName} className="viewer-iframe" />
            ) : fileType === "video" ? (
              <div className="viewer-media-container">
                <video src={inlineUrl} controls autoPlay className="viewer-video" />
              </div>
            ) : fileType === "audio" ? (
              <div className="viewer-media-container audio">
                <audio src={inlineUrl} controls autoPlay className="viewer-audio" />
              </div>
            ) : fileType === "text" ? (
              <iframe src={inlineUrl} title={fileName} className="viewer-iframe" />
            ) : (
              <div className="viewer-fallback-container">
                <span className="fallback-icon">📄</span>
                <h4>{fileName}</h4>
                <p>Preview is best viewed in a full browser window.</p>
                <button className="btn-file-action primary" onClick={handleOpenNewTab}>
                  Open Inline in Browser
                </button>
              </div>
            )}
          </div>

          {/* ── Side Drawer: Version History ── */}
          {showHistory && (
            <div className="version-history-drawer">
              <div className="version-drawer-header">
                <h4>Version History</h4>
                <button className="version-drawer-close" onClick={() => setShowHistory(false)}>×</button>
              </div>

              <div className="version-drawer-body">
                {/* Current Version Card */}
                <div
                  className={`version-history-card ${activeFile.version === file.version ? "active" : ""}`}
                  onClick={() => setActiveFile(file)}
                >
                  <div className="version-card-top">
                    <span className="version-tag current">v{file.version || 1} (Current)</span>
                    <span className="version-date">
                      {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : "Latest"}
                    </span>
                  </div>
                  <div className="version-file-title">{file.filename}</div>
                  <div className="version-card-meta">
                    <span>{formatFileSize(file.size)}</span>
                  </div>
                </div>

                {/* Historical Versions List */}
                {historyLoading ? (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "#94a3b8" }}>
                    Loading version history…
                  </div>
                ) : (
                  versionHistory
                    .slice()
                    .reverse()
                    .map((vh, idx) => (
                      <div
                        key={idx}
                        className={`version-history-card ${activeFile.url === vh.url ? "active" : ""}`}
                        onClick={() => setActiveFile(vh)}
                      >
                        <div className="version-card-top">
                          <span className="version-tag">v{vh.version}</span>
                          <span className="version-date">
                            {vh.uploadedAt ? new Date(vh.uploadedAt).toLocaleDateString() : ""}
                          </span>
                        </div>
                        <div className="version-file-title">{vh.filename}</div>
                        {vh.note && <div className="version-note">“{vh.note}”</div>}
                        <div className="version-card-meta">
                          <span>{formatFileSize(vh.size)}</span>
                          {vh.uploadedBy?.name && <span>• by {vh.uploadedBy.name}</span>}
                        </div>
                        <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                          <button
                            className="btn-version-action"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveFile(vh);
                            }}
                          >
                            Preview
                          </button>
                          <a
                            href={getInlineFileUrl(vh)}
                            download={vh.filename}
                            className="btn-version-action"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FileViewerModal;
