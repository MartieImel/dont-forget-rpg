const { nanoid, customAlphabet } = require("nanoid");
const { pool } = require("../db");
const { serialize: serializeChar } = require("./characterController");

const codeAlphabet = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

const serializeCampaign = (row) => (row ? { ...row } : null);

function serializeNpc(row) {
  if (!row) return null;
  return {
    ...row,
    attrs: JSON.parse(row.attrs || "{}"),
    abilities: JSON.parse(row.abilities || "[]"),
    revealed: !!row.revealed,
  };
}

async function generateUniqueCode() {
  for (let i = 0; i < 20; i++) {
    const code = codeAlphabet();
    const r = await pool.query("SELECT id FROM campaigns WHERE code = $1", [code]);
    if (r.rows.length === 0) return code;
  }
  throw new Error("Não foi possível gerar um código único.");
}

const isMaster = (campaign, userId) => !!campaign && campaign.masterId === userId;

async function isMember(campaign, userId) {
  if (isMaster(campaign, userId)) return true;
  const r = await pool.query(`SELECT id FROM characters WHERE "campaignId" = $1 AND "ownerId" = $2`, [
    campaign.id,
    userId,
  ]);
  return r.rows.length > 0;
}

async function findCampaign(id, res) {
  const r = await pool.query("SELECT * FROM campaigns WHERE id = $1", [id]);
  if (!r.rows[0]) {
    res.status(404).json({ error: "Campanha não encontrada." });
    return null;
  }
  return r.rows[0];
}

async function create(req, res) {
  const { name, description } = req.body || {};
  if (!name) return res.status(400).json({ error: "Dê um nome à campanha." });
  const id = nanoid();
  const code = await generateUniqueCode();
  await pool.query(`INSERT INTO campaigns (id, code, name, description, "masterId") VALUES ($1,$2,$3,$4,$5)`, [
    id,
    code,
    name.trim(),
    description || "",
    req.user.id,
  ]);
  const r = await pool.query("SELECT * FROM campaigns WHERE id = $1", [id]);
  res.status(201).json({ campaign: serializeCampaign(r.rows[0]) });
}

async function listMineAsMaster(req, res) {
  const r = await pool.query(`SELECT * FROM campaigns WHERE "masterId" = $1 ORDER BY "updatedAt" DESC`, [
    req.user.id,
  ]);
  res.json({ campaigns: r.rows.map(serializeCampaign) });
}

async function listJoined(req, res) {
  const r = await pool.query(
    `SELECT DISTINCT c.* FROM campaigns c
     JOIN characters ch ON ch."campaignId" = c.id
     WHERE ch."ownerId" = $1 AND c."masterId" <> $1
     ORDER BY c."updatedAt" DESC`,
    [req.user.id]
  );
  res.json({ campaigns: r.rows.map(serializeCampaign) });
}

async function join(req, res) {
  const { code, characterId } = req.body || {};
  if (!code || !characterId) {
    return res.status(400).json({ error: "Informe o código da campanha e o personagem." });
  }
  const cr = await pool.query("SELECT * FROM campaigns WHERE code = $1", [String(code).trim().toUpperCase()]);
  const campaign = cr.rows[0];
  if (!campaign) return res.status(404).json({ error: "Código de campanha não encontrado." });

  const chr = await pool.query("SELECT * FROM characters WHERE id = $1", [characterId]);
  const character = chr.rows[0];
  if (!character || character.ownerId !== req.user.id) {
    return res.status(403).json({ error: "Esse personagem não é seu." });
  }
  if (campaign.masterId === req.user.id) {
    return res.status(400).json({ error: "Você é o mestre dessa campanha, não pode entrar como jogador." });
  }
  if (character.campaignId) {
    return res.status(400).json({ error: "Esse personagem já está em uma campanha. Remova-o antes de entrar em outra." });
  }
  await pool.query(`UPDATE characters SET "campaignId" = $1, "updatedAt" = NOW() WHERE id = $2`, [
    campaign.id,
    characterId,
  ]);
  res.json({ campaign: serializeCampaign(campaign) });
}

