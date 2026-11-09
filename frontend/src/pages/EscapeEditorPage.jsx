import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BattleBox from "../components/BattleBox";
import EscapePlayer from "../components/EscapePlayer";
import { api } from "../api";
import { advance, checkBeatable, previewRun } from "../escape/engine.js";
import { ENUMS, ITEM_TYPES, LABELS, LIMITS, SPEC, sanitizeItem, sanitizeScene } from "../escape/spec.js";
import { TYPE_COLORS, TYPE_HINTS, TYPE_NAMES, makeItem, moveItemTo, pickItems, snapTime, toScenePoint } from "../escape/editorMath.js";
import { drawScene } from "../escape/render.js";

// Editor de Cenas de Fuga (estilo "Mario Maker"): o mestre monta os ataques sobre uma linha
// do tempo, vê a prévia, testa jogando ele mesmo e guarda na biblioteca da campanha.
const SCALE = 2;
const STEP = 1 / 120;
let uidCounter = 0;
const uid = () => `i${Date.now().toString(36)}${(uidCounter++).toString(36)}`;
const blankScene = () => ({ name: "Nova cena", box: { w: 480, h: 300 }, duration: 20, damage: 10, soulStart: { x: 240, y: 150 }, items: [] });
const r3 = (v) => Math.round(v * 1000) / 1000;

function NumField({ label, value, onCommit, step }) {
  const commit = (e) => {
    const v = Number(e.target.value);
    if (!Number.isFinite(v) || v === value) e.target.value = String(value);
    else onCommit(v);
  };
  return (
    <label className="ed-field">
      <span>{label}</span>
      <input
        key={String(value)}
        type="number"
        step={step ?? "any"}
        defaultValue={value}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
    </label>
  );
}

