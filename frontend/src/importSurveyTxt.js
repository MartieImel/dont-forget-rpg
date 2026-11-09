// Importa o .txt gerado pelo SURVEY_PROGRAM.EXE e adapta o personagem às
// regras atuais (livro v0.5.2): orçamento de atributos, teto por atributo,
// orçamento/teto das perícias e nomes que mudaram (ex.: Sanguessuga -> Vampiro).
import { ATTR_LIMIT, ATTR_TOTAL, PERICIA_CAP } from "./gameDataHelpers.js";

const norm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const RENAMED_SUBCLASSES = { sanguessuga: "Vampiro" };

function pick(list, value, getKey = (x) => x) {
  const n = norm(value);
  return list.find((item) => norm(getKey(item)) === n) || null;
}

// ---------- 1) Leitura do texto ----------
export function parseSurveyTxt(text) {
  const t = String(text || "").replace(/\r\n?/g, "\n");
  if (!/FICHA DE RECEPT/i.test(t)) {
    return { ok: false, error: "Esse arquivo não parece ser uma ficha gerada pelo Survey Program." };
  }
  const line = (re) => {
    const m = t.match(re);
    return m ? m[1].trim() : "";
  };

  const racaMatch = t.match(/^Raça:\s*([^(\n]+?)\s*(?:\(([^)]+)\))?\s*$/m);
  const classeMatch = t.match(/^Classe:\s*(.+?)\s*[—–-]+\s*Trilha:\s*(.+)$/m);

  const section = (startRe, endRe) => {
    const s = t.search(startRe);
    if (s < 0) return "";
    const rest = t.slice(s).split("\n").slice(1).join("\n");
    const e = rest.search(endRe);
    return e < 0 ? rest : rest.slice(0, e);
  };

  const attrs = {};
  for (const m of section(/^Atributos:/m, /^Perícias:|^Status calculado|^Sentimento/m).matchAll(/\(([A-Z]{3})\):\s*(\d+)/g)) {
    attrs[m[1]] = Number(m[2]);
  }
  const pericias = [];
  for (const m of section(/^Perícias:/m, /^Status calculado|^Sentimento|^=+/m).matchAll(/^\s+(.+?):\s*(\d+)\s*$/gm)) {
    pericias.push({ nome: m[1].trim(), valor: Number(m[2]) });
  }

  const raw = {
    jogador: line(/^Jogador\(a\):\s*(.+)$/m),
    nome: line(/^Receptáculo:\s*(.+)$/m),
    raca: racaMatch ? racaMatch[1].trim() : "",
    alma: racaMatch && racaMatch[2] ? racaMatch[2].trim() : "",
    origem: line(/^Origem:\s*(.+)$/m),
    classe: classeMatch ? classeMatch[1].trim() : "",
    trilha: classeMatch ? classeMatch[2].trim() : "",
    sentimento: line(/^Sentimento sobre a criação:\s*(.+)$/m),
    attrs,
    pericias,
  };
  if (!raw.nome || !raw.raca || !raw.classe || Object.keys(attrs).length < 6) {
    return { ok: false, error: "A ficha está incompleta (faltam nome, raça, classe ou atributos)." };
  }
  return { ok: true, raw };
}

// ---------- 2) Ajustes às regras novas ----------

// Reduz os atributos proporcionalmente (maior resto) até caberem no orçamento.
// Nunca ACRESCENTA pontos: se já cabe, só corta o que passa do teto.
export function fitAttributes(attrs, keys, total, cap) {
  const clipped = {};
  keys.forEach((k) => (clipped[k] = Math.min(Math.max(0, Number(attrs[k]) || 0), cap)));
  const sum = keys.reduce((a, k) => a + clipped[k], 0);
  if (sum <= total) return clipped;

  const base = {};
  const frac = {};
  keys.forEach((k) => {
    const num = clipped[k] * total; // aritmética inteira: sem erro de ponto flutuante
    base[k] = Math.floor(num / sum);
    frac[k] = num % sum;
  });
  let rem = total - keys.reduce((a, k) => a + base[k], 0);
  const order = [...keys].sort(
    (a, b) => frac[b] - frac[a] || clipped[b] - clipped[a] || keys.indexOf(a) - keys.indexOf(b)
  );
  for (const k of order) {
    if (rem <= 0) break;
    if (frac[k] > 0 && base[k] < cap) {
      base[k] += 1;
      rem -= 1;
    }
  }
  return base;
}

