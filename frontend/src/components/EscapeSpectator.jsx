import { useEffect, useRef, useState } from "react";
import BattleBox from "./BattleBox";
import { api } from "../api";
import { LEAD_IN } from "../escape/engine.js";
import { drawScene } from "../escape/render.js";

// Visão do mestre (e de quem só acompanha): a cena no mesmo instante dos jogadores, com a alma
// de cada um e o HP deles. Observação: os perseguidores dependem da alma de cada jogador e
// por isso só aparecem na tela de quem está jogando.
const SCALE = 2;

export default function EscapeSpectator({ campaignId, runId, scene, startsAt, serverNow, onClock, onCancel }) {
  const canvasRef = useRef(null);
  const playersRef = useRef([]);
  const [players, setPlayers] = useState([]);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    // "run" de mentira só para desenhar: a hora vem do relógio do servidor
    const fake = { t: -LEAD_IN, soul: { x: -999, y: -999 }, invuln: 0, lastHitAt: -Infinity, status: "running", dyn: {} };
    let raf = 0, lastHud = 0;
    function frame(ts) {
      const srv = serverNow();
      fake.t = Math.min(scene.duration, (srv - startsAt) / 1000 - LEAD_IN);
      ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      drawScene(ctx, scene, srv < startsAt ? { ...fake, t: -LEAD_IN } : fake, { others: playersRef.current });
      const d = canvas.dataset;
      d.t = fake.t.toFixed(2);
      d.others = String(playersRef.current.filter((p) => p.x !== null).length);
      if (ts - lastHud > 200) { lastHud = ts; setNow(fake.t); }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let stop = false;
    async function tick() {
      const t0 = Date.now();
      try {
        const r = await api.getEscapeLive(campaignId, runId);
        if (stop) return;
        onClock && onClock(r.run.serverTime, t0, Date.now());
        playersRef.current = r.players;
        setPlayers(r.players);
      } catch { /* tenta no próximo ciclo */ }
    }
    tick();
    const iv = setInterval(tick, 250);
    return () => { stop = true; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countdown = Math.max(0, Math.ceil((startsAt - serverNow()) / 1000));
  return (
    <div className="stack">
      <div className="escape-stage">
        <canvas ref={canvasRef} className="escape-canvas" data-testid="spectator-canvas" width={scene.box.w * SCALE} height={scene.box.h * SCALE} />
        {countdown > 0 && (
          <div className="escape-result" role="status" data-testid="countdown">
            <strong>{countdown}</strong>
            <span>A cena começa em instantes.</span>
          </div>
        )}
      </div>
      <BattleBox tight>
        <div className="row-between" style={{ marginBottom: 8 }}>
          <span className="muted" style={{ fontSize: 12 }} data-testid="hud-time">
            {now < 0 ? "Prepare-se..." : `Faltam ${Math.max(0, scene.duration - now).toFixed(1)}s`}
          </span>
          <button className="btn btn-sm btn-danger" onClick={onCancel}>Encerrar agora</button>
        </div>
        <div className="live-list">
          {players.map((p) => (
            <div key={p.characterId} className="live-row" data-player={p.name}>
              <span>{p.name}</span>
              <div className="escape-hp small"><div style={{ width: `${Math.max(0, Math.min(100, (p.hp / p.hpMax) * 100))}%` }} /></div>
              <span className="muted">{p.hp}/{p.hpMax} · {p.hits} acerto(s){p.result === "dead" ? " ✖" : p.result === "alive" ? " ✔" : ""}</span>
            </div>
          ))}
        </div>
      </BattleBox>
    </div>
  );
}
