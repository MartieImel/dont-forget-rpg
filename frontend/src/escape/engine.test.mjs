// Testes do motor, sem dependências:  node --test src/escape
import test from "node:test";
import assert from "node:assert/strict";
import {
  advance, createRun, itemShapes, soulIsHit, clearance, checkBeatable, previewRun, SPAWN_GRACE,
  SOUL_SPEED, SOUL_SLOW, SOUL_PAD, SOUL_RADIUS, LEAD_IN,
} from "./engine.js";
import { demoScene, demoScene2 } from "./scenes.js";
import { sanitizeScene, SPEC, BOX } from "./spec.js";

const box = { w: 480, h: 300 };
const sceneOf = (items, extra = {}) => ({ name: "t", box, duration: 10, damage: 10, soulStart: { x: 240, y: 150 }, items, ...extra });
const STEP = 1 / 60;
const approx = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test("bala: posição é função do tempo (forma fechada)", () => {
  const b = { type: "bullet", t: 2, x: 10, y: 20, vx: 30, vy: -10, r: 5 };
  assert.deepEqual(itemShapes(b, 1.99, box), []); // ainda não entrou
  const [s] = itemShapes(b, 4, box);
  approx(s.x, 70); approx(s.y, 0);
  const [s2] = itemShapes(b, 4, box); // mesma entrada, mesma saída
  assert.deepEqual(s, s2);
});

test("bala: acerta só quando encosta (raio da alma + raio da bala)", () => {
  const b = { type: "bullet", t: 0, x: 100, y: 100, vx: 0, vy: 0, r: 5 };
  const sc = sceneOf([b]);
  assert.equal(soulIsHit({ x: 100 + 8.9, y: 100 }, sc, 1), true);  // 4 + 5 = 9
  assert.equal(soulIsHit({ x: 100 + 9.1, y: 100 }, sc, 1), false);
});

test("parede: a brecha deixa passar, o resto machuca", () => {
  const w = { type: "wall", t: 0, dir: "right", speed: 100, thickness: 20, gapStart: 100, gapSize: 80 };
  const sc = sceneOf([w]);
  const t = 2; // barra em x = -20 + 200 = 180..200
  assert.equal(soulIsHit({ x: 190, y: 140 }, sc, t), false); // dentro da brecha (100..180)
  assert.equal(soulIsHit({ x: 190, y: 50 }, sc, t), true);   // acima da brecha
  assert.equal(soulIsHit({ x: 190, y: 250 }, sc, t), true);  // abaixo da brecha
  assert.equal(soulIsHit({ x: 150, y: 50 }, sc, t), false);  // antes da barra
});

test("parede: as 4 direções começam fora da caixa e somem do outro lado", () => {
  for (const dir of ["left", "right", "up", "down"]) {
    const w = { type: "wall", t: 0, dir, speed: 200, thickness: 20, gapStart: 0, gapSize: 0 };
    assert.equal(itemShapes(w, 0, box).length > 0, true, dir + " existe no começo");
    assert.deepEqual(itemShapes(w, 30, box), [], dir + " já saiu");
  }
});

test("laser: aviso não machuca, ativo machuca, depois some", () => {
  const l = { type: "laser", t: 1, axis: "h", pos: 150, thickness: 20, warn: 1, active: 0.5 };
  const sc = sceneOf([l]);
  const p = { x: 240, y: 150 };
  assert.equal(soulIsHit(p, sc, 1.5), false);                 // aviso
  assert.equal(itemShapes(l, 1.5, box)[0].telegraph, true);
  assert.equal(soulIsHit(p, sc, 2.2), true);                  // ativo
  assert.equal(soulIsHit(p, sc, 2.6), false);                 // acabou
  assert.equal(soulIsHit({ x: 240, y: 100 }, sc, 2.2), false); // fora da faixa
});

test("dano fixo, invulnerabilidade e morte", () => {
  const b = { type: "bullet", t: 0, x: 240, y: 150, vx: 0, vy: 0, r: 8 };
  const sc = sceneOf([b], { damage: 25 });
  const run = createRun(sc, { hp: 60 });
  while (run.t < 0.2) advance(run, sc, {}, STEP);
  assert.equal(run.hp, 35); assert.equal(run.hits, 1);
  while (run.t < 0.9) advance(run, sc, {}, STEP);      // ainda invulnerável
  assert.equal(run.hits, 1);
  while (run.t < 1.1) advance(run, sc, {}, STEP);      // passou 1 s
  assert.equal(run.hits, 2); assert.equal(run.hp, 10);
  while (run.status === "running") advance(run, sc, {}, STEP);
  assert.equal(run.hp, 0); assert.equal(run.status, "dead");
  const t = run.t; advance(run, sc, { x: 1 }, STEP);   // morto: nada mais acontece
  assert.equal(run.t, t);
});

