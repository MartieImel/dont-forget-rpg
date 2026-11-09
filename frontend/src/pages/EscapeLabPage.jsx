import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import EscapePlayer from "../components/EscapePlayer";
import { demoScene, demoScene2 } from "../escape/scenes.js";

// Laboratório: jogue as cenas de demonstração (e ajuste HP/dano) sem precisar de campanha.
const SCENES = [
  { key: "demo1", make: demoScene },
  { key: "demo2", make: demoScene2 },
];

export default function EscapeLabPage() {
  const navigate = useNavigate();
  const [key, setKey] = useState("demo1");
  const [cfg, setCfg] = useState({ hp: 60, damage: null });
  const scene = useMemo(() => SCENES.find((s) => s.key === key).make(), [key]);
  const damage = cfg.damage ?? scene.damage;

  return (
    <div className="container stack">
      <div className="row-between">
        <div>
          <span className="eyebrow">LABORATÓRIO · CENA DE FUGA</span>
          <h1>{scene.name}</h1>
          <span className="muted">Setas ou WASD movem · Shift = devagar e preciso · no celular, arraste o dedo na tela</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          Voltar
        </button>
      </div>

      <div className="btn-row" style={{ flexWrap: "wrap" }}>
        <label className="muted" style={{ fontSize: 11 }}>Cena</label>
        <select value={key} onChange={(e) => { setKey(e.target.value); setCfg({ ...cfg, damage: null }); }}>
          {SCENES.map((s) => (
            <option key={s.key} value={s.key}>{s.make().name}</option>
          ))}
        </select>
        <label className="muted" style={{ fontSize: 11 }}>HP</label>
        <input type="number" min={1} max={999} style={{ width: 64 }} value={cfg.hp} onChange={(e) => setCfg({ ...cfg, hp: Math.max(1, Number(e.target.value) || 1) })} />
        <label className="muted" style={{ fontSize: 11 }} title="Fixo por encontro: o mestre define antes de começar">Dano por acerto</label>
        <input type="number" min={1} max={999} style={{ width: 64 }} value={damage} onChange={(e) => setCfg({ ...cfg, damage: Math.max(1, Number(e.target.value) || 1) })} />
      </div>

      <EscapePlayer key={key} scene={scene} hp={cfg.hp} damage={damage} />

      <p className="hint">
        Só o pontinho branco no meio do coração te machuca. O dano por acerto é fixo por encontro (o mestre escolhe antes de
        lançar) e depois de cada acerto você fica 1 s invulnerável. Bolinhas com anel azul giram em órbita, com anel vermelho
        te perseguem, e as tracejadas ainda são só um aviso.
      </p>
    </div>
  );
}
