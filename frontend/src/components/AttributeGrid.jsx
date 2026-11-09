import { ATTR_LIMIT, ATTR_TOTAL } from "../gameDataHelpers";

export default function AttributeGrid({ attrs, onChange, level, attributesRef }) {
  if (!attributesRef) return null;

  const budget = ATTR_TOTAL(attributesRef, level);
  const limit = ATTR_LIMIT(attributesRef, level);
  const spent = Object.values(attrs).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const remaining = budget - spent;

  function setValue(key, target) {
    const current = Number(attrs[key]) || 0;
    const delta = target - current;
    if (delta > 0 && delta > remaining) return; // não deixa estourar o orçamento
    if (target < 0 || target > limit) return; // não deixa passar do limite por atributo
    onChange({ ...attrs, [key]: target });
  }

  const bannerClass = remaining < 0 ? "over" : remaining === 0 ? "full" : "";

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>ATRIBUTOS</h3>
      </div>
      <div className={`budget-banner ${bannerClass}`} style={{ marginBottom: 14 }}>
        <span>
          Pontos restantes: <strong>{remaining}</strong> / {budget}
        </span>
        <span>Limite por atributo no Nível {level}: {limit}</span>
      </div>
      <div className="stack" style={{ gap: 10 }}>
        {attributesRef.map((a) => {
          const value = Number(attrs[a.key]) || 0;
          return (
            <div key={a.key} className="row-between" style={{ gap: 10, flexWrap: "wrap" }}>
              <div style={{ minWidth: 140 }}>
                <strong style={{ fontSize: 13 }}>{a.name}</strong>
                <div className="hint">{a.desc}</div>
              </div>
              <div className="pip-row">
                {Array.from({ length: limit }).map((_, i) => {
                  const pipValue = i + 1;
                  const filled = pipValue <= value;
                  const wouldExceedBudget = !filled && pipValue - value > remaining;
                  return (
                    <button
                      type="button"
                      key={i}
                      className={`pip ${filled ? "filled" : ""} ${wouldExceedBudget ? "disabled" : ""}`}
                      disabled={wouldExceedBudget}
                      title={`Definir ${a.key} = ${pipValue}`}
                      onClick={() => setValue(a.key, filled && pipValue === value ? pipValue - 1 : pipValue)}
                    />
                  );
                })}
              </div>
              <span className="muted" style={{ width: 24, textAlign: "right", fontSize: 13 }}>
                {value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
