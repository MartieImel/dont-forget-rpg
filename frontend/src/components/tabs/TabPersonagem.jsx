import BattleBox from "../BattleBox";
import AttributeGrid from "../AttributeGrid";
import PericiaGrid from "../PericiaGrid";
import PortraitCircle from "../PortraitCircle";

export default function TabPersonagem({ form, set, gameData, isNew }) {
  return (
    <div className="stack">
      <BattleBox>
        <div className="row" style={{ gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <PortraitCircle url={form.portraitUrl} />
            <div className="field" style={{ marginBottom: 0, width: 160 }}>
              <input
                placeholder="URL do retrato"
                value={form.portraitUrl || ""}
                onChange={(e) => set({ portraitUrl: e.target.value })}
                style={{ fontSize: 11 }}
              />
            </div>
            <div className="flavor-tag-row">
              <span className="flavor-tag">Fight</span>
              <span className="flavor-tag">Mercy</span>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="field">
              <label>Nome</label>
              <input value={form.name} onChange={(e) => set({ name: e.target.value })} autoFocus={isNew} />
            </div>
            <div className="field">
              <label>Título</label>
              <input
                placeholder="ex: A Determinada"
                value={form.titulo || ""}
                onChange={(e) => set({ titulo: e.target.value })}
              />
            </div>
            <div className="field" style={{ marginBottom: 0, maxWidth: 140 }}>
              <label>Nível</label>
              <input
                type="number"
                min={1}
                max={20}
                value={form.level}
                onChange={(e) => set({ level: Number(e.target.value) || 1 })}
              />
            </div>
          </div>
        </div>
      </BattleBox>

      <BattleBox>
        <AttributeGrid attrs={form.attrs} onChange={(attrs) => set({ attrs })} level={form.level} attributesRef={gameData.ATTRIBUTES} />
      </BattleBox>

      <BattleBox>
        <PericiaGrid
          pericias={form.pericias}
          onChange={(pericias) => set({ pericias })}
          periciasRef={gameData.PERICIAS}
          attrs={form.attrs}
          level={form.level}
          bonusKey={form.periciaBonusClasse}
        />
      </BattleBox>
    </div>
  );
}
