// Cena de demonstração (3 fases: chuva de balas, paredes com brecha, lasers). Conferida por um robô nos testes..
export function demoScene() {
  const box = { w: 480, h: 300 };
  const items = [];
  let n = 0;
  const id = () => `demo${n++}`;

  // Fase 1 (0–8 s): chuva de balas + balas laterais
  for (let i = 0; i < 14; i++) {
    items.push({ id: id(), type: "bullet", t: 0.5 + i * 0.5, x: 30 + ((i * 97) % 420), y: -6, vx: 0, vy: 110, r: 5 });
  }
  for (let i = 0; i < 4; i++) {
    items.push({ id: id(), type: "bullet", t: 3 + i * 1.2, x: -6, y: 50 + i * 65, vx: 120, vy: 0, r: 5 });
  }

  // Fase 2 (8–17 s): paredes com brecha, uma de cada vez (cada uma termina de
  // atravessar antes da próxima entrar — parede vindo dos dois lados ao mesmo tempo
  // deixava quem estava na borda sem saída)
  [
    [8, "left", 40],
    [11, "right", 190],
    [14, "left", 110],
  ].forEach(([t, dir, gapStart]) => {
    items.push({ id: id(), type: "wall", t, dir, speed: 170, thickness: 16, gapStart, gapSize: 95 });
  });

  // Fase 3 (17–24 s): lasers com aviso + balas lentas dos cantos
  items.push({ id: id(), type: "laser", t: 17, axis: "h", pos: 70, thickness: 18, warn: 1.0, active: 0.6 });
  items.push({ id: id(), type: "laser", t: 18, axis: "v", pos: 330, thickness: 18, warn: 1.0, active: 0.6 });
  items.push({ id: id(), type: "laser", t: 19, axis: "h", pos: 230, thickness: 18, warn: 1.0, active: 0.6 });
  items.push({ id: id(), type: "laser", t: 20, axis: "v", pos: 120, thickness: 18, warn: 1.0, active: 0.6 });
  items.push({ id: id(), type: "laser", t: 21.2, axis: "h", pos: 150, thickness: 18, warn: 1.2, active: 0.7 });
  items.push({ id: id(), type: "laser", t: 21.2, axis: "v", pos: 240, thickness: 18, warn: 1.2, active: 0.7 });
  [
    [17.5, 0, 0, 60, 40],
    [19.5, 480, 0, -60, 40],
    [21, 0, 300, 60, -40],
    [22.5, 480, 300, -60, -40],
  ].forEach(([t, x, y, vx, vy]) => items.push({ id: id(), type: "bullet", t, x, y, vx, vy, r: 6 }));

  return { name: "Demonstração", box, duration: 25, damage: 12, soulStart: { x: 240, y: 150 }, items };
}

// Demonstração 2: usa os tipos novos (espiral, órbita, leques, anéis e perseguidores).
export function demoScene2() {
  const items = [];
  let n = 0;
  const id = () => `pad${n++}`;

  // Fase 1 (1–8 s): espiral saindo do alto (1 bala por anel, girando a cada anel)
  items.push({ id: id(), type: "burst", t: 1, x: 240, y: 40, count: 1, speed: 95, r: 5, arc: 360, angle: 90, rings: 34, interval: 0.18, twist: 31 });

  // Fase 2 (9–16 s): anel girando em volta do centro + leques cruzados dos cantos
  items.push({ id: id(), type: "orbit", t: 9, cx: 240, cy: 150, vx: 0, vy: 0, radius: 75, count: 5, omega: 80, r: 6, life: 7, grow: 0, angle: 0 });
  items.push({ id: id(), type: "burst", t: 10, x: 30, y: 30, count: 6, speed: 130, r: 5, arc: 90, angle: 45, rings: 4, interval: 1.2, twist: 0 });
  items.push({ id: id(), type: "burst", t: 10.6, x: 450, y: 270, count: 6, speed: 130, r: 5, arc: 90, angle: 225, rings: 4, interval: 1.2, twist: 0 });

  // Fase 3 (16–23 s): perseguidores lentos + anéis que se abrem
  items.push({ id: id(), type: "homing", t: 16, x: 60, y: 60, speed: 60, turn: 45, life: 6, r: 7 });
  items.push({ id: id(), type: "homing", t: 18, x: 420, y: 240, speed: 60, turn: 45, life: 6, r: 7 });
  items.push({ id: id(), type: "burst", t: 17, x: 240, y: 150, count: 14, speed: 90, r: 5, arc: 360, angle: 0, rings: 3, interval: 1.4, twist: 13 });

  return { name: "Demonstração 2 — padrões", box: { w: 480, h: 300 }, duration: 24, damage: 10, soulStart: { x: 240, y: 150 }, items };
}