test("prepare-se: sem dano antes de t = 0", () => {
  const b = { type: "bullet", t: 0, x: 240, y: 150, vx: 0, vy: 0, r: 8 };
  const sc = sceneOf([b]);
  const run = createRun(sc);
  assert.equal(run.t, -LEAD_IN);
  for (let i = 0; i < 50; i++) advance(run, sc, {}, STEP); // 0,83 s, ainda t < 0
  assert.ok(run.t < 0); assert.equal(run.hits, 0);
});

test("vence ao chegar na duração", () => {
  const sc = sceneOf([], { duration: 2 });
  const run = createRun(sc);
  while (run.status === "running") advance(run, sc, {}, STEP);
  assert.equal(run.status, "won"); assert.ok(run.t >= 2);
});

test("movimento: velocidade, Shift, diagonal normalizada e limites da caixa", () => {
  const sc = sceneOf([], { duration: 1e6 }); // cena longa: não termina no meio do teste
  let run = createRun(sc);
  for (let i = 0; i < 60; i++) advance(run, sc, { x: 1 }, STEP);
  approx(run.soul.x - 240, SOUL_SPEED, 1e-6);
  run = createRun(sc);
  for (let i = 0; i < 60; i++) advance(run, sc, { x: 1, slow: true }, STEP);
  approx(run.soul.x - 240, SOUL_SLOW, 1e-6);
  run = createRun(sc);
  for (let i = 0; i < 60; i++) advance(run, sc, { x: 1, y: 1 }, STEP);
  approx(Math.hypot(run.soul.x - 240, run.soul.y - 150), SOUL_SPEED, 1e-6); // diagonal não é mais rápida
  run = createRun(sc);
  for (let i = 0; i < 600; i++) advance(run, sc, { x: -1, y: -1 }, STEP);
  assert.equal(run.soul.x, SOUL_PAD); assert.equal(run.soul.y, SOUL_PAD);
  for (let i = 0; i < 1200; i++) advance(run, sc, { x: 5, y: 5 }, STEP); // entrada fora de -1..1 é limitada
  assert.equal(run.soul.x, box.w - SOUL_PAD); assert.equal(run.soul.y, box.h - SOUL_PAD);
});

test("clearance: círculo e retângulo", () => {
  approx(clearance(0, 0, 4, { kind: "circle", x: 20, y: 0, r: 6 }), 10);
  approx(clearance(0, 0, 4, { kind: "rect", x: 10, y: -5, w: 5, h: 10 }), 6);
  assert.ok(clearance(12, 0, 4, { kind: "rect", x: 10, y: -5, w: 5, h: 10 }) < 0); // alma dentro
});

// ---------- a cena de demonstração ----------
test("demo: tipos válidos e tudo termina antes da duração", () => {
  const sc = demoScene();
  for (const it of sc.items) {
    assert.ok(["bullet", "wall", "laser"].includes(it.type), it.type);
    assert.ok(it.t >= 0 && it.t < sc.duration);
  }
  assert.ok(new Set(sc.items.map((i) => i.id)).size === sc.items.length, "ids únicos");
});

test("demo: parado no meio você leva dano (não é trivial)", () => {
  const sc = demoScene();
  const run = createRun(sc);
  while (run.status === "running") advance(run, sc, {}, STEP);
  assert.ok(run.hits >= 1, `acertos: ${run.hits}`);
});

test("demo: existe caminho seguro do começo ao fim (prova por alcançabilidade)", () => {
  const res = checkBeatable(demoScene());
  assert.ok(res.ok, `não há como sobreviver a partir de t = ${res.failedAt?.toFixed(2)} s — cena impossível`);
});

