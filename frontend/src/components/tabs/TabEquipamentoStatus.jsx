import BattleBox from "../BattleBox";
import RangeStepper from "../RangeStepper";
import EquipmentPanel from "../EquipmentPanel";
import InventoryPanel from "../InventoryPanel";

export default function TabEquipamentoStatus({ form, set, suggestedStatus }) {
  return (
    <div className="stack">
      <BattleBox accent="gold">
        <h2>STATUS</h2>
        <div className="stack" style={{ gap: 18 }}>
          <div>
            <RangeStepper label="HP" current={form.hpCurrent} max={suggestedStatus.hpMax} onChange={(v) => set({ hpCurrent: v })} kind="hp" />
            <div className="field-row" style={{ marginTop: 8 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Bônus Classe</label>
                <input type="number" value={suggestedStatus.hpBase} disabled />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>DEF base</label>
                <input type="number" value={suggestedStatus.defBase} disabled />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Bônus de Nível</label>
                <input type="number" value={suggestedStatus.levelHpBonus} disabled title="+15 por Nível, a partir do Nível 2" />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Bônus de LOVE</label>
                <input type="number" value={suggestedStatus.loveHpBonus} disabled title="+5 a cada ponto de LOVE além do primeiro" />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Bônus manual</label>
                <input
                  type="number"
                  value={form.hpBonusManual}
                  onChange={(e) => set({ hpBonusManual: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <div>
            <RangeStepper label="HOPE" current={form.hopeCurrent} max={suggestedStatus.hope} onChange={(v) => set({ hopeCurrent: v })} kind="hope" />
            <div className="field-row" style={{ marginTop: 8 }}>
              <div className="field" style={{ marginBottom: 0, maxWidth: 160 }}>
                <label>Bônus Manual HOPE</label>
                <input
                  type="number"
                  value={form.hopeBonusManual}
                  onChange={(e) => set({ hopeBonusManual: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <RangeStepper label="LOVE" current={form.lv} max={20} onChange={(v) => set({ lv: v })} kind="love" />
          <RangeStepper label="KARMA" current={form.karma} max={50} onChange={(v) => set({ karma: v })} kind="karma" />

          <div className="field-row">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>ATK bônus (total: {suggestedStatus.atk + (Number(form.atkBonus) || 0)})</label>
              <input type="number" value={form.atkBonus} onChange={(e) => set({ atkBonus: Number(e.target.value) || 0 })} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>DEF bônus (total: {suggestedStatus.def + (Number(form.defBonus) || 0)})</label>
              <input type="number" value={form.defBonus} onChange={(e) => set({ defBonus: Number(e.target.value) || 0 })} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>MAG bônus (total: {suggestedStatus.mag + (Number(form.magBonus) || 0)})</label>
              <input type="number" value={form.magBonus} onChange={(e) => set({ magBonus: Number(e.target.value) || 0 })} />
            </div>
          </div>
        </div>
      </BattleBox>

      <BattleBox>
        <EquipmentPanel equipment={form.equipment} onChange={(equipment) => set({ equipment })} />
      </BattleBox>

      <BattleBox>
        <InventoryPanel inventory={form.inventory} onChange={(inventory) => set({ inventory })} />
      </BattleBox>
    </div>
  );
}
