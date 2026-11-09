import BattleBox from "../BattleBox";
import AbilityPanel from "../AbilityPanel";

export default function TabMagias({ form, set }) {
  return (
    <div className="stack">
      <BattleBox>
        <AbilityPanel abilities={form.abilities} onChange={(abilities) => set({ abilities })} />
      </BattleBox>

      <BattleBox>
        <h2>HABILIDADES E MAGIAS EXTRAS</h2>
        <textarea
          rows={5}
          placeholder="Espaço livre para variações, combos ou notas rápidas que não cabem nos cards acima"
          value={form.abilitiesExtra}
          onChange={(e) => set({ abilitiesExtra: e.target.value })}
          style={{ width: "100%" }}
        />
      </BattleBox>
    </div>
  );
}