async function leave(req, res) {
  const campaign = await findCampaign(req.params.id, res);
  if (!campaign) return;
  const r = await pool.query(`SELECT id FROM characters WHERE "campaignId" = $1 AND "ownerId" = $2`, [
    campaign.id,
    req.user.id,
  ]);
  if (!r.rows[0]) return res.status(404).json({ error: "Você não tem personagem nessa campanha." });
  await pool.query(`UPDATE characters SET "campaignId" = NULL, "updatedAt" = NOW() WHERE id = $1`, [r.rows[0].id]);
  res.json({ ok: true });
}

async function getState(req, res) {
  const campaign = await findCampaign(req.params.id, res);
  if (!campaign) return;
  if (!(await isMember(campaign, req.user.id))) {
    return res.status(403).json({ error: "Você não faz parte dessa campanha." });
  }
  const master = isMaster(campaign, req.user.id);

  const chars = await pool.query(
    `SELECT ch.*, u."displayName" AS "ownerName"
     FROM characters ch LEFT JOIN users u ON u.id = ch."ownerId"
     WHERE ch."campaignId" = $1 ORDER BY ch.name ASC`,
    [campaign.id]
  );
  const owners = {};
  const characters = chars.rows.map((row) => {
    owners[row.id] = row.ownerName || "Desconhecido";
    const { ownerName, ...rest } = row; // eslint-disable-line no-unused-vars
    return serializeChar(rest);
  });

  const npcRows = await pool.query(`SELECT * FROM npcs WHERE "campaignId" = $1 ORDER BY "createdAt" ASC`, [
    campaign.id,
  ]);
  const npcs = npcRows.rows.filter((n) => master || n.revealed).map(serializeNpc);

  const log = await pool.query(
    `SELECT * FROM campaign_log WHERE "campaignId" = $1 ORDER BY "createdAt" DESC LIMIT 100`,
    [campaign.id]
  );

  res.json({
    campaign: serializeCampaign(campaign),
    role: master ? "mestre" : "jogador",
    characters,
    ownersByCharacterId: owners,
    npcs,
    log: log.rows,
  });
}

async function updateMeta(req, res) {
  const campaign = await findCampaign(req.params.id, res);
  if (!campaign) return;
  if (!isMaster(campaign, req.user.id)) return res.status(403).json({ error: "Só o mestre pode editar a campanha." });

  const body = req.body || {};
  const sets = [];
  const values = [];
  const push = (col, val) => {
    values.push(val);
    sets.push(`"${col}" = $${values.length}`);
  };
  if (body.name !== undefined) push("name", body.name);
  if (body.description !== undefined) push("description", body.description);
  if (body.moveBase !== undefined) push("moveBase", Math.max(1, Math.min(20, Math.round(Number(body.moveBase)) || 3)));
  if (body.tensionPoints !== undefined) push("tensionPoints", Math.max(0, Math.min(100, Number(body.tensionPoints) || 0)));
  if (sets.length === 0) return res.json({ campaign: serializeCampaign(campaign) });

  sets.push(`"updatedAt" = NOW()`);
  values.push(req.params.id);
  await pool.query(`UPDATE campaigns SET ${sets.join(", ")} WHERE id = $${values.length}`, values);
  const r = await pool.query("SELECT * FROM campaigns WHERE id = $1", [req.params.id]);
  res.json({ campaign: serializeCampaign(r.rows[0]) });
}

