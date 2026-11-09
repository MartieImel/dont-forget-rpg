import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BattleBox from "../components/BattleBox";
import { api } from "../api";
import { usePolling } from "../hooks/usePolling";
import { cellFromPoint, reachableCells } from "../boardMath";

const CELL_KEY = "dfrpg_board_cell";
const MIN_CELL = 24;
const MAX_CELL = 84;

function loadCell() {
  try {
    const n = Number(localStorage.getItem(CELL_KEY));
    return n >= MIN_CELL && n <= MAX_CELL ? n : 44;
  } catch {
    return 44;
  }
}

export default function BoardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, error: loadError, reload } = usePolling(() => api.getBoard(id), 1500, [id]);

  const [cell, setCell] = useState(loadCell);
  const [selectedId, setSelectedId] = useState(null);
  const [msg, setMsg] = useState("");
  const [drag, setDrag] = useState(null); // { tokenId, cx, cy }
  const [boardForm, setBoardForm] = useState({ name: "", cols: 20, rows: 14, backgroundUrl: "" });
  const [newBoard, setNewBoard] = useState({ name: "", cols: 20, rows: 14, backgroundUrl: "" });
  const [npcToAdd, setNpcToAdd] = useState("");
  const [moveBaseInput, setMoveBaseInput] = useState(null);

  const boardRef = useRef(null);
  const busyRef = useRef(false);
  const justDraggedRef = useRef(false);
  const pressedTokenRef = useRef(false); // o botão foi apertado em cima de uma ficha?

  const board = data ? data.board : null;
  const tokens = data ? data.tokens : [];
  const master = !!data && data.role === "mestre";
  const selected = tokens.find((t) => t.id === selectedId) || null;
  const canMove = (t) => !!t && !!data && (master || (t.kind === "character" && t.ownerId === data.userId));

  // formulário de configuração acompanha o tabuleiro ativo (só quando ele troca)
  useEffect(() => {
    if (board) setBoardForm({ name: board.name, cols: board.cols, rows: board.rows, backgroundUrl: board.backgroundUrl || "" });
  }, [board && board.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedId && !selected && data) setSelectedId(null);
  }, [selectedId, selected, data]);

  function changeCell(delta) {
    const next = Math.max(MIN_CELL, Math.min(MAX_CELL, cell + delta));
    setCell(next);
    try {
      localStorage.setItem(CELL_KEY, String(next));
    } catch {
      /* sem localStorage: tudo bem */
    }
  }

  async function tryMove(token, x, y) {
    if (!board || busyRef.current) return;
    if (x < 0 || y < 0 || x >= board.cols || y >= board.rows) return;
    if (x === token.x && y === token.y) return;
    busyRef.current = true;
    try {
      await api.moveToken(id, token.id, x, y);
      setMsg("");
      await reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      busyRef.current = false;
    }
  }

  async function act(fn) {
    try {
      await fn();
      setMsg("");
      await reload();
    } catch (err) {
      setMsg(err.message);
    }
  }

  // Teclado (principal no computador): setas movem a ficha selecionada 1 casa; Esc solta.
  useEffect(() => {
    function onKey(e) {
      const tag = (e.target && e.target.tagName) || "";
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (e.key === "Escape") {
        setSelectedId(null);
        return;
      }
      const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
      if (!d || !selected || !canMove(selected)) return;
      e.preventDefault();
      tryMove(selected, selected.x + d[0], selected.y + d[1]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function rectOfBoard() {
    return boardRef.current ? boardRef.current.getBoundingClientRect() : null;
  }

  // clique numa casa vazia: move a ficha selecionada pra lá
  function handleBoardClick(e) {
    // Se a pessoa apertou em cima de uma ficha e soltou numa casa vazia, o navegador
    // dispara o clique no tabuleiro: isso NÃO deve mover a ficha que está selecionada.
    if (justDraggedRef.current || pressedTokenRef.current) return;
    if (!board || !selected) return;
    if (!canMove(selected)) {
      setSelectedId(null);
      return;
    }
    const c = cellFromPoint(rectOfBoard(), board.cols, board.rows, e.clientX, e.clientY);
    if (c) tryMove(selected, c.x, c.y);
  }

  function handleTokenClick(e, t) {
    e.stopPropagation();
    if (justDraggedRef.current) return;
    setSelectedId(t.id === selectedId ? null : t.id);
  }

  // arrastar e soltar (mouse e toque, via Pointer Events)
  function handlePointerDown(e, t) {
    if (!canMove(t) || (e.pointerType === "mouse" && e.button !== 0)) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;
    let last = null;

    const onMove = (ev) => {
      if (!moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 6) return;
      if (!moved) setSelectedId(t.id);
      moved = true;
      const c = cellFromPoint(rectOfBoard(), board.cols, board.rows, ev.clientX, ev.clientY);
      last = c;
      setDrag({ tokenId: t.id, cx: c ? c.x : null, cy: c ? c.y : null });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (!moved) return;
      justDraggedRef.current = true;
      setTimeout(() => (justDraggedRef.current = false), 0); // depois do "click" que o navegador dispara
      setDrag(null);
      if (last) tryMove(t, last.x, last.y);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  if (!data) {
    return <div className="container center-screen muted">{loadError ? loadError.message : "Carregando tabuleiro..."}</div>;
  }

  const reach = board && selected && !master && canMove(selected) ? reachableCells(selected, board.cols, board.rows, tokens) : [];
  const campaignBack = () => navigate(`/campaigns/${id}`);

  return (
    <div className="container stack">
      <div className="row-between">
        <div>
          <span className="eyebrow">{master ? "VOCÊ É O MESTRE" : "TABULEIRO"}</span>
          <h1>{board ? board.name : "Sem tabuleiro"}</h1>
          {board && <span className="muted">Turno {board.turn} · movimento base {data.moveBase} + Rapidez (casas por turno)</span>}
        </div>
        <div className="btn-row">
          <button className="btn btn-sm" onClick={() => changeCell(-6)} title="Diminuir casas">
            −
          </button>
          <button className="btn btn-sm" onClick={() => changeCell(6)} title="Aumentar casas">
            +
          </button>
          {master && (
            <button className="btn btn-sm btn-gold" onClick={() => navigate(`/campaigns/${id}/fuga`)} title="Montar ataques para as Cenas de Fuga">
              Editor de Fugas
            </button>
          )}
          <button className="btn btn-sm" onClick={() => navigate("/fuga/teste")} title="Cenas de demonstração jogáveis">
            Laboratório de Fuga
          </button>
          <button className="btn btn-ghost btn-sm" onClick={campaignBack}>
            Voltar
          </button>
        </div>
      </div>

      {msg && <p className="error-text" role="alert">{msg}</p>}

      <div className="board-layout">
        <div>
          {board ? (
            <div className="board-scroll">
              <div
                ref={boardRef}
                className="board"
                data-testid="board"
                style={{
                  "--cell": `${cell}px`,
                  width: board.cols * cell,
                  height: board.rows * cell,
                  backgroundImage: board.backgroundUrl ? `url("${board.backgroundUrl}")` : undefined,
                  cursor: selected && canMove(selected) ? "crosshair" : "default",
                }}
                onClick={handleBoardClick}
                onPointerDownCapture={(e) => {
                  pressedTokenRef.current = !!(e.target.closest && e.target.closest("[data-token-id]"));
                }}
              >
                <div className="board-grid" />
                {reach.map((c) => (
                  <div
                    key={`${c.x},${c.y}`}
                    className={`board-reach ${c.origin ? "origin" : ""}`}
                    data-reach={`${c.x},${c.y}`}
                    style={{ left: c.x * cell, top: c.y * cell, width: cell, height: cell }}
                  />
                ))}
                {tokens.map((t) => {
                  const dragging = drag && drag.tokenId === t.id;
                  const px = dragging && drag.cx !== null ? drag.cx : t.x;
                  const py = dragging && drag.cy !== null ? drag.cy : t.y;
                  const mine = t.kind === "character" && t.ownerId === data.userId;
                  const showHp = t.hp !== null && t.hpMax > 0;
                  return (
                    <div
                      key={t.id}
                      data-token-id={t.id}
                      data-x={t.x}
                      data-y={t.y}
                      title={`${t.name}${t.hidden ? " (oculto dos jogadores)" : ""}`}
                      className={[
                        "board-token",
                        t.subtype,
                        canMove(t) ? "movable" : "",
                        mine ? "mine" : "",
                        t.id === selectedId ? "selected" : "",
                        t.hidden ? "hidden-token" : "",
                        dragging ? "dragging" : "",
                      ].join(" ")}
                      style={{ left: px * cell, top: py * cell, width: cell, height: cell }}
                      onClick={(e) => handleTokenClick(e, t)}
                      onPointerDown={(e) => handlePointerDown(e, t)}
                    >
                      <div className="board-token-body">
                        {t.portraitUrl ? <img src={t.portraitUrl} alt="" draggable={false} /> : (t.name || "?").trim().charAt(0).toUpperCase()}
                      </div>
                      {showHp && (
                        <div className="board-token-hp">
                          <div style={{ width: `${Math.max(0, Math.min(100, (t.hp / t.hpMax) * 100))}%` }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <BattleBox>
              <p className="narration">{master ? "Crie o primeiro tabuleiro no painel ao lado." : "O mestre ainda não montou um tabuleiro."}</p>
            </BattleBox>
          )}
          <p className="hint" style={{ marginTop: 8 }}>
            Clique na sua ficha e depois numa casa, arraste a ficha, ou use as setas do teclado. Esc solta a seleção.
          </p>
        </div>

        <aside className="stack">
          <BattleBox tight>
            <h3>FICHA SELECIONADA</h3>
            {selected ? (
              <div className="stack" style={{ gap: 6 }}>
                <strong>{selected.name}</strong>
                <span className="muted" style={{ fontSize: 12 }}>
                  {selected.subtype === "player" ? "Personagem" : selected.subtype === "enemy" ? "Inimigo" : "NPC"}
                  {selected.hidden ? " · oculto dos jogadores" : ""} · casa {selected.x + 1},{selected.y + 1}
                </span>
                {selected.hp !== null && (
                  <span style={{ fontSize: 12 }}>
                    HP {selected.hp} / {selected.hpMax}
                  </span>
                )}
                <span style={{ fontSize: 12 }}>
                  Alcance: {selected.moveRange} casas por turno
                  {canMove(selected) && !master ? ` (começou o turno em ${selected.startX + 1},${selected.startY + 1})` : ""}
                </span>
                {master && board && (
                  <button className="btn btn-sm btn-danger" onClick={() => act(() => api.removeBoardToken(id, board.id, selected.id))}>
                    Remover do tabuleiro
                  </button>
                )}
              </div>
            ) : (
              <p className="muted" style={{ fontSize: 12 }}>Nenhuma. Clique numa ficha.</p>
            )}
          </BattleBox>

          {master && (
            <>
              {board && (
                <BattleBox tight accent="gold">
                  <h3>TURNO E FICHAS</h3>
                  <div className="stack" style={{ gap: 8 }}>
                    <button className="btn btn-sm btn-gold" onClick={() => act(() => api.nextTurn(id))}>
                      Passar turno ({board.turn} → {board.turn + 1})
                    </button>
                    {data.availableCharacters && data.availableCharacters.length > 0 && (
                      <button className="btn btn-sm" onClick={() => act(() => api.addBoardTokens(id, board.id, { allCharacters: true }))}>
                        Adicionar fichas dos jogadores ({data.availableCharacters.length})
                      </button>
                    )}
                    {data.availableNpcs && data.availableNpcs.length > 0 && (
                      <div className="row" style={{ gap: 6 }}>
                        <select value={npcToAdd} onChange={(e) => setNpcToAdd(e.target.value)} style={{ flex: 1 }}>
                          <option value="">NPC / inimigo...</option>
                          {data.availableNpcs.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.kind === "enemy" ? "[Inimigo] " : ""}
                              {n.name}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn btn-sm"
                          disabled={!npcToAdd}
                          onClick={() => act(async () => { await api.addBoardTokens(id, board.id, { kind: "npc", refId: npcToAdd }); setNpcToAdd(""); })}
                        >
                          Pôr
                        </button>
                      </div>
                    )}
                    <div className="row" style={{ gap: 6 }}>
                      <label className="muted" style={{ fontSize: 11 }}>Movimento base</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        style={{ width: 60 }}
                        value={moveBaseInput ?? data.moveBase}
                        onChange={(e) => setMoveBaseInput(e.target.value)}
                      />
                      <button
                        className="btn btn-sm"
                        disabled={moveBaseInput === null}
                        onClick={() => act(async () => { await api.updateCampaignMeta(id, { moveBase: Number(moveBaseInput) }); setMoveBaseInput(null); })}
                      >
                        Salvar
                      </button>
                    </div>
                    <span className="hint">Inimigos só aparecem pros jogadores quando marcados como "Revelado" na tela da campanha.</span>
                  </div>
                </BattleBox>
              )}

              {board && (
                <BattleBox tight>
                  <h3>ESTE TABULEIRO</h3>
                  <div className="stack" style={{ gap: 8 }}>
                    <input value={boardForm.name} onChange={(e) => setBoardForm({ ...boardForm, name: e.target.value })} placeholder="Nome" />
                    <div className="row" style={{ gap: 6 }}>
                      <input type="number" min={4} max={60} style={{ width: 70 }} value={boardForm.cols} onChange={(e) => setBoardForm({ ...boardForm, cols: e.target.value })} title="Colunas" />
                      <span className="muted">×</span>
                      <input type="number" min={4} max={60} style={{ width: 70 }} value={boardForm.rows} onChange={(e) => setBoardForm({ ...boardForm, rows: e.target.value })} title="Linhas" />
                    </div>
                    <input
                      value={boardForm.backgroundUrl}
                      onChange={(e) => setBoardForm({ ...boardForm, backgroundUrl: e.target.value })}
                      placeholder="Link da imagem de fundo (https://...)"
                    />
                    <button
                      className="btn btn-sm"
                      onClick={() =>
                        act(() =>
                          api.updateBoard(id, board.id, {
                            name: boardForm.name,
                            cols: Number(boardForm.cols),
                            rows: Number(boardForm.rows),
                            backgroundUrl: boardForm.backgroundUrl,
                          })
                        )
                      }
                    >
                      Salvar tabuleiro
                    </button>
                  </div>
                </BattleBox>
              )}

              <BattleBox tight>
                <h3>TABULEIROS</h3>
                <div className="stack" style={{ gap: 6 }}>
                  {(data.boards || []).map((b) => (
                    <div key={b.id} className="row-between" style={{ fontSize: 12 }}>
                      <span>
                        {b.name} <span className="muted">({b.cols}×{b.rows})</span>
                        {b.active && <span className="tag tag-equipped" style={{ marginLeft: 6 }}>ativo</span>}
                      </span>
                      <span className="btn-row">
                        {!b.active && (
                          <button className="btn btn-sm" onClick={() => act(() => api.activateBoard(id, b.id))}>
                            Ativar
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => {
                            if (confirm(`Excluir o tabuleiro "${b.name}"?`)) act(() => api.deleteBoard(id, b.id));
                          }}
                        >
                          Excluir
                        </button>
                      </span>
                    </div>
                  ))}
                  <hr className="divider" style={{ margin: "8px 0" }} />
                  <input value={newBoard.name} onChange={(e) => setNewBoard({ ...newBoard, name: e.target.value })} placeholder="Nome do novo tabuleiro" />
                  <div className="row" style={{ gap: 6 }}>
                    <input type="number" min={4} max={60} style={{ width: 70 }} value={newBoard.cols} onChange={(e) => setNewBoard({ ...newBoard, cols: e.target.value })} />
                    <span className="muted">×</span>
                    <input type="number" min={4} max={60} style={{ width: 70 }} value={newBoard.rows} onChange={(e) => setNewBoard({ ...newBoard, rows: e.target.value })} />
                  </div>
                  <input value={newBoard.backgroundUrl} onChange={(e) => setNewBoard({ ...newBoard, backgroundUrl: e.target.value })} placeholder="Imagem de fundo (opcional)" />
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() =>
                      act(async () => {
                        await api.createBoard(id, { name: newBoard.name, cols: Number(newBoard.cols), rows: Number(newBoard.rows), backgroundUrl: newBoard.backgroundUrl });
                        setNewBoard({ name: "", cols: 20, rows: 14, backgroundUrl: "" });
                      })
                    }
                  >
                    + Criar tabuleiro
                  </button>
                </div>
              </BattleBox>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
