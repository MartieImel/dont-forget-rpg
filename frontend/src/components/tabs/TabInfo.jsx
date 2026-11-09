import BattleBox from "../BattleBox";
import AspectPanel from "../AspectPanel";

export default function TabInfo({ form, set, gameData, classeInfo }) {
  return (
    <div className="stack">
      <BattleBox>
        <h2>INFO</h2>
        <div className="field-row">
          <div className="field">
            <label>Raça</label>
            <select value={form.race} onChange={(e) => set({ race: e.target.value, tracoOuElemento: "" })}>
              {gameData.RACES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          {form.race === "Humano" && (
            <div className="field">
              <label>Alma (Traço)</label>
              <select value={form.tracoOuElemento} onChange={(e) => set({ tracoOuElemento: e.target.value })}>
                <option value="">Escolha...</option>
                {gameData.TRACOS_HUMANOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}
          {form.race === "Monstro" && (
            <div className="field">
              <label>Alma (Elemento)</label>
              <select value={form.tracoOuElemento} onChange={(e) => set({ tracoOuElemento: e.target.value })}>
                <option value="">Escolha...</option>
                {gameData.ELEMENTOS_MONSTRO.map((el) => (
                  <option key={el.key} value={el.key}>
                    {el.key} (fraqueza: {el.fraqueza} · vantagem: {el.vantagem})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
            <label>Classe</label>
            <select value={form.classe} onChange={(e) => set({ classe: e.target.value, subclasse: "", periciaBonusClasse: "" })}>
              <option value="">Escolha...</option>
              {gameData.CLASSES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.key}
                </option>
              ))}
            </select>
            {classeInfo && <span className="hint">"{classeInfo.lema}"</span>}
          </div>
          <div className="field">
            <label>Bônus de perícia da Classe (+1)</label>
            <select
              value={form.periciaBonusClasse || ""}
              disabled={!classeInfo}
              onChange={(e) => set({ periciaBonusClasse: e.target.value })}
            >
              <option value="">{classeInfo ? "Escolha uma..." : "Escolha a Classe primeiro"}</option>
              {classeInfo &&
                classeInfo.periciaOpcoesKeys.map((key) => {
                  const p = gameData.PERICIAS.find((x) => x.key === key);
                  return (
                    <option key={key} value={key}>
                      {p ? p.name : key}
                    </option>
                  );
                })}
            </select>
            <span className="hint">Soma por cima dos seus pontos; não usa o orçamento.</span>
          </div>
          <div className="field">
            <label>Trilha</label>
            <select value={form.subclasse} onChange={(e) => set({ subclasse: e.target.value })}>
              <option value="">Escolha...</option>
              {classeInfo &&
                classeInfo.subclasses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </BattleBox>

      <BattleBox>
        <AspectPanel aspectos={form.aspectos} onChange={(aspectos) => set({ aspectos })} />
      </BattleBox>

      <BattleBox>
        <h2>HISTÓRIA, PERSONALIDADE E APARÊNCIA</h2>
        <div className="field">
          <label>História</label>
          <textarea
            rows={4}
            placeholder="De onde ele(a) veio? O que aconteceu até chegar aqui?"
            value={form.historia}
            onChange={(e) => set({ historia: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Personalidade</label>
          <textarea
            rows={4}
            placeholder="Como ele(a) age, fala, reage sob pressão?"
            value={form.personalidade}
            onChange={(e) => set({ personalidade: e.target.value })}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Aparência</label>
          <textarea
            rows={4}
            placeholder="Como ele(a) se parece — altura, roupas, marcas..."
            value={form.aparencia}
            onChange={(e) => set({ aparencia: e.target.value })}
          />
        </div>
      </BattleBox>

      <BattleBox>
        <h2>ANOTAÇÕES</h2>
        <textarea rows={6} value={form.notes} onChange={(e) => set({ notes: e.target.value })} style={{ width: "100%" }} />
      </BattleBox>
    </div>
  );
}
