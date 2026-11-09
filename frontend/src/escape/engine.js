// Motor das "Cenas de Fuga" (bullet hell). Puro e determinístico: sem React, sem
// relógio, sem aleatoriedade. A posição de cada projétil é uma FUNÇÃO DO TEMPO
// desde o início da cena (forma fechada), então qualquer aparelho que souber
// "a cena começou no instante T" desenha e testa exatamente a mesma coisa.
// Única exceção: o "perseguidor" (homing), que guarda estado por partida (run.dyn)
// porque depende de onde a SUA alma está — cada jogador é perseguido pela própria.
//
// Formato da cena (é o mesmo que o editor do mestre gera):
//   { name, box: {w,h}, duration, damage, soulStart: {x,y}, items: [...] }
// Todos os itens têm `id`, `type` e `t` (segundo em que entram em cena). Ângulos em
// graus: 0 = direita (→), 90 = baixo (↓).
//   bullet: x, y, vx, vy, r
//   burst:  x, y, count, speed, r, arc, angle, rings, interval, twist
//   orbit:  cx, cy, vx, vy, radius, count, omega, r, life, grow, angle
//   homing: x, y, speed, turn, life, r        (turn = 0 → tiro mirado em linha reta)
//   wall:   dir ("left"|"right"|"up"|"down"), speed, thickness, gapStart, gapSize
//   laser:  axis ("h"|"v"), pos, thickness, warn, active

export const SOUL_RADIUS = 4; // só esta área machuca (o desenho do coração é maior)
export const SOUL_SPEED = 150; // px/s
export const SOUL_SLOW = 70; // px/s com Shift
export const SOUL_PAD = 6; // folga até a borda da caixa
export const INVULN_TIME = 1.0; // segundos sem levar dano depois de um acerto
export const LEAD_IN = 1.0; // segundos de "prepare-se" antes de t = 0
export const SPAWN_GRACE = 0.3; // aviso (fantasma inofensivo) de rajada/órbita/perseguidor

const DEG = Math.PI / 180;

// bala que já saiu da caixa e continua se afastando: não precisa mais existir
function goneAway(x, y, vx, vy, box) {
  return (x < -40 && vx <= 0) || (x > box.w + 40 && vx >= 0) || (y < -40 && vy <= 0) || (y > box.h + 40 && vy >= 0);
}

const ghost = (x, y, r, variant) => ({ kind: "circle", x, y, r, harmful: false, telegraph: true, variant });
const bulletShape = (x, y, r, variant) => ({ kind: "circle", x, y, r, harmful: true, variant });

// ---------- formas de cada item no instante t ----------
// Cada forma: { kind: "circle"|"rect", ..., harmful, telegraph?, variant? }
// `dyn` (opcional) é o estado dos perseguidores da partida (run.dyn).
export function itemShapes(item, t, box, dyn) {
  const dt = t - item.t;
  if (dt < 0) return [];

  if (item.type === "bullet") {
    return [bulletShape(item.x + item.vx * dt, item.y + item.vy * dt, item.r, "bullet")];
  }

  if (item.type === "burst") {
    const { x, y } = item;
    const count = item.count ?? 8, rings = item.rings ?? 1, interval = item.interval ?? 0.3;
    const arc = item.arc ?? 360, base = item.angle ?? 0, twist = item.twist ?? 0;
    const speed = item.speed ?? 120, r = item.r ?? 5;
    const out = [];
    for (let j = 0; j < rings; j++) {
      const dtj = dt - j * interval;
      if (dtj < 0) break; // os anéis seguintes começam ainda mais tarde
      const a0 = base + j * twist;
      const e = dtj - SPAWN_GRACE; // tempo desde o disparo de verdade
      for (let k = 0; k < count; k++) {
        const deg = arc >= 360 ? a0 + (k * 360) / count : count === 1 ? a0 : a0 - arc / 2 + (k * arc) / (count - 1);
        const vx = Math.cos(deg * DEG) * speed, vy = Math.sin(deg * DEG) * speed;
        if (e < 0) {
          out.push(ghost(x, y, r, "burst"));
          continue;
        }
        const px = x + vx * e, py = y + vy * e;
        if (!goneAway(px, py, vx, vy, box)) out.push(bulletShape(px, py, r, "burst"));
      }
    }
    return out;
  }

  if (item.type === "orbit") {
    const count = item.count ?? 4, radius = item.radius ?? 60, omega = item.omega ?? 90;
    const r = item.r ?? 5, life = item.life ?? 6, grow = item.grow ?? 0, base = item.angle ?? 0;
    const e = dt - SPAWN_GRACE;
    if (e >= life) return [];
    const ee = Math.max(0, e);
    const cx = item.cx + (item.vx ?? 0) * ee, cy = item.cy + (item.vy ?? 0) * ee;
    const R = Math.max(0, radius + grow * ee);
    const out = [];
    for (let k = 0; k < count; k++) {
      const th = (base + omega * ee + (k * 360) / count) * DEG;
      const px = cx + Math.cos(th) * R, py = cy + Math.sin(th) * R;
      out.push(e < 0 ? ghost(px, py, r, "orbit") : bulletShape(px, py, r, "orbit"));
    }
    return out;
  }

  if (item.type === "homing") {
    const r = item.r ?? 6, life = item.life ?? 8;
    if (dt < SPAWN_GRACE) return [ghost(item.x, item.y, r, "homing")];
    const st = dyn && dyn[item.id];
    if (!st || st.age >= life) return []; // sem estado (ex.: prova de justiça) não existe
    return [bulletShape(st.x, st.y, r, "homing")];
  }

  if (item.type === "wall") {
    const horizontal = item.dir === "left" || item.dir === "right"; // anda no eixo x
    const along = horizontal ? box.w : box.h; // comprimento no eixo do movimento
    const across = horizontal ? box.h : box.w; // comprimento do outro eixo
    const th = item.thickness;
    const forward = item.dir === "right" || item.dir === "down";
    const pos = forward ? -th + item.speed * dt : along - item.speed * dt; // borda mínima da barra
    if (pos > along || pos < -th) return []; // já saiu da caixa
    const segs = [
      [0, item.gapStart],
      [item.gapStart + item.gapSize, across],
    ].filter(([a, b]) => b - a > 0);
    return segs.map(([a, b]) =>
      horizontal
        ? { kind: "rect", x: pos, y: a, w: th, h: b - a, harmful: true }
        : { kind: "rect", x: a, y: pos, w: b - a, h: th, harmful: true }
    );
  }

  if (item.type === "laser") {
    const warn = item.warn ?? 1;
    const active = item.active ?? 0.5;
    const th = item.thickness ?? 16;
    if (dt >= warn + active) return [];
    const on = dt >= warn;
    const r =
      item.axis === "h"
        ? { x: 0, y: item.pos - th / 2, w: box.w, h: th }
        : { x: item.pos - th / 2, y: 0, w: th, h: box.h };
    return [{ kind: "rect", ...r, harmful: on, telegraph: !on }];
  }

  return [];
}