test("a prova detecta cena impossível (controle)", () => {
  // um laser que cobre a caixa inteira: ninguém escapa
  const sc = sceneOf([{ type: "laser", t: 1, axis: "h", pos: 150, thickness: 400, warn: 0.5, active: 2 }], { duration: 5 });
  const res = checkBeatable(sc);
  assert.equal(res.ok, false);
  assert.ok(res.failedAt >= 1.5 && res.failedAt < 1.6, `falhou em ${res.failedAt}`);
});

// ============ tipos novos: rajada, órbita e perseguidor ============
const G = SPAWN_GRACE;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test("rajada: 4 balas em cruz; durante o aviso é fantasma e depois anda reto", () => {
  const b = { id: "b", type: "burst", t: 0, x: 100, y: 100, count: 4, speed: 100, r: 5, arc: 360, angle: 0, rings: 1, interval: 0.3, twist: 0 };
  const ghosts = itemShapes(b, 0.1, box);
  assert.equal(ghosts.length, 4);
  assert.ok(ghosts.every((s) => !s.harmful && s.telegraph && s.x === 100 && s.y === 100), "aviso: parado na origem e inofensivo");
  const live = itemShapes(b, G + 1, box); // 1 s depois de disparar
  assert.ok(live.every((s) => s.harmful));
  const near = (s, x, y) => Math.abs(s.x - x) < 1e-6 && Math.abs(s.y - y) < 1e-6;
  assert.ok(live.some((s) => near(s, 200, 100)), "→");
  assert.ok(live.some((s) => near(s, 100, 200)), "↓ (90° = para baixo)");
  assert.ok(live.some((s) => near(s, 0, 100)), "←");
  assert.ok(live.some((s) => near(s, 100, 0)), "↑");
});

test("rajada: anéis saem com intervalo e o giro (twist) rotaciona cada anel — espiral", () => {
  const b = { id: "b", type: "burst", t: 0, x: 240, y: 150, count: 1, speed: 100, r: 4, arc: 360, angle: 0, rings: 3, interval: 0.5, twist: 90 };
  assert.equal(itemShapes(b, 0.2, box).length, 1);              // só o 1º anel começou
  assert.equal(itemShapes(b, 0.6, box).length, 2);              // 2º anel começou em 0,5
  assert.equal(itemShapes(b, 1.2, box).length, 3);
  const s = itemShapes(b, 0.5 + G + 1, box);                    // 2º anel, 1 s depois do disparo: giro de 90° → ↓
  assert.ok(s.some((c) => Math.abs(c.x - 240) < 1e-6 && Math.abs(c.y - 250) < 1e-6));
});

test("rajada em leque: abertura menor que 360° espalha entre os extremos, centrada no ângulo", () => {
  const b = { id: "b", type: "burst", t: 0, x: 500, y: 500, count: 3, speed: 100, r: 4, arc: 90, angle: 90, rings: 1, interval: 0.3, twist: 0 };
  const s = itemShapes(b, G + 1, { w: 1000, h: 1000 });
  const ang = s.map((c) => Math.round((Math.atan2(c.y - 500, c.x - 500) * 180) / Math.PI)).sort((a, c) => a - c);
  assert.deepEqual(ang, [45, 90, 135]);
});

test("rajada: balas que já saíram da caixa e continuam fugindo deixam de existir", () => {
  const b = { id: "b", type: "burst", t: 0, x: 240, y: 150, count: 4, speed: 500, r: 4, arc: 360, angle: 0, rings: 1, interval: 0.3, twist: 0 };
  assert.equal(itemShapes(b, G + 0.1, box).length, 4);
  assert.equal(itemShapes(b, G + 3, box).length, 0);
});

test("órbita: raio constante, giro no tempo, balas igualmente espaçadas, some ao fim da duração", () => {
  const o = { id: "o", type: "orbit", t: 0, cx: 200, cy: 150, vx: 0, vy: 0, radius: 50, count: 4, omega: 90, r: 5, life: 4, grow: 0, angle: 0 };
  const g = itemShapes(o, 0.1, box);
  assert.ok(g.every((s) => !s.harmful), "aviso inicial");
  const s1 = itemShapes(o, G + 1, box);                          // 1 s: girou 90°
  for (const s of s1) approx(dist(s, { x: 200, y: 150 }), 50, 1e-9);
  assert.ok(s1.some((s) => Math.abs(s.x - 200) < 1e-6 && Math.abs(s.y - 200) < 1e-6), "a bala de 0° foi pra 90° (baixo)");
  assert.equal(itemShapes(o, G + 4.01, box).length, 0);
});

