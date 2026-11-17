// Regras de tempo e fim dos encontros de Cena de Fuga (compartilhadas pelo controlador e pelas
// respostas do tabuleiro/campanha, que avisam os jogadores de que há uma cena ativa).
const { pool } = require("../db");

const LEAD_IN_MS = 1000; // "prepare-se" antes de t = 0 (igual ao LEAD_IN do motor)
const COUNTDOWN_MS = 4000; // contagem regressiva entre o "Começar" do mestre e o início
const FINISH_GRACE_MS = 3000; // folga depois do fim da cena antes de encerrar sozinho

// posições ao vivo das almas: só em memória (efêmero, não vale gravar a 4 Hz no banco)
const live = new Map(); // runId -> Map(characterId -> { x, y, status, at })

// momento (ms do servidor) em que a cena termina de verdade
const endsAt = (run) => Number(run.startsAt) + LEAD_IN_MS + run.duration * 1000;

async function finish(runId) {
  await pool.query(
    `UPDATE escape_run_players SET result = CASE WHEN hp > 0 THEN 'alive' ELSE 'dead' END WHERE "runId" = $1 AND result = 'joined'`,
    [runId]
  );
  await pool.query(`UPDATE escape_runs SET status = 'finished', "endedAt" = NOW() WHERE id = $1 AND status = 'running'`, [runId]);
  live.delete(runId);
}

// encerra sozinho: passou do fim da cena (+folga) ou todos já terminaram/caíram.
// Devolve a linha da run atualizada.
async function endIfOver(run) {
  if (!run || run.status !== "running" || run.startsAt === null) return run;
  let over = Date.now() > endsAt(run) + FINISH_GRACE_MS;
  if (!over) {
    const r = await pool.query(`SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE result = 'joined')::int AS open FROM escape_run_players WHERE "runId" = $1`, [run.id]);
    over = r.rows[0].n > 0 && r.rows[0].open === 0;
  }
  if (!over) return run;
  await finish(run.id);
  return { ...run, status: "finished" };
}

// cena ativa (em sala de espera ou em andamento) da campanha, ou null
async function activeEscape(campaignId) {
  const r = await pool.query(
    `SELECT * FROM escape_runs WHERE "campaignId" = $1 AND status IN ('lobby', 'running') ORDER BY "createdAt" DESC LIMIT 1`,
    [campaignId]
  );
  const run = await endIfOver(r.rows[0]);
  if (!run || run.status === "finished") return null;
  return { id: run.id, status: run.status, sceneName: run.sceneName, damage: run.damage, startsAt: run.startsAt === null ? null : Number(run.startsAt) };
}

module.exports = { LEAD_IN_MS, COUNTDOWN_MS, FINISH_GRACE_MS, live, endsAt, finish, endIfOver, activeEscape };