export default function EscapeEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [role, setRole] = useState(null);
  const [scene, setScene] = useState(blankScene);
  const [sceneId, setSceneId] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [library, setLibrary] = useState([]);
  const [tool, setTool] = useState("select");
  const [wallDir, setWallDir] = useState("left");
  const [laserAxis, setLaserAxis] = useState("h");
  const [selectedId, setSelectedId] = useState(null);
  const [time, setTime] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const [mode, setMode] = useState("edit");
  const [msg, setMsg] = useState(null);
  const [check, setCheck] = useState(null);
  const [guide, setGuide] = useState(null);
  const [testHp, setTestHp] = useState(60);

  const canvasRef = useRef(null);
  const runRef = useRef(null);
  const dragRef = useRef(null);
  const importRef = useRef(null);
  const stateRef = useRef({});
  stateRef.current = { scene, previewing, selectedId, guide };

  const selected = scene.items.find((i) => i.id === selectedId) || null;
  const say = (kind, text) => setMsg({ kind, text });

  // ---------- acesso e biblioteca ----------
  const refreshLibrary = useCallback(async () => {
    try {
      setLibrary((await api.listEscapes(id)).scenes);
    } catch {
      /* a lista é só conveniência */
    }
  }, [id]);

  useEffect(() => {
    api.getBoard(id).then((d) => setRole(d.role)).catch(() => setRole("erro"));
    refreshLibrary();
  }, [id, refreshLibrary]);

  useEffect(() => {
    const warn = (e) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // ---------- edição ----------
  const edit = useCallback((fn) => {
    setScene(fn);
    setDirty(true);
    setCheck(null);
  }, []);

  const updateItem = useCallback(
    (itemId, patch) =>
      edit((s) => ({
        ...s,
        items: s.items.map((it) => {
          if (it.id !== itemId) return it;
          const r = sanitizeItem({ ...it, ...patch }, s.duration, itemId);
          return r.item ?? it;
        }),
      })),
    [edit]
  );

  function addItem(raw) {
    if (scene.items.length >= LIMITS.maxItems) return say("err", `Limite de ${LIMITS.maxItems} itens por cena.`);
    const res = sanitizeItem({ ...raw, id: uid() }, scene.duration, uid());
    if (!res.item) return say("err", res.error);
    edit((s) => ({ ...s, items: [...s.items, res.item] }));
    setSelectedId(res.item.id);
    setMsg(null);
  }

  function deleteSelected() {
    if (!selected) return;
    edit((s) => ({ ...s, items: s.items.filter((i) => i.id !== selected.id) }));
    setSelectedId(null);
  }

  function duplicateSelected() {
    if (!selected) return;
    addItem({ ...selected, id: undefined, t: Math.min(selected.t + 0.5, scene.duration - 0.05) });
  }

  function setDuration(v) {
    const d = Math.min(LIMITS.duration[1], Math.max(LIMITS.duration[0], v));
    edit((s) => ({ ...s, duration: d, items: s.items.map((it) => ({ ...it, t: Math.min(it.t, r3(d - 0.05)) })) }));
    setTime((t) => Math.min(t, d));
  }

  // ---------- prévia: com o tempo parado ou animada ----------
  useEffect(() => {
    if (!previewing) runRef.current = previewRun(scene, time);
  }, [scene, time, previewing]);

  function startPreview() {
    const from = time >= scene.duration - 0.1 ? 0 : time;
    if (from !== time) setTime(from);
    runRef.current = previewRun(scene, from);
    setPreviewing(true);
  }

  useEffect(() => {
    if (mode !== "edit" || role !== "mestre") return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    let raf = 0, last = performance.now(), acc = 0, lastTime = 0;
    function frame(now) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const v = stateRef.current;
      const run = runRef.current;
      if (v.previewing && run) {
        acc += dt;
        while (acc >= STEP && run.status === "running") {
          advance(run, v.scene, {}, STEP);
          acc -= STEP;
        }
        if (now - lastTime > 80) {
          lastTime = now;
          setTime(Math.max(0, r3(run.t)));
        }
        if (run.status !== "running") {
          setPreviewing(false);
          setTime(v.scene.duration);
        }
      }
      if (run) {
        ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
        drawScene(ctx, v.scene, run, { edit: { selectedId: v.selectedId, guide: v.guide } });
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [mode, role]);

  // ---------- atalhos ----------
  useEffect(() => {
    function onKey(e) {
      const tag = (e.target && e.target.tagName) || "";
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag) || mode !== "edit") return;
      if (e.key === "Escape") {
        setTool("select");
        setSelectedId(null);
        setPreviewing(false);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        deleteSelected();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---------- mouse no palco ----------
  const pointOf = (e, clamp = false) => toScenePoint(canvasRef.current.getBoundingClientRect(), e.clientX, e.clientY, clamp);

  function onStageDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const p = pointOf(e);
    if (!p) return;
    setPreviewing(false);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (tool === "select") {
      const hits = pickItems(scene, runRef.current, p);
      if (hits.length === 0) {
        setSelectedId(null);
        dragRef.current = null;
      } else {
        // se o item selecionado já está embaixo do clique, mantém (para arrastar) e,
        // se foi só um clique, alterna para o próximo item empilhado ao soltar
        const keep = hits.includes(selectedId);
        const chosen = keep ? selectedId : hits[0];
        setSelectedId(chosen);
        dragRef.current = { mode: "move", id: chosen, moved: false, cycle: keep && hits.length > 1 ? hits : null };
      }
    } else {
      dragRef.current = { mode: "place", p0: p, p1: p };
    }
  }

  function guideFor(type, p0, p1) {
    if (Math.hypot(p1.x - p0.x, p1.y - p0.y) < 12) return null;
    if (type === "orbit") return { kind: "circle", x: p0.x, y: p0.y, r: Math.hypot(p1.x - p0.x, p1.y - p0.y) };
    if (type === "bullet" || type === "burst") return { kind: "arrow", x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y };
    return null;
  }

  function onStageMove(e) {
    const d = dragRef.current;
    if (!d) return;
    const p = pointOf(e, true);
    if (!p) return;
    if (d.mode === "move") {
      d.moved = true;
      const it = stateRef.current.scene.items.find((i) => i.id === d.id);
      if (it) updateItem(d.id, moveItemTo(it, p));
    } else {
      d.p1 = p;
      setGuide(guideFor(tool, d.p0, p));
    }
  }

  function onStageUp() {
    const d = dragRef.current;
    dragRef.current = null;
    setGuide(null);
    if (d && d.mode === "move" && !d.moved && d.cycle) setSelectedId(d.cycle[(d.cycle.indexOf(d.id) + 1) % d.cycle.length]);
    if (d && d.mode === "place") addItem(makeItem(tool, d.p0, d.p1, { t: snapTime(time), wallDir, laserAxis }));
  }

  // ---------- linha do tempo ----------
  function seekFromTimeline(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * scene.duration;
    setPreviewing(false);
    setTime(snapTime(Math.max(0, Math.min(scene.duration, t))));
  }

  // ---------- salvar, abrir, exportar ----------
  async function save() {
    const res = sanitizeScene(scene);
    if (!res.ok) return say("err", res.error);
    try {
      if (sceneId) await api.updateEscape(id, sceneId, res.scene);
      else setSceneId((await api.createEscape(id, res.scene)).id);
      setDirty(false);
      say("ok", "Cena salva na biblioteca da campanha.");
      refreshLibrary();
    } catch (err) {
      say("err", err.message);
    }
  }

  async function openScene(sid) {
    if (dirty && !confirm("Há alterações não salvas. Abrir outra cena mesmo assim?")) return;
    try {
      const r = await api.getEscape(id, sid);
      setScene(r.scene);
      setSceneId(sid);
      setDirty(false);
      setSelectedId(null);
      setTime(0);
      setPreviewing(false);
      setCheck(null);
      setMsg(null);
    } catch (err) {
      say("err", err.message);
    }
  }

  function newScene() {
    if (dirty && !confirm("Há alterações não salvas. Começar uma cena nova mesmo assim?")) return;
    setScene(blankScene());
    setSceneId(null);
    setDirty(false);
    setSelectedId(null);
    setTime(0);
    setCheck(null);
    setMsg(null);
  }

  async function removeScene(sid, name) {
    if (!confirm(`Excluir a cena "${name}"?`)) return;
    try {
      await api.deleteEscape(id, sid);
      if (sid === sceneId) setSceneId(null);
      refreshLibrary();
    } catch (err) {
      say("err", err.message);
    }
  }

  function exportJson() {
    const res = sanitizeScene(scene);
    const blob = new Blob([JSON.stringify(res.scene, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(scene.name || "cena").replace(/[^\w-]+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importJson(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const res = sanitizeScene(JSON.parse(await file.text()));
      if (!res.ok) return say("err", res.error);
      setScene(res.scene);
      setSceneId(null);
      setDirty(true);
      setSelectedId(null);
      setTime(0);
      say("ok", "Cena importada (ainda não salva).");
    } catch {
      say("err", "Esse arquivo não é uma cena válida.");
    }
  }

  function runCheck() {
    setCheck({ running: true });
    setTimeout(() => setCheck(checkBeatable(sanitizeScene(scene).scene)), 30);
  }

  const playScene = useMemo(() => sanitizeScene(scene).scene, [scene]);
  const sorted = useMemo(() => [...scene.items].sort((a, b) => a.t - b.t), [scene.items]);

  if (role === null) return <div className="container center-screen muted">Carregando editor...</div>;
  if (role !== "mestre") {
    return (
      <div className="container stack">
        <BattleBox>
          <p className="narration">Só o mestre da campanha pode editar cenas de fuga.</p>
          <button className="btn" onClick={() => navigate(`/campaigns/${id}`)}>Voltar</button>
        </BattleBox>
      </div>
    );
  }

  return (
    <div className="container stack">
      <div className="row-between">
        <div>
          <span className="eyebrow">EDITOR DE CENAS DE FUGA{dirty ? " · alterações não salvas" : ""}</span>
          <h1>{scene.name}</h1>
        </div>
        <div className="btn-row">
          <button className="btn btn-sm" onClick={newScene}>Nova</button>
          <button className="btn btn-sm btn-primary" onClick={save}>Salvar</button>
          <button className="btn btn-sm btn-gold" onClick={() => { setPreviewing(false); setMode(mode === "edit" ? "test" : "edit"); }}>
            {mode === "edit" ? "Testar jogando" : "Voltar a editar"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/campaigns/${id}/board`)}>Voltar</button>
        </div>
      </div>

      {msg && <p className={msg.kind === "ok" ? "hint" : "error-text"} role="alert" style={msg.kind === "ok" ? { color: "var(--accent-green)" } : undefined}>{msg.text}</p>}

      <div className="escape-editor">
        <div className="stack">
          {mode === "test" ? (
            <>
              <div className="btn-row">
                <label className="muted" style={{ fontSize: 11 }}>HP de teste</label>
                <input type="number" min={1} max={999} style={{ width: 64 }} value={testHp} onChange={(e) => setTestHp(Math.max(1, Number(e.target.value) || 1))} />
                <span className="muted" style={{ fontSize: 12 }}>Dano por acerto: {scene.damage} (fixo da cena)</span>
              </div>
              <EscapePlayer scene={playScene} hp={testHp} damage={scene.damage} />
            </>
          ) : (
            <>
              <div className="escape-stage">
                <canvas
                  ref={canvasRef}
                  className="escape-canvas"
                  data-testid="editor-canvas"
                  style={{ cursor: tool === "select" ? "default" : "crosshair" }}
                  width={scene.box.w * SCALE}
                  height={scene.box.h * SCALE}
                  onPointerDown={onStageDown}
                  onPointerMove={onStageMove}
                  onPointerUp={onStageUp}
                  onPointerCancel={onStageUp}
                />
              </div>

              <BattleBox tight>
                <div className="row" style={{ gap: 10, alignItems: "center" }}>
                  <button className="btn btn-sm" onClick={() => (previewing ? setPreviewing(false) : startPreview())}>
                    {previewing ? "⏸ Pausar" : "▶ Prévia"}
                  </button>
                  <input
                    type="range"
                    data-testid="time-slider"
                    min={0}
                    max={scene.duration}
                    step={0.05}
                    value={time}
                    onChange={(e) => { setPreviewing(false); setTime(Number(e.target.value)); }}
                    style={{ flex: 1 }}
                  />
                  <span data-testid="time-label" style={{ fontSize: 12, minWidth: 90, textAlign: "right" }}>
                    {time.toFixed(2)}s / {scene.duration}s
                  </span>
                </div>
                <div className="tl" data-testid="timeline" onClick={seekFromTimeline}>
                  {scene.items.map((it) => (
                    <button
                      key={it.id}
                      data-marker={it.id}
                      className={`tl-mark ${it.id === selectedId ? "sel" : ""}`}
                      title={`${TYPE_NAMES[it.type]} em ${it.t}s`}
                      style={{ left: `${(it.t / scene.duration) * 100}%`, top: ITEM_TYPES.indexOf(it.type) * 11 + 3, background: TYPE_COLORS[it.type] }}
                      onClick={(e) => { e.stopPropagation(); setSelectedId(it.id); setPreviewing(false); setTime(it.t); }}
                    />
                  ))}
                  <div className="tl-head" style={{ left: `${(time / scene.duration) * 100}%` }} />
                </div>
              </BattleBox>
                  <BattleBox tight>
                    <div className="row" style={{ gap: 10, alignItems: "center" }}>
                      <h3 style={{ margin: 0 }}>CONFERIR</h3>
                      <button className="btn btn-sm" onClick={runCheck} disabled={check && check.running}>Dá pra vencer?</button>
                    </div>
                    {check && !check.running && (
                      <p data-testid="check-result" className="hint" style={{ marginTop: 8, color: check.ok ? "var(--accent-green)" : "var(--accent-red)" }}>
                        {check.ok
                          ? `✔ Existe um caminho seguro do começo ao fim (andando mais devagar que a alma real).`
                          : `✖ Impossível a partir de ${check.failedAt.toFixed(1)}s: não sobra nenhuma casa segura.`}
                        {check.excluded > 0 ? ` Não conta ${check.excluded} perseguidor(es), que dependem da posição de cada jogador.` : ""}
                      </p>
                    )}
                    {check && check.running && <p className="hint">Calculando...</p>}
                  </BattleBox>
              <p className="hint">
                Escolha uma ferramenta e clique no palco para pôr o item no instante atual (arraste para definir direção/raio).
                Com "Selecionar", clique num item para editá-lo e arraste para mover. Del apaga, Esc volta a Selecionar.
              </p>
            </>
          )}
        </div>

        <aside className="stack">
          <BattleBox tight>
            <h3>CENA</h3>
            <div className="stack" style={{ gap: 6 }}>
              <label className="ed-field">
                <span>Nome</span>
                <input key={scene.name} defaultValue={scene.name} maxLength={60} onBlur={(e) => e.target.value !== scene.name && edit((s) => ({ ...s, name: e.target.value.trim() || "Cena sem nome" }))} />
              </label>
              <NumField label="Duração (s)" value={scene.duration} onCommit={setDuration} />
              <NumField label="Dano por acerto" value={scene.damage} onCommit={(v) => edit((s) => ({ ...s, damage: Math.round(Math.min(999, Math.max(1, v))) }))} />
              <span className="hint">O dano é fixo por encontro: vale para todos os acertos desta cena.</span>
            </div>
          </BattleBox>

          {mode === "edit" && (
            <>
              <BattleBox tight accent="gold">
                <h3>FERRAMENTAS</h3>
                <div className="pal">
                  <button className={`pal-btn ${tool === "select" ? "on" : ""}`} onClick={() => setTool("select")} data-tool="select">Selecionar</button>
                  {ITEM_TYPES.map((t) => (
                    <button key={t} data-tool={t} className={`pal-btn ${tool === t ? "on" : ""}`} onClick={() => { setTool(t); setSelectedId(null); }}>
                      <i style={{ background: TYPE_COLORS[t] }} />
                      {TYPE_NAMES[t]}
                    </button>
                  ))}
                </div>
                {tool === "wall" && (
                  <label className="ed-field" style={{ marginTop: 8 }}>
                    <span>Direção</span>
                    <select value={wallDir} onChange={(e) => setWallDir(e.target.value)}>
                      {ENUMS.wall.dir.map((d) => <option key={d} value={d}>{{ left: "← para a esquerda", right: "→ para a direita", up: "↑ para cima", down: "↓ para baixo" }[d]}</option>)}
                    </select>
                  </label>
                )}
                {tool === "laser" && (
                  <label className="ed-field" style={{ marginTop: 8 }}>
                    <span>Eixo</span>
                    <select value={laserAxis} onChange={(e) => setLaserAxis(e.target.value)}>
                      <option value="h">Horizontal ━</option>
                      <option value="v">Vertical ┃</option>
                    </select>
                  </label>
                )}
                <p className="hint" style={{ marginTop: 8 }}>{tool === "select" ? "Clique num item para editar; arraste para mover." : TYPE_HINTS[tool]}</p>
              </BattleBox>

              <BattleBox tight>
                <h3>ITEM SELECIONADO</h3>
                {selected ? (
                  <div className="stack" style={{ gap: 6 }} data-testid="item-form">
                    <strong style={{ color: TYPE_COLORS[selected.type] }}>{TYPE_NAMES[selected.type]}</strong>
                    <NumField label="Aparece em (s)" value={selected.t} step={0.05} onCommit={(v) => updateItem(selected.id, { t: v })} />
                    {Object.keys(SPEC[selected.type]).map((k) => (
                      <NumField key={k} label={LABELS[k] || k} value={selected[k]} onCommit={(v) => updateItem(selected.id, { [k]: v })} />
                    ))}
                    {Object.entries(ENUMS[selected.type] || {}).map(([k, opts]) => (
                      <label key={k} className="ed-field">
                        <span>{LABELS[k]}</span>
                        <select value={selected[k]} onChange={(e) => updateItem(selected.id, { [k]: e.target.value })}>
                          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </label>
                    ))}
                    <div className="btn-row">
                      <button className="btn btn-sm" onClick={duplicateSelected}>Duplicar</button>
                      <button className="btn btn-sm btn-danger" onClick={deleteSelected}>Excluir</button>
                    </div>
                  </div>
                ) : (
                  <p className="muted" style={{ fontSize: 12 }}>Nenhum. Use "Selecionar" e clique num item (ou num marcador da linha do tempo).</p>
                )}
              </BattleBox>

              <BattleBox tight>
                <h3>ITENS ({scene.items.length})</h3>
                <div className="ed-list" data-testid="item-list">
                  {sorted.length === 0 && <span className="muted" style={{ fontSize: 12 }}>Vazia. Escolha uma ferramenta e clique no palco.</span>}
                  {sorted.map((it) => (
                    <button key={it.id} data-item-id={it.id} className={`ed-row ${it.id === selectedId ? "on" : ""}`} onClick={() => { setSelectedId(it.id); setTool("select"); setPreviewing(false); setTime(it.t); }}>
                      <i style={{ background: TYPE_COLORS[it.type] }} />
                      <span>{TYPE_NAMES[it.type]}</span>
                      <span className="muted">{it.t.toFixed(2)}s</span>
                    </button>
                  ))}
                </div>
              </BattleBox>
            </>
          )}

          <BattleBox tight>
            <h3>BIBLIOTECA ({library.length})</h3>
            <div className="ed-list" data-testid="library">
              {library.length === 0 && <span className="muted" style={{ fontSize: 12 }}>Nenhuma cena salva ainda.</span>}
              {library.map((s) => (
                <div key={s.id} className={`ed-row ${s.id === sceneId ? "on" : ""}`} data-scene-id={s.id}>
                  <button className="ed-link" onClick={() => openScene(s.id)}>{s.name}</button>
                  <span className="muted">{s.itemCount} itens</span>
                  <button className="btn btn-sm btn-danger" onClick={() => removeScene(s.id, s.name)} aria-label={`Excluir ${s.name}`}>×</button>
                </div>
              ))}
            </div>
            <div className="btn-row" style={{ marginTop: 8 }}>
              <button className="btn btn-sm" onClick={exportJson}>Exportar JSON</button>
              <button className="btn btn-sm" onClick={() => importRef.current?.click()}>Importar JSON</button>
              <input ref={importRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={importJson} />
            </div>
          </BattleBox>
        </aside>
      </div>
    </div>
  );
}
