import { PERICIA_CAP } from "../gameDataHelpers";

export default function PericiaGrid({ pericias, onChange, periciasRef, attrs, level, bonusKey }) {
  if (!periciasRef) return null;

  const cap = PERICIA_CAP(level);

  // agrupa as perícias por atributo, na ordem em que aparecem em periciasRef
  const groups = [];
  const groupByAttr = {};
  periciasRef.forEach((p) => {
    if (!groupByAttr[p.attr]) {
      groupByAttr[p.attr] = { attr: p.attr, items: [] };
      groups.push(groupByAttr[p.attr]);
    }
    groupByAttr[p.attr].items.push(p);
  });

  function spentInGroup(items) {
    return items.reduce((sum, p) => sum + (Number(pericias[p.key]) || 0), 0);
  }

  function setValue(key, groupItems, budget, value) {
    const current = Number(pericias[key]) || 0;
    const others = spentInGroup(groupItems) - current;
    const maxAllowed = Math.min(cap, budget - others);
    const n = Math.max(0, Math.min(maxAllowed, Number(value) || 0));
    onChange({ ...pericias, [key]: n });
  }

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>PERÍCIAS</h3>
        <span className="hint">Teto por perícia neste Nível: {cap}</span>
      </div>
      <div className="stack" style={{ gap: 16 }}>
        {groups.map((g) => {
          const budget = Number(attrs?.[g.attr]) || 0;
          const spent = spentInGroup(g.items);
          const over = spent > budget;
          return (
            <div key={g.attr}>
              <div
                style={{
                  fontSize: 11,
                  marginBottom: 6,
                  color: over ? "var(--accent-red)" : "var(--text-faint)",
                }}
              >
                {g.attr}: {spent} / {budget} pontos usados
              </div>
              <div className="grid grid-3">
                {g.items.map((p) => (
                  <div key={p.key} className="row" style={{ gap: 8, justifyContent: "space-between" }}>
                    <label htmlFor={`per-${p.key}`} style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {p.name}
                      {bonusKey === p.key && (
                        <span className="tag tag-key" style={{ marginLeft: 6 }} title="Bônus de perícia da Classe">
                          +1 Classe = {(Number(pericias[p.key]) || 0) + 1}
                        </span>
                      )}
                    </label>
                    <input
                      id={`per-${p.key}`}
                      type="number"
                      min={0}
                      max={cap}
                      style={{ width: 56, textAlign: "center", background: "var(--bg-void)", color: "var(--text)" }}
                      value={pericias[p.key] ?? 0}
                      onChange={(e) => setValue(p.key, g.items, budget, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
