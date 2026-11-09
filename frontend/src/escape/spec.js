// Limites e valores padrão de cada tipo de item, e a "faxina" (sanitizeScene) usada ao
// importar/abrir cenas: garante que nenhum valor quebre ou trave o jogo (ex.: uma rajada
// com 1 milhão de balas). O servidor aplica as MESMAS regras ao salvar
// (backend/src/utils/sceneValidation.js) — se mudar aqui, mude lá.
export const BOX = { w: 480, h: 300 };
export const LIMITS = { duration: [3, 120], damage: [1, 999], maxItems: 400, maxBullets: 6000, nameMax: 60 };
export const ITEM_TYPES = ["bullet", "burst", "orbit", "homing", "wall", "laser"];

const X = [-60, 540], Y = [-60, 360];
export const SPEC = {
  bullet: { x: X, y: Y, vx: [-600, 600], vy: [-600, 600], r: [2, 30] },
  burst: { x: X, y: Y, count: [1, 48], speed: [20, 500], r: [2, 20], arc: [10, 360], angle: [-360, 360], rings: [1, 60], interval: [0.05, 3], twist: [-180, 180] },
  orbit: { cx: X, cy: Y, vx: [-300, 300], vy: [-300, 300], radius: [10, 300], count: [1, 24], omega: [-720, 720], r: [2, 20], life: [0.5, 30], grow: [-100, 100], angle: [-360, 360] },
  homing: { x: X, y: Y, speed: [20, 400], turn: [0, 360], life: [0.5, 30], r: [2, 20] },
  wall: { speed: [20, 500], thickness: [4, 60], gapStart: [0, 480], gapSize: [0, 480] },
  laser: { pos: [0, 480], thickness: [4, 80], warn: [0.2, 5], active: [0.1, 5] },
};
export const INT_FIELDS = new Set(["count", "rings"]);
export const ENUMS = { wall: { dir: ["left", "right", "up", "down"] }, laser: { axis: ["h", "v"] } };

// valores iniciais ao criar um item novo no editor
export const DEFAULTS = {
  bullet: { vx: 0, vy: 110, r: 5 },
  burst: { count: 12, speed: 110, r: 5, arc: 360, angle: 0, rings: 1, interval: 0.3, twist: 0 },
  orbit: { vx: 0, vy: 0, radius: 60, count: 6, omega: 90, r: 5, life: 6, grow: 0, angle: 0 },
  homing: { speed: 70, turn: 60, life: 8, r: 6 },
  wall: { dir: "left", speed: 140, thickness: 16, gapSize: 95 },
  laser: { axis: "h", thickness: 18, warn: 1, active: 0.6 },
};

// nome legível de cada campo (usado no formulário do editor)
export const LABELS = {
  x: "X", y: "Y", cx: "Centro X", cy: "Centro Y", vx: "Veloc. X", vy: "Veloc. Y", r: "Raio",
  count: "Quantidade", speed: "Velocidade", arc: "Abertura (°)", angle: "Ângulo (°)", rings: "Anéis",
  interval: "Intervalo (s)", twist: "Giro por anel (°)", radius: "Raio da órbita", omega: "Giro (°/s)",
  life: "Duração (s)", grow: "Raio cresce (px/s)", turn: "Curva (°/s)", dir: "Direção", thickness: "Espessura",
  gapStart: "Brecha começa", gapSize: "Tamanho da brecha", axis: "Eixo", pos: "Posição", warn: "Aviso (s)", active: "Ativo (s)",
};

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const clampTo = ([a, b], v) => Math.min(b, Math.max(a, v));
const round3 = (v) => Math.round(v * 1000) / 1000;

function cleanNum(raw, range, def, isInt) {
  let v = isNum(raw) ? raw : def;
  if (!isNum(v)) return null;
  v = clampTo(range, v);
  return isInt ? Math.round(v) : round3(v);
}

export function sanitizeItem(raw, duration, fallbackId) {
  if (!raw || typeof raw !== "object" || !ITEM_TYPES.includes(raw.type)) return { error: "tipo de item desconhecido" };
  const spec = SPEC[raw.type];
  const out = { type: raw.type };
  let id = typeof raw.id === "string" ? raw.id.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40) : "";
  out.id = id || fallbackId;
  out.t = cleanNum(raw.t, [0, Math.max(0, duration - 0.05)], 0, false);
  for (const key of Object.keys(spec)) {
    const def = DEFAULTS[raw.type][key] ?? (key === "x" || key === "cx" ? 240 : key === "y" || key === "cy" ? 150 : undefined);
    const v = cleanNum(raw[key], spec[key], def, INT_FIELDS.has(key));
    if (v === null) return { error: `campo "${key}" ausente ou inválido` };
    out[key] = v;
  }
  for (const [key, allowed] of Object.entries(ENUMS[raw.type] || {})) {
    out[key] = allowed.includes(raw[key]) ? raw[key] : DEFAULTS[raw.type][key];
  }
  if (raw.type === "wall") {
    const across = out.dir === "left" || out.dir === "right" ? BOX.h : BOX.w;
    out.gapSize = Math.min(out.gapSize, across);
    out.gapStart = clampTo([0, across - out.gapSize], out.gapStart);
  }
  if (raw.type === "laser") out.pos = clampTo([0, out.axis === "h" ? BOX.h : BOX.w], out.pos);
  return { item: out };
}

export function sanitizeScene(raw) {
  if (!raw || typeof raw !== "object") return { ok: false, error: "A cena precisa ser um objeto." };
  if (!Array.isArray(raw.items)) return { ok: false, error: "A cena não tem a lista de itens." };
  if (raw.items.length > LIMITS.maxItems) return { ok: false, error: `Itens demais (máximo ${LIMITS.maxItems}).` };
  const duration = cleanNum(raw.duration, LIMITS.duration, 20, false);
  const damage = cleanNum(raw.damage, LIMITS.damage, 10, true);
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, LIMITS.nameMax) : "Cena sem nome";
  const ss = raw.soulStart && typeof raw.soulStart === "object" ? raw.soulStart : {};
  const soulStart = { x: cleanNum(ss.x, [6, BOX.w - 6], 240, false), y: cleanNum(ss.y, [6, BOX.h - 6], 150, false) };
  const items = [];
  const seen = new Set();
  for (let i = 0; i < raw.items.length; i++) {
    const res = sanitizeItem(raw.items[i], duration, `i${i}`);
    if (res.error) return { ok: false, error: `Item ${i + 1}: ${res.error}.` };
    let id = res.item.id;
    for (let n = 2; seen.has(id); n++) id = `${res.item.id.slice(0, 34)}_${n}`;
    seen.add(id);
    items.push({ ...res.item, id });
  }
  // peso da cena: rajadas (balas x anéis) e órbitas multiplicam balas; limite evita travar o aparelho
  const bullets = items.reduce((sum, it) => sum + (it.type === "burst" ? it.count * it.rings : it.type === "orbit" ? it.count : 1), 0);
  if (bullets > LIMITS.maxBullets) return { ok: false, error: `Cena pesada demais (${bullets} balas; o máximo é ${LIMITS.maxBullets}).` };
  return { ok: true, scene: { name, box: { ...BOX }, duration, damage, soulStart, items } };
}
