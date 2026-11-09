const SLOT_COUNT = 10;

function normalize(inventory) {
  const arr = Array.isArray(inventory) ? inventory.slice(0, SLOT_COUNT) : [];
  while (arr.length < SLOT_COUNT) arr.push({ name: "", descricao: "", chave: false });
  return arr;
}

export default function InventoryPanel({ inventory, onChange }) {
  const items = normalize(inventory);
  const usedCount = items.filter((i) => i.name && i.name.trim() && !i.chave).length;

  function updateSlot(index, patch) {
    const next = items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    onChange(next);
  }

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>INVENTÁRIO</h3>
        <span className="hint">{usedCount} / 10 slots usados (itens-chave não contam)</span>
      </div>
      <div className="grid grid-2">
        {items.map((item, i) => (
          <div key={i} className="box box-tight">
            <div className="row" style={{ gap: 8, alignItems: "center" }}>
              <span style={{ color: "var(--accent-gold)", fontWeight: 600, width: 16 }}>{i + 1}</span>
              <input
                placeholder="Nome"
                value={item.name}
                onChange={(e) => updateSlot(i, { name: e.target.value })}
                style={{ flex: 1 }}
              />
              <label className="row" style={{ gap: 4, fontSize: 11 }} title="Item-chave (não conta no limite de slots)">
                <input type="checkbox" checked={!!item.chave} onChange={(e) => updateSlot(i, { chave: e.target.checked })} />
                chave
              </label>
            </div>
            <textarea
              placeholder="Descrição"
              rows={2}
              value={item.descricao || ""}
              onChange={(e) => updateSlot(i, { descricao: e.target.value })}
              style={{ marginTop: 8, width: "100%" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
