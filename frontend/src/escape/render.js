// Desenho das Cenas de Fuga num <canvas>. Só desenha: nenhuma regra mora aqui.
import { itemShapes } from "./engine.js";
import { itemAnchor, TYPE_COLORS } from "./editorMath.js";

export const STICK_RADIUS = 36; // raio do joystick de toque, em unidades da cena

function heart(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.95);
  ctx.bezierCurveTo(x + s * 1.5, y + s * 0.1, x + s * 0.95, y - s * 0.95, x, y - s * 0.35);
  ctx.bezierCurveTo(x - s * 0.95, y - s * 0.95, x - s * 1.5, y + s * 0.1, x, y + s * 0.95);
  ctx.closePath();
  ctx.fill();
}

const RING = { bullet: "rgba(255,255,255,0.3)", burst: "rgba(255,255,255,0.3)", orbit: "#5ec8d8", homing: "#ff5a5a" };

function drawCircle(ctx, s, t) {
  if (s.telegraph) {
    // aviso: anel tracejado pulsando, ainda inofensivo
    const pulse = 0.5 + 0.5 * Math.sin(t * 24);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.4 * pulse})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = RING[s.variant] || RING.bullet;
  ctx.lineWidth = s.variant === "homing" || s.variant === "orbit" ? 2.5 : 2;
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.r + 2.5, 0, Math.PI * 2);
  ctx.stroke();
}

