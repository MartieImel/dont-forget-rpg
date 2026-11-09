// Testes das ferramentas do editor:  node --test src/escape/editorMath.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { makeItem, moveItemTo, pickItem, pickItems, toScenePoint, itemAnchor, snapTime } from "./editorMath.js";
import { sanitizeItem } from "./spec.js";
import { previewRun, createRun, advance } from "./engine.js";
import { demoScene2 } from "./scenes.js";

const scene = (items) => ({ name: "t", box: { w: 480, h: 300 }, duration: 20, damage: 10, soulStart: { x: 240, y: 150 }, items });
const ok = (raw) => { const r = sanitizeItem({ ...raw, id: "x" }, 20, "x"); assert.ok(r.item, r.error); return r.item; };

test("toScenePoint: converte a tela em coordenadas da cena e trata as bordas", () => {
  const rect = { left: 100, top: 50, width: 960, height: 600 }; // escala 2x
  assert.deepEqual(toScenePoint(rect, 100, 50), { x: 0, y: 0 });
  assert.deepEqual(toScenePoint(rect, 580, 350), { x: 240, y: 150 });
  assert.equal(toScenePoint(rect, 99, 100), null);                       // fora
  assert.deepEqual(toScenePoint(rect, 5000, -50, true), { x: 480, y: 0 }); // preso na borda
  assert.equal(toScenePoint({ left: 0, top: 0, width: 0, height: 0 }, 1, 1), null);
});

test("makeItem: todo tipo vira um item válido (clique e arrasto) que passa pela faxina sem mudar", () => {
  const p0 = { x: 200, y: 100 };
  for (const type of ["bullet", "burst", "orbit", "homing", "wall", "laser"]) {
    for (const p1 of [p0, { x: 260, y: 140 }]) {
      const raw = makeItem(type, p0, p1, { t: 2.5, wallDir: "right", laserAxis: "v" });
      const clean = ok(raw);
      for (const k of Object.keys(raw)) assert.equal(clean[k], raw[k], `${type}.${k}`);
    }
  }
});

test("makeItem: arrasto define direção/velocidade da bala, leque da rajada e raio da órbita", () => {
  const b = makeItem("bullet", { x: 100, y: 100 }, { x: 160, y: 100 }, { t: 0 });          // 60 px → 90 px/s para a direita
  assert.equal(b.vx, 90); assert.equal(b.vy, 0);
  const click = makeItem("bullet", { x: 100, y: 100 }, { x: 103, y: 100 }, { t: 0 });       // <12 px = clique: padrão
  assert.equal(click.vy, 110); assert.equal(click.vx, 0);
  const f = makeItem("burst", { x: 100, y: 100 }, { x: 100, y: 160 }, { t: 0 });            // arrasto para baixo
  assert.equal(f.angle, 90); assert.equal(f.arc, 70); assert.equal(f.count, 7);
  const o = makeItem("orbit", { x: 100, y: 100 }, { x: 180, y: 100 }, { t: 0 });
  assert.equal(o.radius, 80);
});

test("makeItem: parede e laser usam a direção/eixo escolhidos e a posição do clique", () => {
  const w = makeItem("wall", { x: 300, y: 120 }, { x: 300, y: 120 }, { t: 0, wallDir: "down" });
  assert.equal(w.dir, "down"); assert.equal(w.gapStart, Math.round(300 - w.gapSize / 2)); // eixo x para parede vertical
  const w2 = makeItem("wall", { x: 300, y: 120 }, { x: 300, y: 120 }, { t: 0, wallDir: "left" });
  assert.equal(w2.gapStart, Math.round(120 - w2.gapSize / 2));
  assert.equal(makeItem("laser", { x: 77, y: 33 }, { x: 77, y: 33 }, { t: 0, laserAxis: "h" }).pos, 33);
  assert.equal(makeItem("laser", { x: 77, y: 33 }, { x: 77, y: 33 }, { t: 0, laserAxis: "v" }).pos, 77);
});

