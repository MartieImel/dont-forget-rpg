const { nanoid } = require("nanoid");
const { pool } = require("../db");
const { calcStatus, validateAttrs, validatePericias, validatePericiaBonus } = require("../utils/gameData");

function serialize(row) {
  if (!row) return null;
  return {
    ...row,
    attrs: JSON.parse(row.attrs || "{}"),
    pericias: JSON.parse(row.pericias || "{}"),
    inventory: JSON.parse(row.inventory || "[]"),
    equipment: JSON.parse(row.equipment || "{}"),
    abilities: JSON.parse(row.abilities || "[]"),
    aspectos: JSON.parse(row.aspectos || "[]"),
  };
}

async function getCharacterOr404(id, res) {
  const result = await pool.query("SELECT * FROM characters WHERE id = $1", [id]);
  const row = result.rows[0];
  if (!row) {
    res.status(404).json({ error: "Personagem não encontrado." });
    return null;
  }
  return row;
}

async function masterIdOf(campaignId) {
  const r = await pool.query(`SELECT "masterId" FROM campaigns WHERE id = $1`, [campaignId]);
  return r.rows[0] ? r.rows[0].masterId : null;
}

// Vê: dono, mestre da campanha, ou outro jogador da mesma campanha.
async function canView(row, userId) {
  if (row.ownerId === userId) return true;
  if (!row.campaignId) return false;
  if ((await masterIdOf(row.campaignId)) === userId) return true;
  const party = await pool.query(`SELECT id FROM characters WHERE "campaignId" = $1 AND "ownerId" = $2`, [
    row.campaignId,
    userId,
  ]);
  return party.rows.length > 0;
}

// Edita: dono, ou mestre da campanha do personagem.
async function canEdit(row, userId) {
  if (row.ownerId === userId) return true;
  if (!row.campaignId) return false;
  return (await masterIdOf(row.campaignId)) === userId;
}

async function listMine(req, res) {
  const result = await pool.query(`SELECT * FROM characters WHERE "ownerId" = $1 ORDER BY "updatedAt" DESC`, [
    req.user.id,
  ]);
  res.json({ characters: result.rows.map(serialize) });
}

async function create(req, res) {
  const body = req.body || {};
  if (!body.name || !body.race) return res.status(400).json({ error: "Nome e raça são obrigatórios." });

  const attrs = Object.assign({ GRR: 0, ESP: 0, FRM: 0, CHR: 0, RPZ: 0, MRL: 0 }, body.attrs || {});
  const level = Number(body.level) || 1;

  const attrCheck = validateAttrs(attrs, level);
  if (!attrCheck.valid) return res.status(400).json({ error: attrCheck.error });
  const periciaCheck = validatePericias(body.pericias || {}, attrs, level);
  if (!periciaCheck.valid) return res.status(400).json({ error: periciaCheck.error });

  const bonusCheck = validatePericiaBonus(body.classe, body.periciaBonusClasse);
  if (!bonusCheck.valid) return res.status(400).json({ error: bonusCheck.error });

  const status = calcStatus({
    grr: attrs.GRR,
    esp: attrs.ESP,
    frm: attrs.FRM,
    chr: attrs.CHR,
    rpz: attrs.RPZ,
    mrl: attrs.MRL,
    classeKey: body.classe,
    level,
    lv: Number(body.lv) || 1,
    hpBonusManual: body.hpBonusManual,
    hopeBonusManual: body.hopeBonusManual,
  });

  const id = nanoid();
  const cols = [
    ["id", id],
    ["ownerId", req.user.id],
    ["campaignId", null],
    ["name", body.name.trim()],
    ["titulo", body.titulo || ""],
    ["race", body.race],
    ["tracoOuElemento", body.tracoOuElemento || null],
    ["classe", body.classe || null],
    ["subclasse", body.subclasse || null],
    ["level", level],
    ["lv", Number(body.lv) || 1],
    ["karma", Number(body.karma) || 0],
    ["attrs", JSON.stringify(attrs)],
    ["pericias", JSON.stringify(body.pericias || {})],
    ["periciaBonusClasse", body.periciaBonusClasse || ""],
    ["hpCurrent", status.hpMax],
    ["hpMax", status.hpMax],
    ["hpBonusManual", Number(body.hpBonusManual) || 0],
    ["hopeCurrent", status.hope],
    ["hopeMax", status.hope],
    ["hopeBonusManual", Number(body.hopeBonusManual) || 0],
    ["atkBonus", Number(body.atkBonus) || 0],
    ["defBonus", Number(body.defBonus) || 0],
    ["magBonus", Number(body.magBonus) || 0],
    ["inventory", JSON.stringify(body.inventory || [])],
    ["equipment", JSON.stringify(body.equipment || {})],
    ["abilities", JSON.stringify(body.abilities || [])],
    ["abilitiesExtra", body.abilitiesExtra || ""],
    ["aspectos", JSON.stringify(body.aspectos || [])],
    ["historia", body.historia || ""],
    ["personalidade", body.personalidade || ""],
    ["aparencia", body.aparencia || ""],
    ["notes", body.notes || ""],
    ["portraitUrl", body.portraitUrl || null],
  ];
  // Colunas e placeholders montados a partir da mesma lista: impossível divergirem.
  const colSql = cols.map(([c]) => `"${c}"`).join(", ");
  const phSql = cols.map((_, i) => `$${i + 1}`).join(", ");
  await pool.query(
    `INSERT INTO characters (${colSql}) VALUES (${phSql})`,
    cols.map(([, v]) => v)
  );

  const result = await pool.query("SELECT * FROM characters WHERE id = $1", [id]);
  res.status(201).json({ character: serialize(result.rows[0]) });
}