function drawShape(ctx, s, t) {
  if (s.kind === "circle") return drawCircle(ctx, s, t);
  if (s.telegraph) {
    // aviso do laser: faixa vermelha tênue pulsando, ainda inofensiva
    const pulse = 0.5 + 0.5 * Math.sin(t * 22);
    ctx.fillStyle = `rgba(255,40,40,${0.07 + 0.1 * pulse})`;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = `rgba(255,70,70,${0.45 + 0.4 * pulse})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(s.x + 0.75, s.y + 0.75, s.w - 1.5, s.h - 1.5);
    ctx.setLineDash([]);
    return;
  }
  ctx.fillStyle = "#fff";
  ctx.fillRect(s.x, s.y, s.w, s.h);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(s.x - 1.5, s.y - 1.5, s.w + 3, s.h + 3);
}

function arrow(ctx, x1, y1, x2, y2, color) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 7 * Math.cos(a - 0.45), y2 - 7 * Math.sin(a - 0.45));
  ctx.lineTo(x2 - 7 * Math.cos(a + 0.45), y2 - 7 * Math.sin(a + 0.45));
  ctx.closePath();
  ctx.fill();
}

// camadas só do editor: marcadores dos itens que ainda não apareceram, item selecionado e guia de arrasto
function drawEditLayer(ctx, scene, run, view) {
  const { w, h } = scene.box;
  for (const it of scene.items) {
    const color = TYPE_COLORS[it.type];
    const selected = it.id === view.selectedId;
    const spawned = run.t >= it.t;
    const a = itemAnchor(it);
    ctx.save();
    ctx.globalAlpha = spawned ? 1 : 0.55;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    if (a) {
      if (!spawned || selected) {
        ctx.setLineDash(spawned ? [] : [2, 3]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y - 6); ctx.lineTo(a.x + 6, a.y); ctx.lineTo(a.x, a.y + 6); ctx.lineTo(a.x - 6, a.y);
        ctx.closePath();
        ctx.stroke();
      }
    } else if (it.type === "laser" && !spawned) {
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      if (it.axis === "h") { ctx.moveTo(0, it.pos); ctx.lineTo(w, it.pos); } else { ctx.moveTo(it.pos, 0); ctx.lineTo(it.pos, h); }
      ctx.stroke();
    } else if (it.type === "wall" && !spawned) {
      const horizontal = it.dir === "left" || it.dir === "right";
      const mid = it.gapStart + it.gapSize / 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(horizontal ? (it.dir === "left" ? w - 16 : 0) : it.gapStart, horizontal ? it.gapStart : (it.dir === "up" ? h - 16 : 0), horizontal ? 16 : it.gapSize, horizontal ? it.gapSize : 16);
      if (horizontal) arrow(ctx, it.dir === "left" ? w - 20 : 20, mid, it.dir === "left" ? w - 60 : 60, mid, color);
      else arrow(ctx, mid, it.dir === "up" ? h - 20 : 20, mid, it.dir === "up" ? h - 60 : 60, color);
    }
    ctx.restore();

    if (selected) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      if (a) {
        ctx.beginPath();
        ctx.arc(a.x, a.y, 12, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (it.type === "bullet") arrow(ctx, it.x, it.y, it.x + it.vx * 0.35, it.y + it.vy * 0.35, color);
      if (it.type === "burst") {
        const rad = (it.angle * Math.PI) / 180;
        arrow(ctx, it.x, it.y, it.x + Math.cos(rad) * 40, it.y + Math.sin(rad) * 40, color);
      }
      if (it.type === "orbit") {
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(it.cx, it.cy, it.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (it.type === "laser") {
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        if (it.axis === "h") { ctx.moveTo(0, it.pos); ctx.lineTo(w, it.pos); } else { ctx.moveTo(it.pos, 0); ctx.lineTo(it.pos, h); }
        ctx.stroke();
      }
      if (it.type === "wall") {
        const horizontal = it.dir === "left" || it.dir === "right";
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        if (horizontal) { ctx.moveTo(0, it.gapStart); ctx.lineTo(w, it.gapStart); ctx.moveTo(0, it.gapStart + it.gapSize); ctx.lineTo(w, it.gapStart + it.gapSize); }
        else { ctx.moveTo(it.gapStart, 0); ctx.lineTo(it.gapStart, h); ctx.moveTo(it.gapStart + it.gapSize, 0); ctx.lineTo(it.gapStart + it.gapSize, h); }
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  const g = view.guide;
  if (g) {
    ctx.save();
    ctx.strokeStyle = "#ffd34d";
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    if (g.kind === "arrow") arrow(ctx, g.x1, g.y1, g.x2, g.y2, "#ffd34d");
    if (g.kind === "circle") {
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// view: { touch?, edit? } — touch: { ox, oy, cx, cy }; edit: { selectedId, guide }
export function drawScene(ctx, scene, run, view = {}) {
  const { w, h } = scene.box;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  const since = run.t - run.lastHitAt;
  const flash = since >= 0 && since < 0.35 ? 1 - since / 0.35 : 0;

  ctx.save();
  ctx.translate(flash > 0 ? Math.sin(run.t * 130) * 3 * flash : 0, 0);

  for (const item of scene.items) {
    for (const s of itemShapes(item, run.t, scene.box, run.dyn)) drawShape(ctx, s, run.t);
  }

  // a alma pisca enquanto está invulnerável
  const visible = run.invuln <= 0 || run.invuln > 1e6 || Math.floor(run.invuln * 12) % 2 === 0;
  if (visible && run.status !== "dead") {
    ctx.fillStyle = "#ff2a2a";
    heart(ctx, run.soul.x, run.soul.y, 7);
    // o ponto onde você realmente é atingido (bem menor que o coração)
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(run.soul.x, run.soul.y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
  ctx.restore();

  if (view.edit) drawEditLayer(ctx, scene, run, view.edit);

  if (flash > 0) {
    ctx.fillStyle = `rgba(255,0,0,${0.28 * flash})`;
    ctx.fillRect(0, 0, w, h);
  }

  if (view.touch) {
    const { ox, oy, cx, cy } = view.touch;
    const dx = cx - ox, dy = cy - oy;
    const len = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, len / STICK_RADIUS);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ox, oy, STICK_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(ox + (dx / len) * STICK_RADIUS * k, oy + (dy / len) * STICK_RADIUS * k, 12, 0, Math.PI * 2);
    ctx.fill();
  }
}
