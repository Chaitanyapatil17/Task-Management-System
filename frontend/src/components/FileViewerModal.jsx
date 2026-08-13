import { useEffect } from "react";
import { getInlineFileUrl, getFileType, formatFileSize } from "../utils/fileUtils";

function FileViewerModal({ file, onClose }) {
  if (!file) return null;

  const inlineUrl = getInlineFileUrl(file);
  const rawUrl = file.url || (file.storedName ? `http://localhost:5000/uploads/${file.storedName}` : "#");
  const fileName = file.filename || file.name || "Attachment";
  const fileType = getFileType(fileName, file.mimetype);
  const fileSizeStr = formatFileSize(file.size);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleOpenNewTab = () => {
    window.open(inlineUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="file-viewer-backdrop" onClick={onClose}>
      <div className="file-viewer-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header Bar */}
        <div className="file-viewer-header">
          <div className="file-info-block">
            <span className="file-icon-badge">
              {fileType === "image" ? "🖼️" : fileType === "pdf" ? "📄" : fileType === "video" ? "🎬" : "📎"}
            </span>
            <div>
              <h3 className="file-name-title">{fileName}</h3>
              {fileSizeStr && <span className="file-size-subtitle">{fileSizeStr}</span>}
            </div>
          </div>

          <div className="file-header-actions">
            <button className="btn-file-action primary" onClick={handleOpenNewTab} title="Open inline in browser tab">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Open in New Tab
            </button>
            <a
              href={rawUrl}
              download={fileName}
              className="btn-file-action secondary"
              title="Download file to device"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download
            </a>
            <button className="btn-file-close" onClick={onClose} title="Close (Esc)">
              ×
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="file-viewer-body">
          {fileType === "image" ? (
            <div className="viewer-image-container">
              <img src={inlineUrl} alt={fileName} className="viewer-preview-img" />
            </div>
          ) : fileType === "pdf" ? (
            <iframe
              src={inlineUrl}
              title={fileName}
              className="viewer-iframe"
            />
          ) : fileType === "video" ? (
            <div className="viewer-media-container">
              <video src={inlineUrl} controls autoPlay className="viewer-video" />
            </div>
          ) : fileType === "audio" ? (
            <div className="viewer-media-container audio">
              <audio src={inlineUrl} controls autoPlay className="viewer-audio" />
            </div>
          ) : fileType === "text" ? (
            <iframe
              src={inlineUrl}
              title={fileName}
              className="viewer-iframe"
            />
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
      </div>
    </div>
  );
}

export default FileViewerModal;
