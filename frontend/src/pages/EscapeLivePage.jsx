import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BattleBox from "../components/BattleBox";
import EscapeLivePlayer from "../components/EscapeLivePlayer";
import EscapeSpectator from "../components/EscapeSpectator";
import { api } from "../api";

// Uma Cena de Fuga lançada: sala de espera -> contagem -> cena ao vivo -> resultado.
// Mestre e jogadores usam a mesma página; cada um vê o que lhe cabe.
export default function EscapeLivePage() {
  const { id, runId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [scene, setScene] = useState(null);
  const [charId, setCharId] = useState("");
  const [msg, setMsg] = useState("");
  const clock = useRef({ offset: 0, samples: [] });

  const serverNow = useCallback(() => Date.now() + clock.current.offset, []);
  // relógio: guarda o desvio medido na resposta de MENOR ida e volta (a mais confiável)
  const onClock = useCallback((serverTime, t0, t1) => {
    const rtt = t1 - t0;
    const s = clock.current;
    s.samples.push({ rtt, offset: serverTime + rtt / 2 - t1 });
    if (s.samples.length > 8) s.samples.shift();
    s.offset = s.samples.reduce((best, x) => (x.rtt < best.rtt ? x : best)).offset;
  }, []);

  useEffect(() => {
    let stop = false;
    async function tick() {
      const t0 = Date.now();
      try {
        const r = await api.getEscapeRun(id, runId);
        if (stop) return;
        onClock(r.run.serverTime, t0, Date.now());
        setData(r);
        setError("");
      } catch (err) {
        if (!stop) setError(err.message);
      }
    }
    tick();
    const iv = setInterval(tick, 1000);
    return () => { stop = true; clearInterval(iv); };
  }, [id, runId, onClock]);

  const canSeeScene = !!data && (data.role === "mestre" || data.joined);
  useEffect(() => {
    if (canSeeScene && !scene) api.getEscapeScene(id, runId).then((r) => setScene(r.scene)).catch((e) => setError(e.message));
  }, [canSeeScene, scene, id, runId]);

  useEffect(() => {
    if (data && data.myCharacters && data.myCharacters.length && !charId) setCharId(data.myCharacters[0].id);
  }, [data, charId]);

  async function act(fn) {
    try {
      await fn();
      setMsg("");
    } catch (err) {
      setMsg(err.message);
    }
  }
  const back = () => navigate(`/campaigns/${id}/board`);

  if (!data) return <div className="container center-screen muted">{error || "Carregando encontro..."}</div>;
  const { run, players } = data;
  const master = data.role === "mestre";
  const me = players.find((p) => p.characterId === data.characterId);

  return (
    <div className="container stack">
      <div className="row-between">
        <div>
          <span className="eyebrow">CENA DE FUGA{master ? " · VOCÊ É O MESTRE" : ""}</span>
          <h1>{run.sceneName}</h1>
          <span className="muted">Dano por acerto: {run.damage} (fixo) · {Math.round(run.duration)} s</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={back}>Voltar ao tabuleiro</button>
      </div>
      {msg && <p className="error-text" role="alert">{msg}</p>}

      {run.status === "lobby" && (
        <BattleBox data-testid="lobby">
          <h3>SALA DE ESPERA</h3>
          <div className="live-list" style={{ margin: "10px 0" }}>
            {players.length === 0 && <span className="muted" style={{ fontSize: 12 }}>Ninguém entrou ainda.</span>}
            {players.map((p) => (
              <div key={p.characterId} className="live-row" data-player={p.name}>
                <span>{p.name}</span>
                <div className="escape-hp small"><div style={{ width: `${(p.hp / p.hpMax) * 100}%` }} /></div>
                <span className="muted">{p.hp}/{p.hpMax}</span>
              </div>
            ))}
          </div>
          {master && (
            <div className="btn-row">
              <button className="btn btn-gold" disabled={players.length === 0} onClick={() => act(() => api.startEscape(id, runId))}>Começar ({players.length})</button>
              <button className="btn btn-danger" onClick={() => act(() => api.cancelEscape(id, runId))}>Cancelar</button>
            </div>
          )}
          {!master && !data.joined && data.myCharacters && (
            data.myCharacters.length === 0 ? (
              <p className="muted">Você não tem personagem nessa campanha.</p>
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                <p className="hint">Cada acerto tira {run.damage} de HP da ficha, de verdade. O mestre decide quando começa.</p>
                {data.myCharacters.length > 1 && (
                  <select value={charId} onChange={(e) => setCharId(e.target.value)}>
                    {data.myCharacters.map((c) => <option key={c.id} value={c.id}>{c.name} (HP {c.hp}/{c.hpMax})</option>)}
                  </select>
                )}
                <button className="btn btn-primary" onClick={() => act(() => api.joinEscape(id, runId, charId))}>
                  Entrar na cena{data.myCharacters.length === 1 ? ` com ${data.myCharacters[0].name} (HP ${data.myCharacters[0].hp}/${data.myCharacters[0].hpMax})` : ""}
                </button>
              </div>
            )
          )}
          {!master && data.joined && <p className="narration" data-testid="waiting">Você entrou como {me && me.name}. Aguardando o mestre começar...</p>}
        </BattleBox>
      )}

      {run.status === "running" && (
        <>
          {master && scene && <EscapeSpectator campaignId={id} runId={runId} scene={scene} startsAt={run.startsAt} serverNow={serverNow} onClock={onClock} onCancel={() => act(() => api.cancelEscape(id, runId))} />}
          {!master && data.joined && scene && me && (
            <EscapeLivePlayer campaignId={id} runId={runId} scene={scene} character={{ id: me.characterId, name: me.name, hp: me.hp, hpMax: me.hpMax }} damage={run.damage} startsAt={run.startsAt} serverNow={serverNow} onClock={onClock} />
          )}
          {!master && !data.joined && (
            <BattleBox><p className="narration">A cena já começou e você não entrou nela.</p></BattleBox>
          )}
        </>
      )}

      {(run.status === "finished" || run.status === "cancelled") && (
        <BattleBox data-testid="results">
          <h3>{run.status === "cancelled" ? "ENCERRADA PELO MESTRE" : "RESULTADO"}</h3>
          <table className="live-table">
            <thead><tr><th>Personagem</th><th>HP final</th><th>Acertos</th><th>Dano</th><th>Resultado</th></tr></thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.characterId} data-player={p.name} className={p.characterId === data.characterId ? "me" : ""}>
                  <td>{p.name}</td>
                  <td>{p.hp}/{p.hpMax}</td>
                  <td>{p.hits}</td>
                  <td>{p.damageTaken}</td>
                  <td>{p.result === "dead" ? "caiu ✖" : "sobreviveu ✔"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {players.length === 0 && <p className="muted">Ninguém participou.</p>}
          <p className="hint">O HP descontado já está nas fichas e no tabuleiro.</p>
          <button className="btn btn-primary" onClick={back}>Voltar ao tabuleiro</button>
        </BattleBox>
      )}
    </div>
  );
}
