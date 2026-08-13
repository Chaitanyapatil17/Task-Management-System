// ── File URL & Inline Preview Utilities ──────────────────────────────

/**
 * Transforms a raw attachment URL (Cloudinary or local) into an inline-viewable URL
 * preventing Cloudinary from forcing an automatic local disk download (Content-Disposition: attachment).
 */
export function getInlineFileUrl(attachment) {
  if (!attachment) return "#";

  let rawUrl =
    typeof attachment === "string"
      ? attachment
      : attachment.url ||
        (attachment.storedName
          ? `http://localhost:5000/uploads/${attachment.storedName}`
          : "#");

  if (!rawUrl || rawUrl === "#") return "#";

  // Cloudinary URL Transformation: replace fl_attachment with fl_inline or add fl_inline flag
  if (rawUrl.includes("cloudinary.com")) {
    if (rawUrl.includes("fl_attachment")) {
      rawUrl = rawUrl
        .replace(/fl_attachment:[^/]+/g, "fl_inline")
        .replace("fl_attachment", "fl_inline");
    } else if (rawUrl.includes("/upload/")) {
      if (!rawUrl.includes("fl_inline")) {
        rawUrl = rawUrl.replace("/upload/", "/upload/fl_inline/");
      }
    }
  }

  return rawUrl;
}

/**
 * Determines file type category (image, pdf, video, audio, text, or other)
 */
export function getFileType(filename = "", mimetype = "") {
  const name = (filename || "").toLowerCase();
  const mime = (mimetype || "").toLowerCase();

  if (mime.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/.test(name)) return "image";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (mime.startsWith("video/") || /\.(mp4|webm|ogg|mov)$/.test(name)) return "video";
  if (mime.startsWith("audio/") || /\.(mp3|wav|ogg)$/.test(name)) return "audio";
  if (mime.startsWith("text/") || /\.(txt|csv|log|json|js|html|md)$/.test(name)) return "text";

  return "other";
}

/**
 * Formats bytes to readable string (KB, MB)
 */
export function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
