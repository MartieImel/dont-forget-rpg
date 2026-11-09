const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.warn("AVISO: DATABASE_URL não definida. Configure a string de conexão do Postgres (ex: Neon).");
}

// Neon grava DUAS strings de conexão (`neon env pull`):
//   DATABASE_URL           -> "pooled" (host com -pooler): tráfego normal da aplicação
//   DATABASE_URL_UNPOOLED  -> direta: migrações/DDL (o pooler não é próprio pra isso)
// Em Postgres comum (local) só existe DATABASE_URL e as duas funções usam ela.
const trafficUrl = process.env.DATABASE_URL || "";
const schemaUrl = process.env.DATABASE_URL_UNPOOLED || trafficUrl;

// A string do Neon vem com "channel_binding=require", que o driver pg não
// suporta — removemos esse parâmetro (o resto da conexão segue seguro via SSL).
function cleanUrl(url) {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return url;
  }
}

// Neon e outros Postgres gerenciados exigem SSL (sslmode=require na URL).
function makePool(url, extra = {}) {
  const ssl = url.includes("sslmode=require") || process.env.PGSSL === "true";
  const p = new Pool({
    connectionString: url ? cleanUrl(url) : undefined,
    ssl: ssl ? { rejectUnauthorized: false } : false,
    // Neon "acorda" sob demanda: damos tempo de sobra pro primeiro acesso depois de dormir.
    connectionTimeoutMillis: 20000,
    ...extra,
  });
  // Sem isso, uma conexão ociosa derrubada pelo servidor derruba o Node inteiro.
  p.on("error", (err) => console.error("Conexão ociosa do Postgres caiu (ignorando):", err.message));
  return p;
}

const kind = (url) => (!url ? "não definida" : /-pooler\./.test(url) ? "pooled" : "direta");
console.log(`Banco: tráfego via conexão ${kind(trafficUrl)}; esquema via conexão ${kind(schemaUrl)}.`);

// Neon fecha conexões ociosas: fechamos as nossas antes (10 s).
const pool = makePool(trafficUrl, { max: 5, idleTimeoutMillis: 10000 });

async function initSchema() {
  const db = makePool(schemaUrl, { max: 1 }); // conexão direta, só para criar/ajustar tabelas
  try {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      "displayName" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      "masterId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      "tensionPoints" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      "ownerId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      "campaignId" TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      titulo TEXT NOT NULL DEFAULT '',
      race TEXT NOT NULL,
      "tracoOuElemento" TEXT,
      classe TEXT,
      subclasse TEXT,
      level INTEGER NOT NULL DEFAULT 1,
      lv INTEGER NOT NULL DEFAULT 1,
      karma INTEGER NOT NULL DEFAULT 0,
      attrs TEXT NOT NULL,
      pericias TEXT NOT NULL,
      "periciaBonusClasse" TEXT NOT NULL DEFAULT '',
      "hpCurrent" INTEGER NOT NULL DEFAULT 0,
      "hpMax" INTEGER NOT NULL DEFAULT 0,
      "hpBonusManual" INTEGER NOT NULL DEFAULT 0,
      "hopeCurrent" INTEGER NOT NULL DEFAULT 0,
      "hopeMax" INTEGER NOT NULL DEFAULT 0,
      "hopeBonusManual" INTEGER NOT NULL DEFAULT 0,
      "atkBonus" INTEGER NOT NULL DEFAULT 0,
      "defBonus" INTEGER NOT NULL DEFAULT 0,
      "magBonus" INTEGER NOT NULL DEFAULT 0,
      inventory TEXT NOT NULL DEFAULT '[]',
      equipment TEXT NOT NULL DEFAULT '{}',
      abilities TEXT NOT NULL DEFAULT '[]',
      "abilitiesExtra" TEXT NOT NULL DEFAULT '',
      aspectos TEXT NOT NULL DEFAULT '[]',
      historia TEXT NOT NULL DEFAULT '',
      personalidade TEXT NOT NULL DEFAULT '',
      aparencia TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      "portraitUrl" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS npcs (
      id TEXT PRIMARY KEY,
      "campaignId" TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      kind TEXT NOT NULL DEFAULT 'npc',
      name TEXT NOT NULL,
      race TEXT,
      classe TEXT,
      level INTEGER,
      attrs TEXT NOT NULL DEFAULT '{}',
      "hpCurrent" INTEGER NOT NULL DEFAULT 0,
      "hpMax" INTEGER NOT NULL DEFAULT 0,
      atk INTEGER NOT NULL DEFAULT 0,
      def INTEGER NOT NULL DEFAULT 0,
      mag INTEGER NOT NULL DEFAULT 0,
      abilities TEXT NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '',
      revealed INTEGER NOT NULL DEFAULT 0,
      "portraitUrl" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS campaign_log (
      id TEXT PRIMARY KEY,
      "campaignId" TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      "authorName" TEXT NOT NULL,
      message TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

  // Bancos criados antes do bônus de perícia da Classe ganham a coluna aqui.
  await db.query(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS "periciaBonusClasse" TEXT NOT NULL DEFAULT ''`);

  // ---- Tabuleiro tático (Fase A) ----
  await db.query(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      "campaignId" TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      cols INTEGER NOT NULL DEFAULT 20,
      rows INTEGER NOT NULL DEFAULT 14,
      "backgroundUrl" TEXT,
      turn INTEGER NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await db.query(`
    CREATE TABLE IF NOT EXISTS board_tokens (
      id TEXT PRIMARY KEY,
      "boardId" TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      "refId" TEXT NOT NULL,
      x INTEGER NOT NULL DEFAULT 0,
      y INTEGER NOT NULL DEFAULT 0,
      "startX" INTEGER NOT NULL DEFAULT 0,
      "startY" INTEGER NOT NULL DEFAULT 0,
      UNIQUE ("boardId", kind, "refId")
    )`);
  await db.query(`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS "activeBoardId" TEXT REFERENCES boards(id) ON DELETE SET NULL`);
  await db.query(`
    CREATE TABLE IF NOT EXISTS escape_scenes (
      id TEXT PRIMARY KEY,
      "campaignId" TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      data TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await db.query(`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS "moveBase" INTEGER NOT NULL DEFAULT 3`);
  } finally {
    await db.end();
  }
}

module.exports = { pool, initSchema };