// distância entre a borda do círculo (cx,cy,r) e a forma; negativa = encostando
export function clearance(cx, cy, r, s) {
  if (s.kind === "circle") return Math.hypot(cx - s.x, cy - s.y) - (r + s.r);
  const nx = Math.max(s.x, Math.min(cx, s.x + s.w));
  const ny = Math.max(s.y, Math.min(cy, s.y + s.h));
  return Math.hypot(cx - nx, cy - ny) - r;
}

export function soulIsHit(soul, scene, t, dyn) {
  for (const item of scene.items) {
    for (const s of itemShapes(item, t, scene.box, dyn)) {
      if (s.harmful && clearance(soul.x, soul.y, SOUL_RADIUS, s) < 0) return true;
    }
  }
  return false;
}

// ---------- execução ----------
export function createRun(scene, opts = {}) {
  const hp = opts.hp ?? 60;
  return {
    t: -LEAD_IN,
    soul: { x: scene.soulStart.x, y: scene.soulStart.y },
    hp,
    maxHp: hp,
    damage: opts.damage ?? scene.damage,
    invuln: 0,
    hits: 0,
    lastHitAt: -Infinity,
    dyn: {}, // estado dos perseguidores: id -> { x, y, angle, age }
    status: "running", // running | won | dead  (a tela usa "idle" antes de começar)
  };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const homingCache = new WeakMap();
function homingItems(scene) {
  let h = homingCache.get(scene);
  if (!h) homingCache.set(scene, (h = scene.items.filter((i) => i.type === "homing")));
  return h;
}

function stepHoming(run, scene, dt) {
  for (const h of homingItems(scene)) {
    if (run.t - h.t < SPAWN_GRACE) continue; // ainda é só o aviso
    let st = run.dyn[h.id];
    if (!st) {
      // nasce mirando na alma de quem está jogando
      st = run.dyn[h.id] = { x: h.x, y: h.y, angle: Math.atan2(run.soul.y - h.y, run.soul.x - h.x), age: 0 };
    }
    if (st.age >= (h.life ?? 8)) continue;
    const turn = (h.turn ?? 60) * DEG;
    if (turn > 0) {
      const want = Math.atan2(run.soul.y - st.y, run.soul.x - st.x);
      let diff = want - st.angle;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // menor giro, em -π..π
      const maxTurn = turn * dt;
      st.angle += clamp(diff, -maxTurn, maxTurn);
    }
    const speed = h.speed ?? 70;
    st.x += Math.cos(st.angle) * speed * dt;
    st.y += Math.sin(st.angle) * speed * dt;
    st.age += dt;
  }
}

// avança a simulação `dt` segundos. input: { x, y } em -1..1 e slow (Shift)
export function advance(run, scene, input, dt) {
  if (run.status !== "running") return run;

  let ix = clamp(Number(input.x) || 0, -1, 1);
  let iy = clamp(Number(input.y) || 0, -1, 1);
  const len = Math.hypot(ix, iy);
  if (len > 1) {
    ix /= len;
    iy /= len;
  }
  const speed = input.slow ? SOUL_SLOW : SOUL_SPEED;
  run.soul.x = clamp(run.soul.x + ix * speed * dt, SOUL_PAD, scene.box.w - SOUL_PAD);
  run.soul.y = clamp(run.soul.y + iy * speed * dt, SOUL_PAD, scene.box.h - SOUL_PAD);

  run.t += dt;
  run.invuln = Math.max(0, run.invuln - dt);
  stepHoming(run, scene, dt);

  if (run.invuln <= 0 && run.t >= 0 && soulIsHit(run.soul, scene, run.t, run.dyn)) {
    run.hp = Math.max(0, run.hp - run.damage);
    run.hits += 1;
    run.invuln = INVULN_TIME;
    run.lastHitAt = run.t;
    if (run.hp <= 0) run.status = "dead";
  }
  if (run.status === "running" && run.t >= scene.duration) run.status = "won";
  return run;
}

// Prévia para o editor: como a cena está no instante `t` com a alma PARADA no início
// (os perseguidores, que dependem da alma, miram nela). Não gera dano.
export function previewRun(scene, t) {
  const run = createRun(scene, { hp: 1e9 });
  run.invuln = 1e9;
  const STEP = 1 / 60;
  while (run.t < t - 1e-9) advance(run, scene, {}, Math.min(STEP, t - run.t));
  run.status = "running";
  return run;
}

// ---------- "dá pra vencer?" ----------
// Prova exaustiva de que existe um caminho seguro do começo ao fim: calcula, a cada
// instante, o CONJUNTO de todas as posições (grade de 4 px) em que a alma pode estar
// sem levar acerto. Andando só 1 casa por passo (120 px/s, mais devagar que os 150
// reais e sem diagonais), se o conjunto nunca esvazia existe um caminho garantido.
// Perseguidores dependem de onde a alma está e ficam FORA da prova (`excluded`).
export function checkBeatable(scene) {
  const CELL = 4, DT = 1 / 30;
  const nx = Math.floor((scene.box.w - 2 * SOUL_PAD) / CELL) + 1;
  const ny = Math.floor((scene.box.h - 2 * SOUL_PAD) / CELL) + 1;
  const px = (i) => SOUL_PAD + i * CELL, py = (j) => SOUL_PAD + j * CELL;
  const excluded = scene.items.filter((i) => i.type === "homing").length;
  let reach = new Uint8Array(nx * ny);
  const sx = clamp(Math.round((scene.soulStart.x - SOUL_PAD) / CELL), 0, nx - 1);
  const sy = clamp(Math.round((scene.soulStart.y - SOUL_PAD) / CELL), 0, ny - 1);
  reach[sy * nx + sx] = 1;
  const steps = Math.ceil(scene.duration / DT);
  const blocked = new Uint8Array(nx * ny);
  for (let k = 1; k <= steps; k++) {
    const t = k * DT;
    // casas onde a alma levaria acerto neste instante: só varre a vizinhança de cada projétil
    blocked.fill(0);
    for (const it of scene.items) {
      for (const sh of itemShapes(it, t, scene.box)) {
        if (!sh.harmful) continue;
        const m = sh.kind === "circle" ? sh.r + SOUL_RADIUS : SOUL_RADIUS;
        const x0 = sh.kind === "circle" ? sh.x - m : sh.x - m, x1 = sh.kind === "circle" ? sh.x + m : sh.x + sh.w + m;
        const y0 = sh.kind === "circle" ? sh.y - m : sh.y - m, y1 = sh.kind === "circle" ? sh.y + m : sh.y + sh.h + m;
        const i0 = Math.max(0, Math.ceil((x0 - SOUL_PAD) / CELL)), i1 = Math.min(nx - 1, Math.floor((x1 - SOUL_PAD) / CELL));
        const j0 = Math.max(0, Math.ceil((y0 - SOUL_PAD) / CELL)), j1 = Math.min(ny - 1, Math.floor((y1 - SOUL_PAD) / CELL));
        for (let j = j0; j <= j1; j++) {
          for (let i = i0; i <= i1; i++) {
            const idx = j * nx + i;
            if (!blocked[idx] && clearance(px(i), py(j), SOUL_RADIUS, sh) < 0) blocked[idx] = 1;
          }
        }
      }
    }
    const next = new Uint8Array(nx * ny);
    let any = false;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const idx = j * nx + i;
        if (blocked[idx]) continue;
        if (reach[idx] || (i > 0 && reach[idx - 1]) || (i < nx - 1 && reach[idx + 1]) || (j > 0 && reach[idx - nx]) || (j < ny - 1 && reach[idx + nx])) {
          next[idx] = 1;
          any = true;
        }
      }
    }
    if (!any) return { ok: false, failedAt: t, excluded };
    reach = next;
  }
  return { ok: true, excluded };
}
