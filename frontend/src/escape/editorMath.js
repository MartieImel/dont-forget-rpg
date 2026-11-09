// Matemática do editor (pura, testável sem navegador): onde fica cada item, como criar
// um item a partir de um clique/arrasto, como movê-lo e como escolher o que foi clicado.
import { DEFAULTS, BOX } from "./spec.js";
import { itemShapes } from "./engine.js";

export const TYPE_NAMES = { bullet: "Bala", burst: "Rajada", orbit: "Órbita", homing: "Perseguidor", wall: "Parede", laser: "Laser" };
export const TYPE_COLORS = { bullet: "#ffffff", burst: "#ffd34d", orbit: "#5ec8d8", homing: "#ff5a5a", wall: "#a9a9ff", laser: "#ff9a3c" };
export const TYPE_HINTS = {
  bullet: "Clique para colocar; arraste para definir a direção e a velocidade.",
  burst: "Clique para uma rajada em círculo; arraste para um leque na direção do arrasto.",
  orbit: "Clique no centro; arraste para definir o raio da órbita.",
  homing: "Clique onde ele nasce. Persegue sua alma devagar; curva 0 = tiro mirado.",
  wall: "Clique onde a brecha deve ficar (direção escolhida ao lado).",
  laser: "Clique na posição da faixa (eixo escolhido ao lado). Avisa antes de disparar.",
};

const round1 = (v) => Math.round(v * 10) / 10;

export function itemAnchor(item) {
  if (item.type === "orbit") return { x: item.cx, y: item.cy };
  if (item.type === "wall" || item.type === "laser") return null;
  return { x: item.x, y: item.y };
}

// posição da tela (clientX/Y) -> ponto da cena (inteiros). Fora da caixa: null (ou preso na borda se clamp)
export function toScenePoint(rect, clientX, clientY, clamp = false) {
  if (!rect || !rect.width || !rect.height) return null;
  let x = ((clientX - rect.left) * BOX.w) / rect.width;
  let y = ((clientY - rect.top) * BOX.h) / rect.height;
  const outside = x < 0 || y < 0 || x > BOX.w || y > BOX.h;
  if (outside && !clamp) return null;
  x = Math.max(0, Math.min(BOX.w, x));
  y = Math.max(0, Math.min(BOX.h, y));
  return { x: Math.round(x), y: Math.round(y) };
}

// Cria o item (ainda sem id) a partir do clique em p0 e do ponto onde soltou, p1.
export function makeItem(type, p0, p1, opts = {}) {
  const base = { type, t: opts.t ?? 0, ...DEFAULTS[type] };
  const dx = p1.x - p0.x, dy = p1.y - p0.y;
  const d = Math.hypot(dx, dy);
  const dragged = d >= 12;
  if (type === "bullet") {
    const item = { ...base, x: p0.x, y: p0.y };
    if (dragged) {
      const speed = Math.min(400, Math.max(20, d * 1.5));
      item.vx = round1((dx / d) * speed);
      item.vy = round1((dy / d) * speed);
    }
    return item;
  }
  if (type === "burst") {
    const item = { ...base, x: p0.x, y: p0.y };
    if (dragged) {
      item.angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
      item.arc = 70;
      item.count = 7;
    }
    return item;
  }
  if (type === "orbit") {
    const item = { ...base, cx: p0.x, cy: p0.y };
    if (dragged) item.radius = Math.round(Math.min(300, Math.max(10, d)));
    return item;
  }
  if (type === "homing") return { ...base, x: p0.x, y: p0.y };
  if (type === "wall") {
    const dir = opts.wallDir ?? base.dir;
    const horizontal = dir === "left" || dir === "right";
    return { ...base, dir, gapStart: Math.round((horizontal ? p0.y : p0.x) - base.gapSize / 2) };
  }
  if (type === "laser") {
    const axis = opts.laserAxis ?? base.axis;
    return { ...base, axis, pos: axis === "h" ? p0.y : p0.x };
  }
  throw new Error("tipo desconhecido: " + type);
}

// mover um item arrastando: devolve só os campos que mudam
export function moveItemTo(item, p) {
  if (item.type === "orbit") return { cx: p.x, cy: p.y };
  if (item.type === "laser") return { pos: item.axis === "h" ? p.y : p.x };
  if (item.type === "wall") {
    const horizontal = item.dir === "left" || item.dir === "right";
    return { gapStart: Math.round((horizontal ? p.y : p.x) - item.gapSize / 2) };
  }
  return { x: p.x, y: p.y };
}

// todos os itens sob o ponto p, do de cima (último da lista) para o de baixo
export function pickItems(scene, run, p) {
  const out = [];
  for (let i = scene.items.length - 1; i >= 0; i--) {
    const it = scene.items[i];
    if (it.type === "laser") {
      const half = (it.thickness ?? 16) / 2 + 4;
      if ((it.axis === "h" ? Math.abs(p.y - it.pos) : Math.abs(p.x - it.pos)) <= half) out.push(it.id);
      continue;
    }
    let hit = false;
    for (const s of itemShapes(it, run.t, scene.box, run.dyn)) {
      const inside = s.kind === "circle" ? Math.hypot(p.x - s.x, p.y - s.y) <= s.r + 4 : p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h;
      if (inside) { hit = true; break; }
    }
    const a = itemAnchor(it);
    if (!hit && a && Math.hypot(p.x - a.x, p.y - a.y) <= 12) hit = true;
    if (hit) out.push(it.id);
  }
  return out;
}

// o item de cima sob o ponto p (ou null)
export const pickItem = (scene, run, p) => pickItems(scene, run, p)[0] ?? null;

// "1.2000000000000002" -> 1.2 (tempo em passos de 0,05 s)
export const snapTime = (t) => Math.round(Math.round(t / 0.05) * 0.05 * 1000) / 1000;
