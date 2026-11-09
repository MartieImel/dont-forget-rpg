// Tabuleiro tático: grade quadrada, fichas e movimento.
// Regras (o livro não define movimento, então estas são as da mesa):
//  - alcance por turno = moveBase da campanha (padrão 3) + Rapidez da ficha;
//  - distância "de rei" (diagonal conta 1);
//  - o jogador só move a PRÓPRIA ficha, até o alcance a partir de onde ela estava
//    no começo do turno; o mestre move qualquer ficha pra qualquer casa livre;
//  - inimigos/NPCs não revelados NÃO são enviados aos jogadores (filtrado aqui).
const { nanoid } = require("nanoid");
const { pool } = require("../db");
const { findCampaign, isMaster, isMember } = require("./campaignController");

const MIN_DIM = 4;
const MAX_DIM = 60;

const clampInt = (v, min, max, fallback) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};
const isInt = (v) => Number.isInteger(v);
const chebyshev = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
const safeJson = (s) => {
  try {
    return JSON.parse(s || "{}");
  } catch {
    return {};
  }
};

// URL de fundo vai parar num CSS url(...): só aceitamos http(s) sem caracteres perigosos.
function cleanBackgroundUrl(v) {
  const s = String(v || "").trim();
  if (!s) return { ok: true, value: null };
  if (s.length > 2000 || !/^https?:\/\/[^\s"'()<>\\]+$/i.test(s)) return { ok: false };
  return { ok: true, value: s };
}

async function loadMasterContext(req, res) {
  const campaign = await findCampaign(req.params.id, res);
  if (!campaign) return null;
  if (!isMaster(campaign, req.user.id)) {
    res.status(403).json({ error: "Só o mestre pode fazer isso." });
    return null;
  }
  return campaign;
}

async function getBoardOf(campaign, boardId, res) {
  const r = await pool.query(`SELECT * FROM boards WHERE id = $1 AND "campaignId" = $2`, [boardId, campaign.id]);
  if (!r.rows[0]) {
    res.status(404).json({ error: "Tabuleiro não encontrado." });
    return null;
  }
  return r.rows[0];
}

// Fichas do tabuleiro já com nome/retrato/HP/alcance vindos da ficha ou do NPC.
async function loadTokens(board, campaign, master) {
  const r = await pool.query(
    `SELECT bt.*,
            ch.name AS "chName", ch."portraitUrl" AS "chPortrait", ch."hpCurrent" AS "chHp", ch."hpMax" AS "chHpMax",
            ch."ownerId" AS "chOwner", ch.attrs AS "chAttrs", ch."campaignId" AS "chCampaign",
            n.id AS "npId", n.name AS "npName", n.kind AS "npKind", n."portraitUrl" AS "npPortrait",
            n."hpCurrent" AS "npHp", n."hpMax" AS "npHpMax", n.revealed AS "npRevealed", n.attrs AS "npAttrs",
            n."campaignId" AS "npCampaign"
     FROM board_tokens bt
     LEFT JOIN characters ch ON bt.kind = 'character' AND ch.id = bt."refId"
     LEFT JOIN npcs n ON bt.kind = 'npc' AND n.id = bt."refId"
     WHERE bt."boardId" = $1
     ORDER BY bt.id`,
    [board.id]
  );
  const tokens = [];
  const orphans = [];
  for (const row of r.rows) {
    if (row.kind === "character") {
      // ficha que saiu da campanha (ou foi excluída) some do tabuleiro
      if (!row.chName || row.chCampaign !== campaign.id) {
        orphans.push(row.id);
        continue;
      }
      tokens.push({
        id: row.id, kind: "character", refId: row.refId, x: row.x, y: row.y, startX: row.startX, startY: row.startY,
        name: row.chName, portraitUrl: row.chPortrait || null, subtype: "player", ownerId: row.chOwner,
        hp: row.chHp, hpMax: row.chHpMax, hidden: false,
        moveRange: campaign.moveBase + (Number(safeJson(row.chAttrs).RPZ) || 0),
      });
    } else {
      if (!row.npId || row.npCampaign !== campaign.id) {
        orphans.push(row.id);
        continue;
      }
      const hidden = !row.npRevealed;
      if (hidden && !master) continue; // jogador nunca recebe inimigo oculto
      tokens.push({
        id: row.id, kind: "npc", refId: row.refId, x: row.x, y: row.y, startX: row.startX, startY: row.startY,
        name: row.npName, portraitUrl: row.npPortrait || null, subtype: row.npKind, ownerId: null,
        hp: master ? row.npHp : null, hpMax: master ? row.npHpMax : null, hidden,
        moveRange: campaign.moveBase + (Number(safeJson(row.npAttrs).RPZ) || 0),
      });
    }
  }
  if (orphans.length) await pool.query(`DELETE FROM board_tokens WHERE id = ANY($1::text[])`, [orphans]);
  return tokens;
}

async function firstFreeCell(board) {
  const r = await pool.query(`SELECT x, y FROM board_tokens WHERE "boardId" = $1`, [board.id]);
  const taken = new Set(r.rows.map((t) => `${t.x},${t.y}`));
  for (let y = 0; y < board.rows; y++) {
    for (let x = 0; x < board.cols; x++) if (!taken.has(`${x},${y}`)) return { x, y };
  }
  return null;
}

// ---------- leitura (mestre e jogadores) ----------
async function getBoard(req, res) {
  const campaign = await findCampaign(req.params.id, res);
  if (!campaign) return;
  if (!(await isMember(campaign, req.user.id))) return res.status(403).json({ error: "Você não faz parte dessa campanha." });
  const master = isMaster(campaign, req.user.id);

  const out = { board: null, tokens: [], role: master ? "mestre" : "jogador", moveBase: campaign.moveBase, userId: req.user.id };

  if (campaign.activeBoardId) {
    const b = await pool.query(`SELECT * FROM boards WHERE id = $1`, [campaign.activeBoardId]);
    if (b.rows[0]) {
      out.board = b.rows[0];
      out.tokens = await loadTokens(b.rows[0], campaign, master);
    }
  }
  if (master) {
    const boards = await pool.query(`SELECT id, name, cols, rows FROM boards WHERE "campaignId" = $1 ORDER BY "createdAt" ASC`, [campaign.id]);
    out.boards = boards.rows.map((x) => ({ ...x, active: x.id === campaign.activeBoardId }));
    if (out.board) {
      const chars = await pool.query(
        `SELECT id, name FROM characters WHERE "campaignId" = $1
           AND id NOT IN (SELECT "refId" FROM board_tokens WHERE "boardId" = $2 AND kind = 'character') ORDER BY name`,
        [campaign.id, out.board.id]
      );
      const npcs = await pool.query(
        `SELECT id, name, kind FROM npcs WHERE "campaignId" = $1
           AND id NOT IN (SELECT "refId" FROM board_tokens WHERE "boardId" = $2 AND kind = 'npc') ORDER BY name`,
        [campaign.id, out.board.id]
      );
      out.availableCharacters = chars.rows;
      out.availableNpcs = npcs.rows;
    }
  }
  res.json(out);
}

// ---------- gestão (só mestre) ----------
async function createBoard(req, res) {
  const campaign = await loadMasterContext(req, res);
  if (!campaign) return;
  const body = req.body || {};
  const bg = cleanBackgroundUrl(body.backgroundUrl);
  if (!bg.ok) return res.status(400).json({ error: "A imagem de fundo precisa ser um link http(s) direto." });
  const count = await pool.query(`SELECT COUNT(*)::int AS n FROM boards WHERE "campaignId" = $1`, [campaign.id]);
  const id = nanoid();
  await pool.query(
    `INSERT INTO boards (id, "campaignId", name, cols, rows, "backgroundUrl") VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      id,
      campaign.id,
      String(body.name || "").trim().slice(0, 60) || `Cena ${count.rows[0].n + 1}`,
      clampInt(body.cols, MIN_DIM, MAX_DIM, 20),
      clampInt(body.rows, MIN_DIM, MAX_DIM, 14),
      bg.value,
    ]
  );
  if (!campaign.activeBoardId) await pool.query(`UPDATE campaigns SET "activeBoardId" = $1 WHERE id = $2`, [id, campaign.id]);
  const r = await pool.query(`SELECT * FROM boards WHERE id = $1`, [id]);
  res.status(201).json({ board: r.rows[0] });
}

async function updateBoard(req, res) {
  const campaign = await loadMasterContext(req, res);
  if (!campaign) return;
  const board = await getBoardOf(campaign, req.params.boardId, res);
  if (!board) return;
  const body = req.body || {};
  const sets = [];
  const values = [];
  const push = (col, val) => {
    values.push(val);
    sets.push(`"${col}" = $${values.length}`);
  };
  const cols = body.cols !== undefined ? clampInt(body.cols, MIN_DIM, MAX_DIM, board.cols) : board.cols;
  const rows = body.rows !== undefined ? clampInt(body.rows, MIN_DIM, MAX_DIM, board.rows) : board.rows;
  if (cols < board.cols || rows < board.rows) {
    const out = await pool.query(`SELECT COUNT(*)::int AS n FROM board_tokens WHERE "boardId" = $1 AND (x >= $2 OR y >= $3)`, [board.id, cols, rows]);
    if (out.rows[0].n > 0) return res.status(409).json({ error: "Há fichas fora da nova área. Mova-as antes de diminuir o tabuleiro." });
  }
  if (body.name !== undefined) push("name", String(body.name).trim().slice(0, 60) || board.name);
  if (body.cols !== undefined) push("cols", cols);
  if (body.rows !== undefined) push("rows", rows);
  if (body.backgroundUrl !== undefined) {
    const bg = cleanBackgroundUrl(body.backgroundUrl);
    if (!bg.ok) return res.status(400).json({ error: "A imagem de fundo precisa ser um link http(s) direto." });
    push("backgroundUrl", bg.value);
  }
  if (sets.length) {
    sets.push(`"updatedAt" = NOW()`);
    values.push(board.id);
    await pool.query(`UPDATE boards SET ${sets.join(", ")} WHERE id = $${values.length}`, values);
  }
  const r = await pool.query(`SELECT * FROM boards WHERE id = $1`, [board.id]);
  res.json({ board: r.rows[0] });
}

async function deleteBoard(req, res) {
  const campaign = await loadMasterContext(req, res);
  if (!campaign) return;
  const board = await getBoardOf(campaign, req.params.boardId, res);
  if (!board) return;
  await pool.query(`DELETE FROM boards WHERE id = $1`, [board.id]);
  if (campaign.activeBoardId === board.id) {
    const next = await pool.query(`SELECT id FROM boards WHERE "campaignId" = $1 ORDER BY "createdAt" DESC LIMIT 1`, [campaign.id]);
    await pool.query(`UPDATE campaigns SET "activeBoardId" = $1 WHERE id = $2`, [next.rows[0] ? next.rows[0].id : null, campaign.id]);
  }
  res.json({ ok: true });
}

async function activateBoard(req, res) {
  const campaign = await loadMasterContext(req, res);
  if (!campaign) return;
  const board = await getBoardOf(campaign, req.params.boardId, res);
  if (!board) return;
  await pool.query(`UPDATE campaigns SET "activeBoardId" = $1 WHERE id = $2`, [board.id, campaign.id]);
  res.json({ ok: true });
}

async function addTokens(req, res) {
  const campaign = await loadMasterContext(req, res);
  if (!campaign) return;
  const board = await getBoardOf(campaign, req.params.boardId, res);
  if (!board) return;
  const body = req.body || {};

  const refs = [];
  if (body.allCharacters) {
    const r = await pool.query(`SELECT id FROM characters WHERE "campaignId" = $1 ORDER BY name`, [campaign.id]);
    r.rows.forEach((c) => refs.push({ kind: "character", refId: c.id }));
  } else if (body.kind === "character" || body.kind === "npc") {
    const table = body.kind === "character" ? "characters" : "npcs";
    const r = await pool.query(`SELECT id FROM ${table} WHERE id = $1 AND "campaignId" = $2`, [body.refId, campaign.id]);
    if (!r.rows[0]) return res.status(404).json({ error: "Esse personagem/NPC não pertence a essa campanha." });
    refs.push({ kind: body.kind, refId: body.refId });
  } else {
    return res.status(400).json({ error: "Informe o que adicionar." });
  }

  let added = 0;
  for (const ref of refs) {
    const cell = await firstFreeCell(board);
    if (!cell) return res.status(409).json({ error: "O tabuleiro está cheio." });
    const ins = await pool.query(
      `INSERT INTO board_tokens (id, "boardId", kind, "refId", x, y, "startX", "startY")
       VALUES ($1,$2,$3,$4,$5,$6,$5,$6) ON CONFLICT ("boardId", kind, "refId") DO NOTHING`,
      [nanoid(), board.id, ref.kind, ref.refId, cell.x, cell.y]
    );
    added += ins.rowCount;
  }
  res.status(201).json({ added });
}

async function removeToken(req, res) {
  const campaign = await loadMasterContext(req, res);
  if (!campaign) return;
  const board = await getBoardOf(campaign, req.params.boardId, res);
  if (!board) return;
  await pool.query(`DELETE FROM board_tokens WHERE id = $1 AND "boardId" = $2`, [req.params.tokenId, board.id]);
  res.json({ ok: true });
}

async function nextTurn(req, res) {
  const campaign = await loadMasterContext(req, res);
  if (!campaign) return;
  if (!campaign.activeBoardId) return res.status(400).json({ error: "Não há tabuleiro ativo." });
  const r = await pool.query(`UPDATE boards SET turn = turn + 1, "updatedAt" = NOW() WHERE id = $1 RETURNING turn`, [campaign.activeBoardId]);
  await pool.query(`UPDATE board_tokens SET "startX" = x, "startY" = y WHERE "boardId" = $1`, [campaign.activeBoardId]);
  res.json({ turn: r.rows[0].turn });
}

// ---------- movimento (jogador e mestre) ----------
async function moveToken(req, res) {
  const campaign = await findCampaign(req.params.id, res);
  if (!campaign) return;
  if (!(await isMember(campaign, req.user.id))) return res.status(403).json({ error: "Você não faz parte dessa campanha." });
  const master = isMaster(campaign, req.user.id);

  const x = req.body && req.body.x;
  const y = req.body && req.body.y;
  if (!isInt(x) || !isInt(y)) return res.status(400).json({ error: "Posição inválida." });

  const tr = await pool.query(`SELECT * FROM board_tokens WHERE id = $1`, [req.params.tokenId]);
  const token = tr.rows[0];
  if (!token || token.boardId !== campaign.activeBoardId) return res.status(404).json({ error: "Ficha não encontrada no tabuleiro ativo." });
  const br = await pool.query(`SELECT * FROM boards WHERE id = $1`, [token.boardId]);
  const board = br.rows[0];
  if (x < 0 || y < 0 || x >= board.cols || y >= board.rows) return res.status(400).json({ error: "Essa casa fica fora do tabuleiro." });

  if (!master) {
    const ch = token.kind === "character" ? await pool.query(`SELECT "ownerId", "campaignId", attrs FROM characters WHERE id = $1`, [token.refId]) : { rows: [] };
    const owned = ch.rows[0] && ch.rows[0].ownerId === req.user.id && ch.rows[0].campaignId === campaign.id;
    if (!owned) return res.status(403).json({ error: "Você só pode mover a ficha do seu próprio personagem." });
    const range = campaign.moveBase + (Number(safeJson(ch.rows[0].attrs).RPZ) || 0);
    const dist = chebyshev(token.startX, token.startY, x, y);
    if (dist > range) {
      return res.status(400).json({ error: `Você anda até ${range} casas por turno; essa fica a ${dist} de onde você começou.` });
    }
  }

  if (x === token.x && y === token.y) return res.json({ ok: true, token: { id: token.id, x, y } });

  // casa ocupada? (o jogador não "enxerga" inimigos ocultos, então eles não bloqueiam)
  const occ = await pool.query(
    `SELECT bt.id, bt.kind, n.revealed FROM board_tokens bt LEFT JOIN npcs n ON bt.kind = 'npc' AND n.id = bt."refId"
     WHERE bt."boardId" = $1 AND bt.x = $2 AND bt.y = $3 AND bt.id <> $4`,
    [board.id, x, y, token.id]
  );
  const blocking = occ.rows.filter((o) => master || o.kind === "character" || o.revealed);
  if (blocking.length) return res.status(409).json({ error: "Essa casa já está ocupada." });

  await pool.query(`UPDATE board_tokens SET x = $1, y = $2 WHERE id = $3`, [x, y, token.id]);
  res.json({ ok: true, token: { id: token.id, x, y } });
}

module.exports = { getBoard, createBoard, updateBoard, deleteBoard, activateBoard, addTokens, removeToken, nextTurn, moveToken };
