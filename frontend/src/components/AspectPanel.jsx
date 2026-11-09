function makeId() {
  return `as_${Math.random().toString(36).slice(2, 9)}`;
}

export default function AspectPanel({ aspectos, onChange }) {
  function addAspect(tipo) {
    onChange([...aspectos, { id: makeId(), name: "", tipo, description: "" }]);
  }
  function updateAspect(id, patch) {
    onChange(aspectos.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }
  function removeAspect(id) {
    onChange(aspectos.filter((a) => a.id !== id));
  }

  return (
    <div>
      <h3 style={{ margin: "0 0 10px" }}>ASPECTOS (VIRTUDES E DEFEITOS)</h3>
      <div className="stack" style={{ gap: 8 }}>
        {aspectos.map((a) => (
          <div key={a.id} className="box box-tight">
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <span
                className="tag"
                style={
                  a.tipo === "positivo"
                    ? { borderColor: "var(--accent-green)", color: "var(--accent-green)" }
                    : { borderColor: "var(--accent-red)", color: "var(--accent-red)" }
                }
              >
                {a.tipo === "positivo" ? "Positivo" : "Negativo"}
              </span>
              <input
                placeholder="Nome do aspecto"
                value={a.name}
                onChange={(e) => updateAspect(a.id, { name: e.target.value })}
                style={{ flex: "1 1 160px" }}
              />
              <button type="button" className="btn btn-sm btn-danger" onClick={() => removeAspect(a.id)}>
                Remover
              </button>
            </div>
            <textarea
              placeholder="Descrição / efeito"
              rows={2}
              value={a.description}
              onChange={(e) => updateAspect(a.id, { description: e.target.value })}
              style={{ marginTop: 8, width: "100%" }}
            />
          </div>
        ))}
      </div>
      <div className="btn-row" style={{ marginTop: 10 }}>
        <button type="button" className="btn btn-sm" onClick={() => addAspect("positivo")}>
          + Aspecto positivo
        </button>
        <button type="button" className="btn btn-sm" onClick={() => addAspect("negativo")}>
          + Aspecto negativo
        </button>
      </div>
    </div>
  );
}
