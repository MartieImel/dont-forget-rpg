// Biblioteca de Cenas de Fuga da campanha. Qualquer membro lê (os jogadores vão precisar
// da cena para jogá-la); só o mestre cria, edita e apaga. Tudo passa pela validação.
const { nanoid } = require("nanoid");
const { pool } = require("../db");
const { findCampaign, isMaster, isMember } = require("./campaignController");
const { sanitizeScene } = require("../utils/sceneValidation");

const MAX_SCENES = 50;
const MAX_BYTES = 200 * 1024;

async function memberContext(req, res) {
  const campaign = await findCampaign(req.params.id, res);
  if (!campaign) return null;
  if (!(await isMember(campaign, req.user.id))) {
    res.status(403).json({ error: "Você não faz parte dessa campanha." });
    return null;
  }
  return campaign;
}

async function masterContext(req, res) {
  const campaign = await findCampaign(req.params.id, res);
  if (!campaign) return null;
  if (!isMaster(campaign, req.user.id)) {
    res.status(403).json({ error: "Só o mestre pode fazer isso." });
    return null;
  }
  return campaign;
}

function prepare(body, res) {
  const check = sanitizeScene(body && body.scene);
  if (!check.ok) {
    res.status(400).json({ error: check.error });
    return null;
  }
  const json = JSON.stringify(check.scene);
  if (Buffer.byteLength(json) > MAX_BYTES) {
    res.status(400).json({ error: "A cena é grande demais." });
    return null;
  }
  return { scene: check.scene, json };
}

async function list(req, res) {
  const campaign = await memberContext(req, res);
  if (!campaign) return;
  const r = await pool.query(`SELECT id, name, data, "updatedAt" FROM escape_scenes WHERE "campaignId" = $1 ORDER BY "updatedAt" DESC`, [campaign.id]);
  res.json({
    scenes: r.rows.map((row) => {
      const d = JSON.parse(row.data);
      return { id: row.id, name: row.name, duration: d.duration, damage: d.damage, itemCount: d.items.length, updatedAt: row.updatedAt };
    }),
  });
}

async function getOne(req, res) {
  const campaign = await memberContext(req, res);
  if (!campaign) return;
  const r = await pool.query(`SELECT * FROM escape_scenes WHERE id = $1 AND "campaignId" = $2`, [req.params.sceneId, campaign.id]);
  if (!r.rows[0]) return res.status(404).json({ error: "Cena não encontrada." });
  res.json({ id: r.rows[0].id, scene: JSON.parse(r.rows[0].data), updatedAt: r.rows[0].updatedAt });
}

async function create(req, res) {
  const campaign = await masterContext(req, res);
  if (!campaign) return;
  const p = prepare(req.body, res);
  if (!p) return;
  const count = await pool.query(`SELECT COUNT(*)::int AS n FROM escape_scenes WHERE "campaignId" = $1`, [campaign.id]);
  if (count.rows[0].n >= MAX_SCENES) return res.status(409).json({ error: `Limite de ${MAX_SCENES} cenas por campanha.` });
  const id = nanoid();
  await pool.query(`INSERT INTO escape_scenes (id, "campaignId", name, data) VALUES ($1,$2,$3,$4)`, [id, campaign.id, p.scene.name, p.json]);
  res.status(201).json({ id, scene: p.scene });
}

async function update(req, res) {
  const campaign = await masterContext(req, res);
  if (!campaign) return;
  const p = prepare(req.body, res);
  if (!p) return;
  const r = await pool.query(
    `UPDATE escape_scenes SET name = $1, data = $2, "updatedAt" = NOW() WHERE id = $3 AND "campaignId" = $4 RETURNING id`,
    [p.scene.name, p.json, req.params.sceneId, campaign.id]
  );
  if (!r.rows[0]) return res.status(404).json({ error: "Cena não encontrada." });
  res.json({ id: r.rows[0].id, scene: p.scene });
}

async function remove(req, res) {
  const campaign = await masterContext(req, res);
  if (!campaign) return;
  await pool.query(`DELETE FROM escape_scenes WHERE id = $1 AND "campaignId" = $2`, [req.params.sceneId, campaign.id]);
  res.json({ ok: true });
}

module.exports = { list, getOne, create, update, remove };