test("moveItemTo: cada tipo move o campo certo", () => {
  assert.deepEqual(moveItemTo({ type: "bullet" }, { x: 5, y: 6 }), { x: 5, y: 6 });
  assert.deepEqual(moveItemTo({ type: "orbit" }, { x: 5, y: 6 }), { cx: 5, cy: 6 });
  assert.deepEqual(moveItemTo({ type: "laser", axis: "h" }, { x: 5, y: 6 }), { pos: 6 });
  assert.deepEqual(moveItemTo({ type: "laser", axis: "v" }, { x: 5, y: 6 }), { pos: 5 });
  assert.deepEqual(moveItemTo({ type: "wall", dir: "left", gapSize: 100 }, { x: 5, y: 200 }), { gapStart: 150 });
  assert.deepEqual(moveItemTo({ type: "wall", dir: "down", gapSize: 100 }, { x: 300, y: 5 }), { gapStart: 250 });
});

test("pickItem: acha o item embaixo do clique (aparecido ou ainda não) e o de cima ganha", () => {
  const a = ok({ type: "bullet", t: 5, x: 100, y: 100, vx: 0, vy: 0, r: 5 });
  const b = ok({ ...a, id: "b", t: 0 }); b.id = "b";
  const l = ok({ type: "laser", t: 3, axis: "h", pos: 200 }); l.id = "l";
  const sc = scene([{ ...a, id: "a" }, b, l]);
  const run = previewRun(sc, 1);                                   // 1 s: a bala "a" (t=5) ainda não apareceu
  assert.equal(pickItem(sc, run, { x: 103, y: 100 }), "b");        // "b" está lá e é visível; "a" está por baixo... ganha o de cima da lista
  assert.equal(pickItem(sc, run, { x: 300, y: 200 }), "l");        // laser por geometria, mesmo antes de aparecer
  assert.equal(pickItem(sc, run, { x: 300, y: 50 }), null);
  const run2 = previewRun(sc, 0);
  assert.equal(pickItem(sc, run2, { x: 108, y: 105 }), "b");       // marcador (âncora) de item futuro também é clicável
});

test("snapTime e âncoras", () => {
  assert.equal(snapTime(1.2000000000000002), 1.2);
  assert.equal(snapTime(3.07), 3.05);
  assert.deepEqual(itemAnchor({ type: "orbit", cx: 1, cy: 2 }), { x: 1, y: 2 });
  assert.equal(itemAnchor({ type: "laser" }), null);
});

test("fluxo completo: itens criados como o editor cria rodam no motor sem erro e dá pra jogar até o fim", () => {
  const items = ["bullet", "burst", "orbit", "homing", "wall", "laser"].map((type, i) => ({ ...ok(makeItem(type, { x: 120 + i * 50, y: 90 }, { x: 120 + i * 50, y: 90 }, { t: i })), id: type + i }));
  const sc = scene(items);
  const run = createRun(sc, { hp: 1e9 });
  while (run.status === "running") advance(run, sc, { x: Math.sin(run.t), y: Math.cos(run.t) }, 1 / 60);
  assert.equal(run.status, "won");
});

test("previewRun na demo 2 inclui os perseguidores no instante certo", () => {
  const sc = demoScene2();
  const before = previewRun(sc, 15.9), after = previewRun(sc, 17);
  assert.equal(Object.keys(before.dyn).length, 0);
  assert.equal(Object.keys(after.dyn).length, 1);
});

test("pickItems: itens empilhados voltam todos, de cima para baixo (dá para alternar)", () => {
  const mk = (id, type, extra) => ({ ...ok({ type, t: 0, ...extra }), id });
  const sc = scene([mk("burst", "burst", { x: 240, y: 150 }), mk("orbit", "orbit", { cx: 240, cy: 150 }), mk("alone", "bullet", { x: 50, y: 50, vx: 0, vy: 0 })]);
  const run = previewRun(sc, 0);
  assert.deepEqual(pickItems(sc, run, { x: 240, y: 150 }), ["orbit", "burst"]);   // o criado por último fica em cima
  assert.equal(pickItem(sc, run, { x: 240, y: 150 }), "orbit");
  assert.deepEqual(pickItems(sc, run, { x: 50, y: 52 }), ["alone"]);
  assert.deepEqual(pickItems(sc, run, { x: 400, y: 280 }), []);
});
