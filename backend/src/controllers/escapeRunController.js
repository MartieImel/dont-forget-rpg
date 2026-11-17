// Lançar uma Cena de Fuga: sala de espera -> começar (contagem pelo relógio do servidor) ->
// todos jogam a mesma cena -> resultado. O servidor é quem decide o HP e o fim do encontro;
// a posição das almas é efêmera (memória) e o resto (acertos, HP, resultado) vai pro banco.
//
// Limite honesto: o acerto é detectado no aparelho de cada jogador. O servidor confere a
// janela de tempo do acerto, limita o ritmo (1 por ~0,8 s, a invulnerabilidade da cena é 1 s)
// e o total de acertos, mas não consegue PROVAR que o acerto aconteceu.
const { nanoid } = require("nanoid");
const { pool } = require("../db");
const { findCampaign, isMaster, isMember } = require("./campaignController");
const { LEAD_IN_MS, COUNTDOWN_MS, live, endsAt, finish, endIfOver } = require("../utils/escapeRuns");

const MIN_HIT_GAP_MS = 800;
const HIT_TIME_TOLERANCE_S = 3;

const summary = (run) => ({
  id: run.id,
  status: run.status,
  sceneName: run.sceneName,
  damage: run.damage,
  duration: run.duration,
  startsAt: run.startsAt === null ? null : Number(run.startsAt),
  serverTime: Date.now(),
});

async function context(req, res, { master = false, joined = false } = {}) {
  const campaign = await findCampaign(req.params.id, res);
  if (!campaign) return null;
  if (!(await isMember(campaign, req.user.id))) {
    res.status(403).json({ error: "Você não faz parte dessa campanha." });
    return null;
  }
  const isGm = isMaster(campaign, req.user.id);
  if (master && !isGm) {
    res.status(403).json({ error: "Só o mestre pode fazer isso." });
    return null;
  }
  const r = await pool.query(`SELECT * FROM escape_runs WHERE id = $1 AND "campaignId" = $2`, [req.params.runId, campaign.id]);
  if (!r.rows[0]) {
    res.status(404).json({ error: "Encontro não encontrado." });
    return null;
  }
  const run = await endIfOver(r.rows[0]);
  let me = null;
  if (!isGm) {
    const p = await pool.query(`SELECT * FROM escape_run_players WHERE "runId" = $1 AND "userId" = $2`, [run.id, req.user.id]);
    me = p.rows[0] || null;
  }
  if (joined && !isGm && !me) {
    res.status(403).json({ error: "Você não entrou nesse encontro." });
    return null;
  }
  return { campaign, run, isGm, me };
}

async function playersOf(runId) {
  const r = await pool.query(`SELECT * FROM escape_run_players WHERE "runId" = $1 ORDER BY "joinedAt" ASC`, [runId]);
  const pos = live.get(runId);
  return r.rows.map((p) => {
    const l = pos && pos.get(p.characterId);
    return {
      characterId: p.characterId, name: p.name, hp: p.hp, hpMax: p.hpMax, hits: p.hits, damageTaken: p.damageTaken,
      result: p.result, x: l ? l.x : null, y: l ? l.y : null,
    };
  });
}

