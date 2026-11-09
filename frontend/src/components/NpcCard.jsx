import { useState } from "react";
import StatBar from "./StatBar";

export default function NpcCard({ npc, isMaster, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(npc);
  const [saving, setSaving] = useState(false);

  async function applyDelta(delta) {
    const next = Math.max(0, Math.min(npc.hpMax, npc.hpCurrent + delta));
    await onUpdate(npc.id, { hpCurrent: next });
  }

  async function saveDraft() {
    setSaving(true);
    try {
      await onUpdate(npc.id, {
        name: draft.name,
        hpCurrent: Number(draft.hpCurrent) || 0,
        hpMax: Number(draft.hpMax) || 0,
        atk: Number(draft.atk) || 0,
        def: Number(draft.def) || 0,
        mag: Number(draft.mag) || 0,
        notes: draft.notes,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  const kindColor = npc.kind === "enemy" ? "var(--accent-red)" : "var(--accent-cyan)";

  if (editing) {
    return (
      <div className="box box-tight">
        <div className="field-row">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Nome</label>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>HP atual</label>
            <input type="number" value={draft.hpCurrent} onChange={(e) => setDraft({ ...draft, hpCurrent: e.target.value })} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>HP máx</label>
            <input type="number" value={draft.hpMax} onChange={(e) => setDraft({ ...draft, hpMax: e.target.value })} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>ATK</label>
            <input type="number" value={draft.atk} onChange={(e) => setDraft({ ...draft, atk: e.target.value })} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>DEF</label>
            <input type="number" value={draft.def} onChange={(e) => setDraft({ ...draft, def: e.target.value })} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>MAG</label>
            <input type="number" value={draft.mag} onChange={(e) => setDraft({ ...draft, mag: e.target.value })} />
          </div>
        </div>
        <textarea
          placeholder="Notas / habilidades"
          rows={2}
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          style={{ width: "100%", marginTop: 8 }}
        />
        <div className="btn-row" style={{ marginTop: 8 }}>
          <button className="btn btn-sm btn-primary" disabled={saving} onClick={saveDraft}>
            Salvar
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => setEditing(false)}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="box box-tight">
      <div className="row-between" style={{ marginBottom: 8 }}>
        <div>
          <span className="tag" style={{ borderColor: kindColor, color: kindColor, marginRight: 8 }}>
            {npc.kind === "enemy" ? "Inimigo" : "NPC"}
          </span>
          <strong style={{ color: "var(--text)" }}>{npc.name}</strong>
        </div>
        {isMaster && (
          <div className="row" style={{ gap: 6 }}>
            <label className="row" style={{ gap: 4, fontSize: 11 }}>
              <input
                type="checkbox"
                checked={npc.revealed}
                onChange={(e) => onUpdate(npc.id, { revealed: e.target.checked })}
              />
              Revelado
            </label>
            <button className="btn btn-sm btn-ghost" onClick={() => setEditing(true)}>
              Editar
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => onDelete(npc.id)}>
              Remover
            </button>
          </div>
        )}
      </div>
      {npc.hpMax > 0 && <StatBar label="HP" current={npc.hpCurrent} max={npc.hpMax} kind="hp" />}
      <div className="row muted" style={{ gap: 14, marginTop: 8, fontSize: 11 }}>
        <span>ATK {npc.atk}</span>
        <span>DEF {npc.def}</span>
        <span>MAG {npc.mag}</span>
      </div>
      {npc.notes && (
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          {npc.notes}
        </p>
      )}
      {isMaster && npc.hpMax > 0 && (
        <div className="btn-row" style={{ marginTop: 8 }}>
          <button className="btn btn-sm btn-danger" onClick={() => applyDelta(-10)}>
            -10 HP
          </button>
          <button className="btn btn-sm" onClick={() => applyDelta(10)}>
            +10 HP
          </button>
        </div>
      )}
    </div>
  );
}
