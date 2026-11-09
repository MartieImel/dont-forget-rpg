const express = require("express");
const { requireAuth } = require("../middleware/auth");
const ctrl = require("../controllers/characterController");
const ah = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireAuth);
router.get("/", ah(ctrl.listMine));
router.post("/", ah(ctrl.create));
router.get("/:id", ah(ctrl.getOne));
router.put("/:id", ah(ctrl.update));
router.delete("/:id", ah(ctrl.remove));
module.exports = router;