test("órbita: centro à deriva e raio crescente", () => {
  const o = { id: "o", type: "orbit", t: 0, cx: 100, cy: 100, vx: 20, vy: 0, radius: 30, count: 1, omega: 0, r: 4, life: 10, grow: 10, angle: 0 };
  const [s] = itemShapes(o, G + 2, box);                         // centro em 140; raio 50; ângulo 0
  approx(s.x, 190); approx(s.y, 100);
});

function runFor(scene, secs, input = () => ({})) {
  const run = createRun(scene, { hp: 1e9 });
  while (run.t < secs) advance(run, scene, input(run), 1 / 120);
  return run;
}

test("perseguidor: aviso parado, depois persegue a alma com curva limitada", () => {
  const sc = sceneOf([{ id: "h", type: "homing", t: 0, x: 40, y: 40, speed: 60, turn: 30, life: 20, r: 6 }], { duration: 50 });
  const run = runFor(sc, 0.1);
  const [g] = itemShapes(sc.items[0], run.t, box, run.dyn);
  assert.ok(g.telegraph && !g.harmful && g.x === 40, "fase de aviso");
  const r2 = runFor(sc, 3);
  const st = r2.dyn.h;
  assert.ok(st && dist(st, { x: 40, y: 40 }) > 20, "saiu do lugar");
  assert.ok(dist(st, r2.soul) < dist({ x: 40, y: 40 }, r2.soul), "chegou mais perto da alma parada");
});

test("perseguidor: o giro por segundo nunca passa do limite (curva)", () => {
  const sc = sceneOf([{ id: "h", type: "homing", t: 0, x: 240, y: 20, speed: 80, turn: 20, life: 30, r: 6 }], { duration: 60 });
  const run = createRun(sc, { hp: 1e9 });
  // joga a alma pro outro lado para o perseguidor ter que virar
  let last = null, maxRate = 0;
  while (run.t < 8) {
    advance(run, sc, { y: 1 }, 1 / 120);
    const st = run.dyn.h;
    if (st && last !== null) {
      let d = st.angle - last; d = Math.atan2(Math.sin(d), Math.cos(d));
      maxRate = Math.max(maxRate, Math.abs(d) * 120);
    }
    if (st) last = st.angle;
  }
  assert.ok(maxRate <= (20 * Math.PI) / 180 + 1e-6, `taxa de giro ${(maxRate * 180) / Math.PI}°/s passou de 20°/s`);
});

test("perseguidor com curva 0 = tiro mirado: reto, na direção onde a alma estava ao nascer", () => {
  const sc = sceneOf([{ id: "h", type: "homing", t: 0, x: 0, y: 150, speed: 100, turn: 0, life: 30, r: 5 }], { duration: 60 });
  const run = createRun(sc, { hp: 1e9 });
  while (run.t < G + 0.5) advance(run, sc, {}, 1 / 120);
  const a = { ...run.dyn.h };
  advance(run, sc, { y: -1 }, 1 / 120); // a alma se mexe...
  while (run.t < 3) advance(run, sc, { y: -1 }, 1 / 120);
  assert.equal(Math.round(run.dyn.h.y), 150, "...e o tiro continua reto");
  assert.ok(run.dyn.h.x > a.x);
});

test("perseguidor: some ao fim da vida e é determinístico", () => {
  const sc = sceneOf([{ id: "h", type: "homing", t: 0, x: 40, y: 40, speed: 60, turn: 40, life: 2, r: 6 }], { duration: 50 });
  const run = runFor(sc, G + 2.5);
  assert.deepEqual(itemShapes(sc.items[0], run.t, box, run.dyn), []);
  const again = runFor(sc, G + 2.5);
  assert.deepEqual(run.dyn, again.dyn);
});

test("perseguidor: sem estado (prova de justiça) ele não existe; checkBeatable avisa quantos excluiu", () => {
  const h = { id: "h", type: "homing", t: 0, x: 40, y: 40, speed: 60, turn: 40, life: 5, r: 6 };
  assert.deepEqual(itemShapes(h, 2, box), []);
  const res = checkBeatable(sceneOf([h], { duration: 5 }));
  assert.equal(res.ok, true); assert.equal(res.excluded, 1);
});