// ---------- mestre: lançar, começar, cancelar ----------
async function launch(req, res) {
  const campaign = await findCampaign(req.params.id, res);
  if (!campaign) return;
  if (!isMaster(campaign, req.user.id)) return res.status(403).json({ error: "Só o mestre pode lançar uma Cena de Fuga." });

  const open = await pool.query(`SELECT * FROM escape_runs WHERE "campaignId" = $1 AND status IN ('lobby','running')`, [campaign.id]);
  for (const r of open.rows) {
    const after = await endIfOver(r);
    if (after.status !== "finished") return res.status(409).json({ error: "Já há uma Cena de Fuga em andamento. Cancele ou espere terminar.", runId: r.id });
  }

  const sc = await pool.query(`SELECT * FROM escape_scenes WHERE id = $1 AND "campaignId" = $2`, [req.body && req.body.sceneId, campaign.id]);
  if (!sc.rows[0]) return res.status(404).json({ error: "Cena não encontrada na biblioteca." });
  const scene = JSON.parse(sc.rows[0].data);
  const id = nanoid();
  // guarda uma CÓPIA da cena: editar a biblioteca no meio da sessão não muda o encontro
  await pool.query(
    `INSERT INTO escape_runs (id, "campaignId", "sceneId", "sceneName", scene, damage, duration) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, campaign.id, sc.rows[0].id, scene.name, sc.rows[0].data, scene.damage, scene.duration]
  );
  const run = (await pool.query(`SELECT * FROM escape_runs WHERE id = $1`, [id])).rows[0];
  res.status(201).json({ run: summary(run) });
}

async function start(req, res) {
  const c = await context(req, res, { master: true });
  if (!c) return;
  if (c.run.status !== "lobby") return res.status(409).json({ error: "Esse encontro não está na sala de espera." });
  const n = await pool.query(`SELECT COUNT(*)::int AS n FROM escape_run_players WHERE "runId" = $1`, [c.run.id]);
  if (n.rows[0].n === 0) return res.status(400).json({ error: "Ninguém entrou ainda." });
  await pool.query(`UPDATE escape_runs SET status = 'running', "startsAt" = $1 WHERE id = $2`, [Date.now() + COUNTDOWN_MS, c.run.id]);
  const run = (await pool.query(`SELECT * FROM escape_runs WHERE id = $1`, [c.run.id])).rows[0];
  res.json({ run: summary(run) });
}

async function cancel(req, res) {
  const c = await context(req, res, { master: true });
  if (!c) return;
  if (c.run.status === "lobby" || c.run.status === "running") {
    await pool.query(`UPDATE escape_run_players SET result = CASE WHEN hp > 0 THEN 'alive' ELSE 'dead' END WHERE "runId" = $1 AND result = 'joined'`, [c.run.id]);
    await pool.query(`UPDATE escape_runs SET status = 'cancelled', "endedAt" = NOW() WHERE id = $1`, [c.run.id]);
    live.delete(c.run.id);
  }
  res.json({ ok: true });
}

// ---------- leitura ----------
async function getRun(req, res) {
  const c = await context(req, res);
  if (!c) return;
  const out = { run: summary(c.run), players: await playersOf(c.run.id), role: c.isGm ? "mestre" : "jogador", joined: !!c.me, characterId: c.me ? c.me.characterId : null };
  if (!c.isGm && !c.me && c.run.status === "lobby") {
    const mine = await pool.query(`SELECT id, name, "hpCurrent", "hpMax" FROM characters WHERE "campaignId" = $1 AND "ownerId" = $2 ORDER BY name`, [c.campaign.id, req.user.id]);
    out.myCharacters = mine.rows.map((r) => ({ id: r.id, name: r.name, hp: r.hpCurrent, hpMax: r.hpMax }));
  }
  res.json(out);
}

async function getScene(req, res) {
  const c = await context(req, res);
  if (!c) return;
  if (!c.isGm && !c.me) return res.status(403).json({ error: "Você não entrou nesse encontro." });
  res.json({ scene: JSON.parse(c.run.scene) });
}

// ---------- jogador: entrar ----------
async function join(req, res) {
  const c = await context(req, res);
  if (!c) return;
  if (c.isGm) return res.status(400).json({ error: "O mestre acompanha; só jogadores entram na cena." });
  if (c.run.status !== "lobby") return res.status(409).json({ error: "A cena já começou ou terminou." });
  if (c.me) return res.status(409).json({ error: "Você já entrou." });
  const ch = await pool.query(`SELECT * FROM characters WHERE id = $1`, [req.body && req.body.characterId]);
  const character = ch.rows[0];
  if (!character || character.ownerId !== req.user.id || character.campaignId !== c.campaign.id) {
    return res.status(403).json({ error: "Esse personagem não é seu ou não está nessa campanha." });
  }
  if (character.hpCurrent <= 0) return res.status(400).json({ error: "Esse personagem está com 0 de HP." });
  await pool.query(
    `INSERT INTO escape_run_players ("runId", "characterId", "userId", name, "hpStart", hp, "hpMax") VALUES ($1,$2,$3,$4,$5,$5,$6)`,
    [c.run.id, character.id, req.user.id, character.name, character.hpCurrent, character.hpMax]
  );
  res.status(201).json({ ok: true, characterId: character.id, hp: character.hpCurrent, hpMax: character.hpMax });
}

// ---------- ao vivo ----------
async function liveView(c, extra = {}) {
  return { run: summary(c.run), players: await playersOf(c.run.id), ...extra };
}

async function getLive(req, res) {
  const c = await context(req, res);
  if (!c) return;
  res.json(await liveView(c));
}

// o jogador manda a própria posição e recebe a dos outros (uma ida e volta só)
async function postState(req, res) {
  const c = await context(req, res, { joined: true });
  if (!c) return;
  const { x, y } = req.body || {};
  if (Number.isFinite(x) && Number.isFinite(y) && c.run.status === "running") {
    if (!live.has(c.run.id)) live.set(c.run.id, new Map());
    live.get(c.run.id).set(c.me.characterId, { x: Math.max(-50, Math.min(530, x)), y: Math.max(-50, Math.min(350, y)), at: Date.now() });
  }
  res.json(await liveView(c, { me: c.me ? { characterId: c.me.characterId, hp: c.me.hp, result: c.me.result } : null }));
}

async function hit(req, res) {
  const c = await context(req, res, { joined: true });
  if (!c) return;
  if (c.run.status !== "running" || c.run.startsAt === null) return res.status(409).json({ error: "A cena não está em andamento." });
  const now = Date.now();
  const t = req.body && req.body.t;
  if (!Number.isFinite(t)) return res.status(400).json({ error: "Instante do acerto inválido." });
  if (c.me.result !== "joined") return res.status(409).json({ error: "Você já terminou essa cena.", hp: c.me.hp });

  const expected = (now - Number(c.run.startsAt)) / 1000 - LEAD_IN_MS / 1000; // tempo de cena segundo o relógio do servidor
  if (expected < -0.5 || t < -0.1 || Math.abs(t - expected) > HIT_TIME_TOLERANCE_S) {
    return res.status(400).json({ error: "Acerto fora da janela de tempo da cena." });
  }
  if (c.me.lastHitAt !== null && now - Number(c.me.lastHitAt) < MIN_HIT_GAP_MS) {
    return res.status(429).json({ error: "Acertos rápidos demais.", hp: c.me.hp });
  }
  if (c.me.hits >= Math.ceil(c.run.duration) + 2) return res.status(429).json({ error: "Acertos demais para essa cena.", hp: c.me.hp });

  // HP da ficha é o que vale (e o tabuleiro mostra na hora)
  const before = (await pool.query(`SELECT "hpCurrent" FROM characters WHERE id = $1`, [c.me.characterId])).rows[0];
  if (!before) return res.status(404).json({ error: "Personagem não encontrado." });
  const after = (await pool.query(
    `UPDATE characters SET "hpCurrent" = GREATEST(0, "hpCurrent" - $1), "updatedAt" = NOW() WHERE id = $2 RETURNING "hpCurrent"`,
    [c.run.damage, c.me.characterId]
  )).rows[0].hpCurrent;
  const dead = after <= 0;
  await pool.query(
    `UPDATE escape_run_players SET hp = $1, hits = hits + 1, "damageTaken" = "damageTaken" + $2, "lastHitAt" = $3, result = $4 WHERE "runId" = $5 AND "characterId" = $6`,
    [after, before.hpCurrent - after, now, dead ? "dead" : "joined", c.run.id, c.me.characterId]
  );
  await endIfOver(c.run); // se foi o último a cair, o encontro acaba
  res.json({ hp: after, dead });
}

// o jogador avisa que chegou ao fim da cena
async function finishMine(req, res) {
  const c = await context(req, res, { joined: true });
  if (!c) return;
  if (c.run.status !== "running") return res.json({ ok: true, status: c.run.status });
  if (Date.now() < endsAt(c.run) - 1500) return res.status(400).json({ error: "A cena ainda não terminou." });
  await pool.query(
    `UPDATE escape_run_players SET result = CASE WHEN hp > 0 THEN 'alive' ELSE 'dead' END WHERE "runId" = $1 AND "characterId" = $2 AND result = 'joined'`,
    [c.run.id, c.me.characterId]
  );
  const after = await endIfOver(c.run);
  res.json({ ok: true, status: after.status });
}

module.exports = { launch, start, cancel, getRun, getScene, join, getLive, postState, hit, finishMine };