async function getOne(req, res) {
  const row = await getCharacterOr404(req.params.id, res);
  if (!row) return;
  if (!(await canView(row, req.user.id))) return res.status(403).json({ error: "Sem acesso a esse personagem." });
  res.json({ character: serialize(row), editable: await canEdit(row, req.user.id) });
}

const EDITABLE_FIELDS = [
  "name", "titulo", "race", "tracoOuElemento", "classe", "subclasse", "level", "lv", "karma",
  "hpCurrent", "hpMax", "hpBonusManual", "hopeCurrent", "hopeMax", "hopeBonusManual",
  "atkBonus", "defBonus", "magBonus", "historia", "personalidade", "aparencia",
  "abilitiesExtra", "notes", "portraitUrl", "periciaBonusClasse",
];
const JSON_FIELDS = ["attrs", "pericias", "inventory", "equipment", "abilities", "aspectos"];

async function update(req, res) {
  const row = await getCharacterOr404(req.params.id, res);
  if (!row) return;
  if (!(await canEdit(row, req.user.id))) {
    return res.status(403).json({ error: "Sem permissão para editar esse personagem." });
  }
  const body = req.body || {};

  const newAttrs = body.attrs !== undefined ? body.attrs : JSON.parse(row.attrs);
  const newLevel = body.level !== undefined ? Number(body.level) : row.level;

  if (body.attrs !== undefined || body.level !== undefined) {
    const c = validateAttrs(newAttrs, newLevel);
    if (!c.valid) return res.status(400).json({ error: c.error });
  }
  if (body.pericias !== undefined || body.attrs !== undefined || body.level !== undefined) {
    const newPericias = body.pericias !== undefined ? body.pericias : JSON.parse(row.pericias);
    const c = validatePericias(newPericias, newAttrs, newLevel);
    if (!c.valid) return res.status(400).json({ error: c.error });
  }

  // Bônus de perícia da Classe: precisa ser uma das 3 opções da Classe atual.
  if (body.periciaBonusClasse !== undefined || body.classe !== undefined) {
    const effClasse = body.classe !== undefined ? body.classe : row.classe;
    const effBonus = body.periciaBonusClasse !== undefined ? body.periciaBonusClasse : row.periciaBonusClasse;
    const bc = validatePericiaBonus(effClasse, effBonus);
    if (!bc.valid) {
      if (body.periciaBonusClasse !== undefined) return res.status(400).json({ error: bc.error });
      body.periciaBonusClasse = ""; // só a Classe mudou: o bônus antigo deixou de valer
    }
  }

  const sets = [];
  const values = [];
  const push = (col, val) => {
    values.push(val);
    sets.push(`"${col}" = $${values.length}`);
  };

  for (const f of EDITABLE_FIELDS) if (body[f] !== undefined) push(f, body[f]);
  for (const f of JSON_FIELDS) if (body[f] !== undefined) push(f, JSON.stringify(body[f]));

  const recalc = ["attrs", "classe", "level", "lv", "hpBonusManual", "hopeBonusManual"].some(
    (k) => body[k] !== undefined
  );
  if (recalc) {
    const status = calcStatus({
      grr: newAttrs.GRR || 0,
      esp: newAttrs.ESP || 0,
      frm: newAttrs.FRM || 0,
      chr: newAttrs.CHR || 0,
      rpz: newAttrs.RPZ || 0,
      mrl: newAttrs.MRL || 0,
      classeKey: body.classe !== undefined ? body.classe : row.classe,
      level: newLevel,
      lv: body.lv !== undefined ? body.lv : row.lv,
      hpBonusManual: body.hpBonusManual !== undefined ? body.hpBonusManual : row.hpBonusManual,
      hopeBonusManual: body.hopeBonusManual !== undefined ? body.hopeBonusManual : row.hopeBonusManual,
    });
    if (body.hpMax === undefined) push("hpMax", status.hpMax);
    if (body.hopeMax === undefined) push("hopeMax", status.hope);
  }

  if (sets.length === 0) return res.json({ character: serialize(row) });

  sets.push(`"updatedAt" = NOW()`);
  values.push(req.params.id);
  await pool.query(`UPDATE characters SET ${sets.join(", ")} WHERE id = $${values.length}`, values);

  const updated = await pool.query("SELECT * FROM characters WHERE id = $1", [req.params.id]);
  res.json({ character: serialize(updated.rows[0]) });
}

async function remove(req, res) {
  const row = await getCharacterOr404(req.params.id, res);
  if (!row) return;
  if (row.ownerId !== req.user.id) return res.status(403).json({ error: "Só o dono pode excluir o personagem." });
  await pool.query("DELETE FROM characters WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
}

module.exports = { listMine, create, getOne, update, remove, serialize, canView, canEdit };
