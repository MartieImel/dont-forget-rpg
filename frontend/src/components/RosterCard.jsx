import { useState } from "react";
import { Link } from "react-router-dom";
import StatBar from "./StatBar";

export default function RosterCard({ character, ownerName, campaignId, canEdit, onUpdate }) {
  const [amount, setAmount] = useState(10);
  const [busy, setBusy] = useState(false);

  async function applyDelta(field, maxField, delta) {
    setBusy(true);
    const next = Math.max(0, Math.min(character[maxField], character[field] + delta));
    try {
      await onUpdate(character.id, { [field]: next });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="box box-tight">
      <div className="row-between" style={{ marginBottom: 8 }}>
        <div>
          <strong style={{ color: "var(--text)" }}>{character.name}</strong>
          <div className="muted" style={{ fontSize: 11 }}>
            {ownerName} · {character.race} {character.classe ? `· ${character.classe}` : ""} · Nível {character.level} · LV {character.lv}
          </div>
        </div>
        <Link className="btn btn-sm btn-ghost" to={`/characters/${character.id}?returnTo=/campaigns/${campaignId}`}>
          Ficha completa
        </Link>
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <StatBar label="HP" current={character.hpCurrent} max={character.hpMax} kind="hp" />
        <StatBar label="HOPE" current={character.hopeCurrent} max={character.hopeMax} kind="hope" />
      </div>

      {canEdit && (
        <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
            style={{ width: 60 }}
          />
          <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => applyDelta("hpCurrent", "hpMax", -amount)}>
            Dano HP
          </button>
          <button className="btn btn-sm" disabled={busy} onClick={() => applyDelta("hpCurrent", "hpMax", amount)}>
            Curar HP
          </button>
          <button className="btn btn-sm" disabled={busy} onClick={() => applyDelta("hopeCurrent", "hopeMax", -amount)}>
            -HOPE
          </button>
          <button className="btn btn-sm" disabled={busy} onClick={() => applyDelta("hopeCurrent", "hopeMax", amount)}>
            +HOPE
          </button>
        </div>
      )}
    </div>
  );
}
