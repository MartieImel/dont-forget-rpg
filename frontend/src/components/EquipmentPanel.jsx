export default function EquipmentPanel({ equipment, onChange }) {
  const arma = equipment.arma || { name: "", categoria: "", tipo: "", notes: "" };
  const armadura = equipment.armadura || { name: "", notes: "" };
  const amuleto = equipment.amuleto || { name: "", notes: "" };

  function setArma(field, value) {
    onChange({ ...equipment, arma: { ...arma, [field]: value } });
  }
  function setSimple(slot, field, value) {
    const current = equipment[slot] || { name: "", notes: "" };
    onChange({ ...equipment, [slot]: { ...current, [field]: value } });
  }

  return (
    <div>
      <h3 style={{ margin: "0 0 10px" }}>EQUIPADOS</h3>
      <div className="stack" style={{ gap: 12 }}>
        <div className="box box-tight">
          <span className="tag tag-equipped" style={{ marginBottom: 8, display: "inline-block" }}>
            Arma
          </span>
          <div className="field-row">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Nome da arma</label>
              <input value={arma.name} onChange={(e) => setArma("name", e.target.value)} placeholder="Nome da arma" />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Categoria</label>
              <input value={arma.categoria} onChange={(e) => setArma("categoria", e.target.value)} placeholder="ex: Espada" />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Tipo</label>
              <input value={arma.tipo} onChange={(e) => setArma("tipo", e.target.value)} placeholder="ex: Cortante" />
            </div>
          </div>
          <textarea
            placeholder="Bônus / efeito (opcional)"
            rows={2}
            value={arma.notes || ""}
            onChange={(e) => setArma("notes", e.target.value)}
            style={{ marginTop: 8, width: "100%" }}
          />
        </div>

        <div className="box box-tight">
          <span className="tag tag-equipped" style={{ marginBottom: 8, display: "inline-block" }}>
            Armadura
          </span>
          <div className="field" style={{ marginBottom: 8 }}>
            <input value={armadura.name} onChange={(e) => setSimple("armadura", "name", e.target.value)} placeholder="Nome da armadura" />
          </div>
          <textarea
            placeholder="Bônus / efeito (opcional)"
            rows={2}
            value={armadura.notes || ""}
            onChange={(e) => setSimple("armadura", "notes", e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        <div className="box box-tight">
          <span className="tag tag-equipped" style={{ marginBottom: 8, display: "inline-block" }}>
            Amuleto
          </span>
          <div className="field" style={{ marginBottom: 8 }}>
            <input value={amuleto.name} onChange={(e) => setSimple("amuleto", "name", e.target.value)} placeholder="Nome do amuleto" />
          </div>
          <textarea
            placeholder="Bônus / efeito (opcional)"
            rows={2}
            value={amuleto.notes || ""}
            onChange={(e) => setSimple("amuleto", "notes", e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}
