import { useEffect, useRef, useState } from "react";
import BattleBox from "./BattleBox";
import { createRun, advance } from "../escape/engine.js";
import { drawScene, STICK_RADIUS } from "../escape/render.js";

// Jogador de Cena de Fuga: canvas + controles (teclado, Shift, toque) + HUD + resultado.
// Usado no laboratório e no "Testar jogando" do editor; depois, na campanha de verdade.
const SCALE = 2; // resolução interna do canvas (nítido em telas retina)
const STEP = 1 / 120; // passo fixo da simulação
const KEYS = {
  ArrowLeft: "l", a: "l", A: "l",
  ArrowRight: "r", d: "r", D: "r",
  ArrowUp: "u", w: "u", W: "u",
  ArrowDown: "d", s: "d", S: "d",
};

const idleRun = (scene, hp, damage) => ({ ...createRun(scene, { hp, damage }), status: "idle" });

export default function EscapePlayer({ scene, hp = 60, damage }) {
  const dmg = damage ?? scene.damage;
  const canvasRef = useRef(null);
  const sceneRef = useRef(scene);
  const cfgRef = useRef({ hp, damage: dmg });
  const runRef = useRef(null);
  const keysRef = useRef(new Set());
  const shiftRef = useRef(false);
  const touchRef = useRef(null); // { id, ox, oy, cx, cy } em px da tela
  const [hud, setHud] = useState({ t: -1, hp, maxHp: hp, status: "idle", hits: 0 });

  sceneRef.current = scene;
  cfgRef.current = { hp, damage: dmg };
  if (!runRef.current) runRef.current = idleRun(scene, hp, dmg);

  // cena/HP/dano mudaram enquanto está parado: atualiza a prévia
  useEffect(() => {
    if (runRef.current.status === "idle") {
      runRef.current = idleRun(scene, hp, dmg);
      setHud({ t: -1, hp, maxHp: hp, status: "idle", hits: 0 });
    }
  }, [scene, hp, dmg]);

  function start() {
    runRef.current = createRun(sceneRef.current, cfgRef.current);
    keysRef.current.clear();
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    function onKeyDown(e) {
      if (e.key === "Shift") shiftRef.current = true;
      const k = KEYS[e.key];
      if (!k) return;
      const tag = (e.target && e.target.tagName) || "";
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (runRef.current.status === "running") e.preventDefault(); // não rolar a página jogando
      keysRef.current.add(k);
    }
    function onKeyUp(e) {
      if (e.key === "Shift") shiftRef.current = false;
      const k = KEYS[e.key];
      if (k) keysRef.current.delete(k);
    }
    function onBlur() {
      keysRef.current.clear();
      shiftRef.current = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    function readInput() {
      const t = touchRef.current;
      if (t) {
        const dx = t.cx - t.ox, dy = t.cy - t.oy;
        const rect = canvas.getBoundingClientRect();
        const unit = rect.width / sceneRef.current.box.w; // px de tela por unidade da cena
        const len = Math.hypot(dx, dy) / unit;
        if (len < 4) return { x: 0, y: 0, slow: false }; // zona morta
        const k = Math.min(1, len / STICK_RADIUS);
        return { x: (dx / unit / len) * k, y: (dy / unit / len) * k, slow: false };
      }
      const ks = keysRef.current;
      return { x: (ks.has("r") ? 1 : 0) - (ks.has("l") ? 1 : 0), y: (ks.has("d") ? 1 : 0) - (ks.has("u") ? 1 : 0), slow: shiftRef.current };
    }

    function touchView() {
      const t = touchRef.current;
      if (!t) return undefined;
      const rect = canvas.getBoundingClientRect();
      const f = sceneRef.current.box.w / rect.width;
      return { ox: (t.ox - rect.left) * f, oy: (t.oy - rect.top) * f, cx: (t.cx - rect.left) * f, cy: (t.cy - rect.top) * f };
    }

    let raf = 0, last = performance.now(), acc = 0, lastHud = 0;
    function frame(now) {
      const dt = Math.min(0.1, (now - last) / 1000); // aba parada não vira "salto"
      last = now;
      const sc = sceneRef.current;
      const run = runRef.current;
      if (run.status === "running") {
        acc += dt;
        const input = readInput();
        while (acc >= STEP && run.status === "running") {
          advance(run, sc, input, STEP);
          acc -= STEP;
        }
      } else acc = 0;

      ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      drawScene(ctx, sc, run, { touch: touchView() });

      // valores de depuração/teste automático (barato: só atributos do canvas)
      const d = canvas.dataset;
      d.status = run.status; d.hp = String(run.hp); d.t = run.t.toFixed(2); d.hits = String(run.hits);
      d.soulX = run.soul.x.toFixed(1); d.soulY = run.soul.y.toFixed(1);

      if (now - lastHud > 100 || run.status !== "running") {
        lastHud = now;
        setHud((h) => (h.t === run.t && h.hp === run.hp && h.status === run.status ? h : { t: run.t, hp: run.hp, maxHp: run.maxHp, status: run.status, hits: run.hits }));
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // ---- toque: arrastar em qualquer ponto da tela vira um joystick ----
  function onPointerDown(e) {
    if (e.pointerType === "mouse" || touchRef.current) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    touchRef.current = { id: e.pointerId, ox: e.clientX, oy: e.clientY, cx: e.clientX, cy: e.clientY };
  }
  function onPointerMove(e) {
    const t = touchRef.current;
    if (t && t.id === e.pointerId) {
      t.cx = e.clientX;
      t.cy = e.clientY;
    }
  }
  function onPointerUp(e) {
    if (touchRef.current && touchRef.current.id === e.pointerId) touchRef.current = null;
  }

  const pct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const timeLeft = Math.max(0, scene.duration - Math.max(0, hud.t));

  return (
    <div className="stack">
      <div className="escape-stage">
        <canvas
          ref={canvasRef}
          className="escape-canvas"
          data-testid="escape-canvas"
          width={scene.box.w * SCALE}
          height={scene.box.h * SCALE}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        {(hud.status === "won" || hud.status === "dead") && (
          <div className="escape-result" role="status">
            <strong>{hud.status === "won" ? "SOBREVIVEU!" : "VOCÊ CAIU..."}</strong>
            <span>{hud.hits === 0 ? "Sem nenhum acerto." : `${hud.hits} acerto(s), ${hud.maxHp - hud.hp} de dano.`}</span>
            <button className="btn btn-primary" onClick={start}>
              Jogar de novo
            </button>
          </div>
        )}
      </div>

      <BattleBox tight>
        <div className="row-between" style={{ gap: 16, flexWrap: "wrap" }}>
          <div style={{ minWidth: 220, flex: 1 }}>
            <div className="row-between" style={{ fontSize: 12, marginBottom: 4 }}>
              <span>HP</span>
              <span data-testid="hud-hp">{hud.hp} / {hud.maxHp}</span>
            </div>
            <div className="escape-hp"><div style={{ width: `${pct}%` }} /></div>
          </div>
          <span className="muted" style={{ fontSize: 12 }} data-testid="hud-time">
            {hud.status === "idle" ? `Duração ${scene.duration}s · dano ${dmg} por acerto` : hud.t < 0 ? "Prepare-se..." : `Faltam ${timeLeft.toFixed(1)}s`}
          </span>
          <button className="btn btn-primary btn-sm" onClick={start}>
            {hud.status === "idle" ? "Jogar" : "Reiniciar"}
          </button>
        </div>
      </BattleBox>
    </div>
  );
}