async function createNpc(req, res) {
  const campaign = await findCampaign(req.params.id, res);
  if (!campaign) return;
  if (!isMaster(campaign, req.user.id)) return res.status(403).json({ error: "Só o mestre pode criar NPCs/inimigos." });

  const body = req.body || {};
  if (!body.name) return res.status(400).json({ error: "Dê um nome ao NPC/inimigo." });
  const id = nanoid();
  const cols = [
    ["id", id],
    ["campaignId", campaign.id],
    ["kind", body.kind === "enemy" ? "enemy" : "npc"],
    ["name", body.name.trim()],
    ["race", body.race || null],
    ["classe", body.classe || null],
    ["level", Number(body.level) || null],
    ["attrs", JSON.stringify(body.attrs || {})],
    ["hpCurrent", Number(body.hpCurrent) || 0],
    ["hpMax", Number(body.hpMax) || 0],
    ["atk", Number(body.atk) || 0],
    ["def", Number(body.def) || 0],
    ["mag", Number(body.mag) || 0],
    ["abilities", JSON.stringify(body.abilities || [])],
    ["notes", body.notes || ""],
    ["revealed", body.revealed ? 1 : 0],
    ["portraitUrl", body.portraitUrl || null],
  ];
  await pool.query(
    `INSERT INTO npcs (${cols.map(([c]) => `"${c}"`).join(", ")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")})`,
    cols.map(([, v]) => v)
  );
  const r = await pool.query("SELECT * FROM npcs WHERE id = $1", [id]);
  res.status(201).json({ npc: serializeNpc(r.rows[0]) });
}

const NPC_FIELDS = ["kind", "name", "race", "classe", "level", "hpCurrent", "hpMax", "atk", "def", "mag", "notes", "revealed", "portraitUrl"];
const NPC_JSON_FIELDS = ["attrs", "abilities"];

async function updateNpc(req, res) {
  const campaign = await findCampaign(req.params.id, res);
  if (!campaign) return;
  if (!isMaster(campaign, req.user.id)) return res.status(403).json({ error: "Só o mestre pode editar NPCs/inimigos." });
  const nr = await pool.query(`SELECT * FROM npcs WHERE id = $1 AND "campaignId" = $2`, [req.params.npcId, campaign.id]);
  const npc = nr.rows[0];
  if (!npc) return res.status(404).json({ error: "NPC/inimigo não encontrado." });

  const body = req.body || {};
  const sets = [];
  const values = [];
  const push = (col, val) => {
    values.push(val);
    sets.push(`"${col}" = $${values.length}`);
  };
  for (const f of NPC_FIELDS) if (body[f] !== undefined) push(f, f === "revealed" ? (body[f] ? 1 : 0) : body[f]);
  for (const f of NPC_JSON_FIELDS) if (body[f] !== undefined) push(f, JSON.stringify(body[f]));
  if (sets.length === 0) return res.json({ npc: serializeNpc(npc) });

  sets.push(`"updatedAt" = NOW()`);
  values.push(req.params.npcId);
  await pool.query(`UPDATE npcs SET ${sets.join(", ")} WHERE id = $${values.length}`, values);
  const r = await pool.query("SELECT * FROM npcs WHERE id = $1", [req.params.npcId]);
  res.json({ npc: serializeNpc(r.rows[0]) });
}

async function deleteNpc(req, res) {
  const campaign = await findCampaign(req.params.id, res);
  if (!campaign) return;
  if (!isMaster(campaign, req.user.id)) return res.status(403).json({ error: "Só o mestre pode remover NPCs/inimigos." });
  await pool.query(`DELETE FROM npcs WHERE id = $1 AND "campaignId" = $2`, [req.params.npcId, campaign.id]);
  res.json({ ok: true });
}

async function addLog(req, res) {
  const campaign = await findCampaign(req.params.id, res);
  if (!campaign) return;
  if (!(await isMember(campaign, req.user.id))) return res.status(403).json({ error: "Você não faz parte dessa campanha." });
  const { message } = req.body || {};
  if (!message || !message.trim()) return res.status(400).json({ error: "Mensagem vazia." });
  const id = nanoid();
  await pool.query(`INSERT INTO campaign_log (id, "campaignId", "authorName", message) VALUES ($1,$2,$3,$4)`, [
    id,
    campaign.id,
    req.user.displayName,
    message.trim().slice(0, 500),
  ]);
  const r = await pool.query("SELECT * FROM campaign_log WHERE id = $1", [id]);
  res.status(201).json({ entry: r.rows[0] });
}

module.exports = { findCampaign, isMaster, isMember, create, listMineAsMaster, listJoined, join, leave, getState, updateMeta, createNpc, updateNpc, deleteNpc, addLog };
