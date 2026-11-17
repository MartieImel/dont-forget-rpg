import { useEffect, useRef, useState } from "react";
import BattleBox from "./BattleBox";
import { api } from "../api";
import { LEAD_IN, advance, createRun } from "../escape/engine.js";
import { drawScene } from "../escape/render.js";
import { useEscapeInput } from "../hooks/useEscapeInput";

// Jogador de uma Cena de Fuga lançada pelo mestre. Começa no instante combinado (relógio do
// servidor), usa o HP e o dano reais, manda cada acerto ao servidor (que desconta da ficha) e
// mostra as almas dos outros jogadores.
const SCALE = 2;
const STEP = 1 / 120;

export default function EscapeLivePlayer({ campaignId, runId, scene, character, damage, startsAt, serverNow, onClock }) {
  const canvasRef = useRef(null);
  const sceneRef = useRef(scene);
  const runRef = useRef(null);
  const othersRef = useRef([]);
  const sentHits = useRef(0);
  const finishSent = useRef(false);
  const [others, setOthers] = useState([]);
  const [hud, setHud] = useState({ status: "idle", hp: character.hp, maxHp: character.hpMax, t: -LEAD_IN, hits: 0, count: 0 });

  sceneRef.current = scene;
  if (!runRef.current) {
    const run = createRun(scene, { hp: character.hp, damage });
    run.maxHp = character.hpMax;
    run.status = "idle";
    runRef.current = run;
  }
  const input = useEscapeInput(canvasRef, sceneRef, () => runRef.current.status === "running");

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf = 0, last = performance.now(), acc = 0, lastHud = 0;

    function frame(now) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const sc = sceneRef.current;
      const run = runRef.current;
      const srv = serverNow();

      // hora de começar: entra na cena já no ponto certo (quem recarrega a página não perde o fio)
      if (run.status === "idle" && srv >= startsAt) {
        run.status = "running";
        run.t = Math.min(sc.duration, -LEAD_IN + (srv - startsAt) / 1000);
      }
      if (run.status === "running") {
        // mantém todo mundo no mesmo ponto da cena: corrige deriva maior que 0,25 s
        const expected = (srv - startsAt) / 1000 - LEAD_IN;
        if (Math.abs(run.t - expected) > 0.25) run.t = Math.min(sc.duration, expected);
        acc += dt;
        const inp = input.readInput();
        while (acc >= STEP && run.status === "running") {
          advance(run, sc, inp, STEP);
          acc -= STEP;
        }
      } else acc = 0;

      // acertos novos: o servidor desconta da ficha e devolve o HP verdadeiro
      while (sentHits.current < run.hits) {
        sentHits.current += 1;
        api.postEscapeHit(campaignId, runId, run.lastHitAt).then((r) => {
          if (typeof r.hp === "number" && r.hp < runRef.current.hp) runRef.current.hp = r.hp;
          if (r.dead) {
            runRef.current.hp = 0;
            runRef.current.status = "dead";
          }
        }).catch(() => { /* acerto fora da janela/ritmo: o servidor recusou, vale o dele */ });
      }
      if (run.status === "won" && !finishSent.current) {
        finishSent.current = true;
        api.finishEscape(campaignId, runId).catch(() => {});
      }

      ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      drawScene(ctx, sc, run, { touch: input.touchView(), others: othersRef.current });

      const d = canvas.dataset;
      d.status = run.status; d.hp = String(run.hp); d.t = run.t.toFixed(2); d.hits = String(run.hits);
      d.soulX = run.soul.x.toFixed(1); d.soulY = run.soul.y.toFixed(1);
      d.others = String(othersRef.current.filter((o) => o.x !== null).length);

      if (now - lastHud > 100) {
        lastHud = now;
        setHud({ status: run.status, hp: run.hp, maxHp: run.maxHp, t: run.t, hits: run.hits });
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 4x por segundo: manda minha posição, recebe a dos outros
  useEffect(() => {
    let stop = false;
    async function tick() {
      const run = runRef.current;
      if (stop || run.status === "idle") return;
      const t0 = Date.now();
      try {
        const r = await api.postEscapeState(campaignId, runId, run.soul.x, run.soul.y);
        onClock && onClock(r.run.serverTime, t0, Date.now());
        othersRef.current = r.players.filter((p) => p.characterId !== character.id);
        setOthers(othersRef.current);
        if (r.me && r.me.hp < run.hp) run.hp = r.me.hp; // o servidor viu mais dano (ex.: o mestre mexeu no HP)
        if (r.me && r.me.hp <= 0 && run.status === "running") run.status = "dead";
      } catch { /* oscilação de rede: tenta de novo no próximo ciclo */ }
    }
    const iv = setInterval(tick, 250);
    return () => { stop = true; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const countdown = hud.status === "idle" ? Math.max(0, Math.ceil((startsAt - serverNow()) / 1000)) : 0;
  const timeLeft = Math.max(0, scene.duration - Math.max(0, hud.t));

  return (
    <div className="stack">
      <div className="escape-stage">
        <canvas ref={canvasRef} className="escape-canvas" data-testid="escape-canvas" width={scene.box.w * SCALE} height={scene.box.h * SCALE} {...input.handlers} />
        {hud.status === "idle" && (
          <div className="escape-result" role="status" data-testid="countdown">
            <strong>{countdown > 0 ? countdown : "JÁ!"}</strong>
            <span>Começa em instantes. Setas ou WASD movem · Shift = devagar · no celular, arraste o dedo.</span>
          </div>
        )}
        {(hud.status === "won" || hud.status === "dead") && (
          <div className="escape-result escape-result-soft" role="status">
            <strong>{hud.status === "won" ? "SOBREVIVEU!" : "VOCÊ CAIU..."}</strong>
            <span>{hud.status === "won" ? "Aguardando os outros terminarem." : "Você acompanha o resto da cena."}</span>
          </div>
        )}
      </div>

      <BattleBox tight>
        <div className="row-between" style={{ gap: 16, flexWrap: "wrap" }}>
          <div style={{ minWidth: 220, flex: 1 }}>
            <div className="row-between" style={{ fontSize: 12, marginBottom: 4 }}>
              <span>{character.name} · HP</span>
              <span data-testid="hud-hp">{hud.hp} / {hud.maxHp}</span>
            </div>
            <div className="escape-hp"><div style={{ width: `${pct}%` }} /></div>
          </div>
          <span className="muted" style={{ fontSize: 12 }} data-testid="hud-time">
            {hud.status === "idle" ? "Aguardando o início" : hud.t < 0 ? "Prepare-se..." : `Faltam ${timeLeft.toFixed(1)}s`} · dano {damage} por acerto
          </span>
        </div>
        {others.length > 0 && (
          <div className="live-list" style={{ marginTop: 10 }}>
            {others.map((o) => (
              <div key={o.characterId} className="live-row">
                <span>{o.name}</span>
                <div className="escape-hp small"><div style={{ width: `${Math.max(0, Math.min(100, (o.hp / o.hpMax) * 100))}%` }} /></div>
                <span className="muted">{o.hp}/{o.hpMax}{o.result === "dead" ? " ✖" : ""}</span>
              </div>
            ))}
          </div>
        )}
      </BattleBox>
    </div>
  );
}
