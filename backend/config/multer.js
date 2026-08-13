const multer = require("multer");
const path   = require("path");
const fs     = require("fs");

// ── Decide storage backend based on whether Cloudinary is configured ──────────
const cloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_CLOUD_NAME !== "YOUR_CLOUD_NAME" &&
  process.env.CLOUDINARY_API_KEY    &&
  process.env.CLOUDINARY_API_KEY    !== "YOUR_API_KEY" &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_API_SECRET !== "YOUR_API_SECRET";

let storage;

if (cloudinaryConfigured) {
  // ── Cloudinary storage ──────────────────────────────────────────────────────
  const { CloudinaryStorage } = require("multer-storage-cloudinary");
  const cloudinary = require("./cloudinary");

  storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const isImage = file.mimetype.startsWith("image/");
      return {
        folder:        "tms-attachments",
        resource_type: isImage ? "image" : "raw",
        public_id:     `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`,
        ...(isImage && { transformation: [{ quality: "auto", fetch_format: "auto" }] }),
      };
    },
  });

  console.log("✅ File uploads: Cloudinary storage active");
} else {
  // ── Local disk storage (fallback) ───────────────────────────────────────────
  const uploadDir = path.join(__dirname, "../uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename:    (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });

  console.log("⚠️  File uploads: local disk storage (Cloudinary not configured)");
}

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx|txt|zip|mp4|mp3/;
  const ext = file.originalname.split(".").pop().toLowerCase();
  if (allowed.test(ext)) cb(null, true);
  else cb(new Error(`File type .${ext} is not allowed`), false);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});
