const express = require("express");

const {
  register,
  login,
  googleLogin,
  createUserByAdmin,
  createAdminByAdmin,
  getUsers,
  deleteUser,
  getCollaborators,
  getPresenceStatus,
} = require("../controllers/authController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();


// Public
router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin);

// Protected Collaborators & Presence (All authenticated users)
router.get("/collaborators", protect, getCollaborators);
router.get("/presence", protect, getPresenceStatus);


// Admin
router.get(
  "/users",
  protect,
  adminOnly,
  getUsers
);

router.post(
  "/users",
  protect,
  adminOnly,
  createUserByAdmin
);

router.post(
  "/admins",
  protect,
  adminOnly,
  createAdminByAdmin
);

router.delete(
  "/users/:id",
  protect,
  adminOnly,
  deleteUser
);


module.exports = router;