export function buildDraft(raw, gameData, level = 1) {
  const notes = [];
  const attrKeys = gameData.ATTRIBUTES.map((a) => a.key);
  const attrName = (k) => gameData.ATTRIBUTES.find((a) => a.key === k)?.name || k;

  // Raça / Alma
  const race = pick(gameData.RACES, raw.raca) || "Humano";
  if (!pick(gameData.RACES, raw.raca)) notes.push(`Raça "${raw.raca}" não reconhecida — usei Humano.`);
  let alma = "";
  if (race === "Humano") alma = pick(gameData.TRACOS_HUMANOS, raw.alma) || "";
  if (race === "Monstro") alma = pick(gameData.ELEMENTOS_MONSTRO, raw.alma, (e) => e.key)?.key || "";
  if (race !== "Darkner" && !alma) notes.push(`Alma/Elemento "${raw.alma}" não reconhecido — escolha na aba Info.`);

  // Classe / Trilha
  const classe = pick(gameData.CLASSES, raw.classe, (c) => c.key);
  if (!classe) notes.push(`Classe "${raw.classe}" não reconhecida — escolha na aba Info.`);
  let subclasse = "";
  if (classe) {
    const renamed = RENAMED_SUBCLASSES[norm(raw.trilha)];
    subclasse = renamed && classe.subclasses.includes(renamed) ? renamed : pick(classe.subclasses, raw.trilha) || "";
    if (renamed && subclasse === renamed) notes.push(`Trilha "${raw.trilha}" agora se chama "${renamed}".`);
    else if (!subclasse) notes.push(`Trilha "${raw.trilha}" não existe mais na Classe ${classe.key} — escolha na aba Info.`);
  }

  // Atributos
  const total = ATTR_TOTAL(null, level);
  const cap = ATTR_LIMIT(null, level);
  const before = attrKeys.reduce((a, k) => a + (Number(raw.attrs[k]) || 0), 0);
  const attrs = fitAttributes(raw.attrs, attrKeys, total, cap);
  const changedAttrs = attrKeys.filter((k) => attrs[k] !== (Number(raw.attrs[k]) || 0));
  if (changedAttrs.length) {
    notes.push(
      `Atributos ajustados às regras novas (${before} → ${attrKeys.reduce((a, k) => a + attrs[k], 0)} pontos, teto ${cap}): ` +
        changedAttrs.map((k) => `${attrName(k)} ${Number(raw.attrs[k]) || 0}→${attrs[k]}`).join(", ") +
        ". Revise e redistribua se preferir."
    );
  }

  // Perícias: teto por perícia + soma por atributo <= valor do atributo
  const pericias = {};
  gameData.PERICIAS.forEach((p) => (pericias[p.key] = 0));
  const periciaOriginal = {};
  for (const { nome, valor } of raw.pericias) {
    const p = pick(gameData.PERICIAS, nome, (x) => x.name);
    if (!p) {
      notes.push(`Perícia "${nome}" não reconhecida — ignorada.`);
      continue;
    }
    periciaOriginal[p.key] = valor;
    pericias[p.key] = Math.min(valor, PERICIA_CAP(level));
  }
  for (const attrKey of attrKeys) {
    const group = gameData.PERICIAS.filter((p) => p.attr === attrKey);
    let sum = group.reduce((a, p) => a + pericias[p.key], 0);
    while (sum > attrs[attrKey]) {
      const top = [...group].reverse().reduce((best, p) => (pericias[p.key] > (best ? pericias[best.key] : 0) ? p : best), null);
      pericias[top.key] -= 1;
      sum -= 1;
    }
  }
  const changedPericias = gameData.PERICIAS.filter((p) => periciaOriginal[p.key] !== undefined && periciaOriginal[p.key] !== pericias[p.key]);
  if (changedPericias.length) {
    notes.push(
      `Perícias ajustadas (teto ${PERICIA_CAP(level)} por perícia; soma limitada ao valor do atributo): ` +
        changedPericias.map((p) => `${p.name} ${periciaOriginal[p.key]}→${pericias[p.key]}`).join(", ") +
        "."
    );
  }
  if (classe) notes.push("Escolha o bônus de perícia da Classe (+1) na aba Info — o Survey antigo não pedia isso.");

  const draft = {
    name: raw.nome,
    race,
    tracoOuElemento: alma,
    classe: classe ? classe.key : "",
    subclasse,
    level,
    lv: 1,
    karma: 0,
    attrs,
    pericias,
    periciaBonusClasse: "",
    historia: race === "Darkner" && raw.origem ? `Nasceu de ${raw.origem.replace(/\.$/, "").toLowerCase()}.` : "",
    notes:
      `Importado do Survey Program.` +
      (raw.jogador ? ` Jogador(a): ${raw.jogador}.` : "") +
      (raw.sentimento ? ` Sentimento sobre a criação: ${raw.sentimento}.` : ""),
  };
  return { draft, notes };
}
