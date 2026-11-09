const express = require("express");
const { register, login, me } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const ah = require("../utils/asyncHandler");

const router = express.Router();
router.post("/register", ah(register));
router.post("/login", ah(login));
router.get("/me", requireAuth, ah(me));
module.exports = router;
