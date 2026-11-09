function makeId() {
  return `ab_${Math.random().toString(36).slice(2, 9)}`;
}

const ELEMENTOS = ["Nenhum", "Fogo", "Agua", "Gelo", "Eletrico", "Rude", "Sombrio", "Sagrado"];

export default function AbilityPanel({ abilities, onChange }) {
  function addAbility() {
    onChange([...abilities, { id: makeId(), name: "", custo: "", elemento: "Nenhum", description: "" }]);
  }

  function updateAbility(id, patch) {
    onChange(abilities.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function removeAbility(id) {
    onChange(abilities.filter((a) => a.id !== id));
  }

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>MAGIAS E HABILIDADES</h3>
        <span className="hint">Adicione as que você escolheu do livro por Nível/Trilha/Alma</span>
      </div>
      <div className="grid grid-2">
        {abilities.map((ab) => (
          <div key={ab.id} className="box box-tight">
            <div className="field" style={{ marginBottom: 8 }}>
              <input
                placeholder="Nome"
                value={ab.name}
                onChange={(e) => updateAbility(ab.id, { name: e.target.value })}
              />
            </div>
            <div className="field-row" style={{ marginBottom: 8 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Custo</label>
                <input
                  placeholder="ex: 5 HOPE"
                  value={ab.custo}
                  onChange={(e) => updateAbility(ab.id, { custo: e.target.value })}
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Elemento</label>
                <select value={ab.elemento} onChange={(e) => updateAbility(ab.id, { elemento: e.target.value })}>
                  {ELEMENTOS.map((el) => (
                    <option key={el} value={el}>
                      {el}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <textarea
              placeholder="Descrição"
              rows={3}
              value={ab.description}
              onChange={(e) => updateAbility(ab.id, { description: e.target.value })}
              style={{ width: "100%" }}
            />
            <button type="button" className="btn btn-sm btn-danger" style={{ marginTop: 8 }} onClick={() => removeAbility(ab.id)}>
              Remover
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-sm" style={{ marginTop: 10 }} onClick={addAbility}>
        + Adicionar magia/habilidade
      </button>
    </div>
  );
}
