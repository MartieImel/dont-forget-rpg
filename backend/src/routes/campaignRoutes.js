const express = require("express");
const { requireAuth } = require("../middleware/auth");
const ctrl = require("../controllers/campaignController");
const board = require("../controllers/boardController");
const escapes = require("../controllers/escapeController");
const ah = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireAuth);
router.post("/", ah(ctrl.create));
router.get("/mine", ah(ctrl.listMineAsMaster));
router.get("/joined", ah(ctrl.listJoined));
router.post("/join", ah(ctrl.join));
router.post("/:id/leave", ah(ctrl.leave));
router.get("/:id", ah(ctrl.getState));
router.put("/:id", ah(ctrl.updateMeta));
router.post("/:id/npcs", ah(ctrl.createNpc));
router.put("/:id/npcs/:npcId", ah(ctrl.updateNpc));
router.delete("/:id/npcs/:npcId", ah(ctrl.deleteNpc));
router.post("/:id/log", ah(ctrl.addLog));

// Tabuleiro tático
router.get("/:id/board", ah(board.getBoard));
router.post("/:id/board/next-turn", ah(board.nextTurn));
router.put("/:id/board/tokens/:tokenId/move", ah(board.moveToken));
router.post("/:id/boards", ah(board.createBoard));
router.put("/:id/boards/:boardId", ah(board.updateBoard));
router.delete("/:id/boards/:boardId", ah(board.deleteBoard));
router.post("/:id/boards/:boardId/activate", ah(board.activateBoard));
router.post("/:id/boards/:boardId/tokens", ah(board.addTokens));
router.delete("/:id/boards/:boardId/tokens/:tokenId", ah(board.removeToken));

// Biblioteca de Cenas de Fuga
router.get("/:id/escapes", ah(escapes.list));
router.post("/:id/escapes", ah(escapes.create));
router.get("/:id/escapes/:sceneId", ah(escapes.getOne));
router.put("/:id/escapes/:sceneId", ah(escapes.update));
router.delete("/:id/escapes/:sceneId", ah(escapes.remove));
module.exports = router;