test("previewRun: cena no instante t com alma parada, sem dano", () => {
  const sc = demoScene2();
  const p = previewRun(sc, 20);
  assert.ok(Math.abs(p.t - 20) < 1e-6);
  assert.equal(p.hits, 0);
  assert.ok(p.dyn[sc.items.find((i) => i.type === "homing").id], "perseguidor já nasceu e mira a alma");
});

test("demo 2: tipos válidos, sem dano parado até o aviso, e possível de vencer (fora os perseguidores)", () => {
  const sc = demoScene2();
  assert.ok(new Set(sc.items.map((i) => i.id)).size === sc.items.length);
  const res = checkBeatable(sc);
  assert.ok(res.ok, `impossível a partir de t = ${res.failedAt?.toFixed(2)} s`);
  assert.equal(res.excluded, 2);
  const run = createRun(sc, { hp: 60 });
  while (run.status === "running") advance(run, sc, {}, 1 / 60);
  assert.ok(run.hits >= 1, "parado no meio você leva dano");
});

// ============ faxina (sanitizeScene) ============
test("sanitizeScene: as cenas de demonstração passam sem mudar nada", () => {
  for (const sc of [demoScene(), demoScene2()]) {
    const r = sanitizeScene(structuredClone(sc));
    assert.ok(r.ok, r.error);
    assert.deepEqual(r.scene, sc);
  }
});

test("sanitizeScene: limita valores absurdos e remove campos desconhecidos", () => {
  const r = sanitizeScene({ name: "  x  ", duration: 9999, damage: -5, items: [
    { id: "a b!c", type: "burst", t: -3, x: 1e9, y: NaN, count: 1e6, rings: 1e6, speed: 1e9, hack: "<script>" },
    { type: "wall", t: 1, dir: "diagonal", speed: 100, thickness: 16, gapStart: 9999, gapSize: 9999 },
    { type: "laser", t: 1, axis: "h", pos: 9999 },
  ] });
  assert.ok(r.ok, r.error);
  const [b, w, l] = r.scene.items;
  assert.equal(r.scene.name, "x"); assert.equal(r.scene.duration, 120); assert.equal(r.scene.damage, 1);
  assert.equal(b.id, "abc"); assert.equal(b.t, 0); assert.equal(b.x, 540); assert.equal(b.y, 150); // NaN → padrão
  assert.equal(b.count, 48); assert.equal(b.rings, 60); assert.equal(b.speed, 500); assert.equal(b.hack, undefined);
  assert.equal(w.dir, "left"); assert.equal(w.gapSize, 300); assert.equal(w.gapStart, 0);        // brecha cabe na caixa
  assert.equal(l.pos, 300);                                                                        // laser horizontal: até a altura
});

test("sanitizeScene: recusa lixo, tipo desconhecido e excesso de itens; ids ficam únicos", () => {
  assert.equal(sanitizeScene(null).ok, false);
  assert.equal(sanitizeScene({ items: "x" }).ok, false);
  assert.equal(sanitizeScene({ items: [{ type: "nuke", t: 0 }] }).ok, false);
  assert.equal(sanitizeScene({ items: Array.from({ length: 401 }, () => ({ type: "bullet", t: 0, x: 0, y: 0 })) }).ok, false);
  const r = sanitizeScene({ items: [{ id: "x", type: "bullet", t: 0, x: 0, y: 0 }, { id: "x", type: "bullet", t: 1, x: 0, y: 0 }] });
  assert.deepEqual(r.scene.items.map((i) => i.id), ["x", "x_2"]);
});

test("sanitizeScene: cena pesada demais é recusada (evita travar o aparelho)", () => {
  const heavy = Array.from({ length: 4 }, (_, i) => ({ id: `h${i}`, type: "burst", t: 0, x: 240, y: 150, count: 48, rings: 60, speed: 100, r: 4 }));
  const r = sanitizeScene({ items: heavy });
  assert.equal(r.ok, false); assert.match(r.error, /pesada demais/);
  assert.equal(sanitizeScene({ items: heavy.slice(0, 2) }).ok, true);   // 2 x 2880 = 5760: ainda cabe
});

test("spec: todo tipo tem campos e valores padrão coerentes", () => {
  for (const [type, fields] of Object.entries(SPEC)) assert.ok(Object.keys(fields).length > 2, type);
  assert.deepEqual(BOX, { w: 480, h: 300 });
});
