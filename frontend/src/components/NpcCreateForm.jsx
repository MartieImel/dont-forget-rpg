import { useState } from "react";

const empty = { kind: "npc", name: "", hpCurrent: 0, hpMax: 0, atk: 0, def: 0, mag: 0, notes: "", revealed: false };

export default function NpcCreateForm({ onCreate }) {
  const [draft, setDraft] = useState(empty);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    setSaving(true);
    try {
      await onCreate(draft);
      setDraft(empty);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button className="btn btn-sm" onClick={() => setOpen(true)}>
        + Adicionar NPC / inimigo
      </button>
    );
  }

  return (
    <form className="box box-tight" onSubmit={handleSubmit}>
      <div className="field-row">
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Tipo</label>
          <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}>
            <option value="npc">NPC</option>
            <option value="enemy">Inimigo</option>
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Nome</label>
          <input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>HP máx</label>
          <input type="number" value={draft.hpMax} onChange={(e) => setDraft({ ...draft, hpMax: e.target.value, hpCurrent: e.target.value })} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>ATK</label>
          <input type="number" value={draft.atk} onChange={(e) => setDraft({ ...draft, atk: e.target.value })} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>DEF</label>
          <input type="number" value={draft.def} onChange={(e) => setDraft({ ...draft, def: e.target.value })} />
        </div>
      </div>
      <div className="btn-row" style={{ marginTop: 8 }}>
        <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
          {saving ? "Criando..." : "Criar"}
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
