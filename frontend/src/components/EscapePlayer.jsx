import { useEffect, useRef, useState } from "react";
import BattleBox from "./BattleBox";
import { createRun, advance } from "../escape/engine.js";
import { drawScene } from "../escape/render.js";
import { useEscapeInput } from "../hooks/useEscapeInput";

// Jogador de Cena de Fuga (solo): canvas + controles + HUD + resultado. Usado no laboratório e
// no "Testar jogando" do editor. (Para jogar junto com os outros, veja EscapeLivePlayer.)
const SCALE = 2; // resolução interna do canvas (nítido em telas retina)
const STEP = 1 / 120; // passo fixo da simulação

const idleRun = (scene, hp, damage) => ({ ...createRun(scene, { hp, damage }), status: "idle" });

export default function EscapePlayer({ scene, hp = 60, damage }) {
  const dmg = damage ?? scene.damage;
  const canvasRef = useRef(null);
  const sceneRef = useRef(scene);
  const cfgRef = useRef({ hp, damage: dmg });
  const runRef = useRef(null);
  const [hud, setHud] = useState({ t: -1, hp, maxHp: hp, status: "idle", hits: 0 });

  sceneRef.current = scene;
  cfgRef.current = { hp, damage: dmg };
  if (!runRef.current) runRef.current = idleRun(scene, hp, dmg);
  const input = useEscapeInput(canvasRef, sceneRef, () => runRef.current.status === "running");

  // cena/HP/dano mudaram enquanto está parado: atualiza a prévia
  useEffect(() => {
    if (runRef.current.status === "idle") {
      runRef.current = idleRun(scene, hp, dmg);
      setHud({ t: -1, hp, maxHp: hp, status: "idle", hits: 0 });
    }
  }, [scene, hp, dmg]);

  function start() {
    runRef.current = createRun(sceneRef.current, cfgRef.current);
    input.reset();
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf = 0, last = performance.now(), acc = 0, lastHud = 0;
    function frame(now) {
      const dt = Math.min(0.1, (now - last) / 1000); // aba parada não vira "salto"
      last = now;
      const sc = sceneRef.current;
      const run = runRef.current;
      if (run.status === "running") {
        acc += dt;
        const inp = input.readInput();
        while (acc >= STEP && run.status === "running") {
          advance(run, sc, inp, STEP);
          acc -= STEP;
        }
      } else acc = 0;

      ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      drawScene(ctx, sc, run, { touch: input.touchView() });

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
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          {...input.handlers}
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
