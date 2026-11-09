export default function RangeStepper({ label, current, max, onChange, kind = "hp", step = 1 }) {
  function adjust(delta) {
    const next = Math.max(0, Math.min(max, (Number(current) || 0) + delta));
    onChange(next);
  }
  const safeMax = max > 0 ? max : 1;
  const pct = Math.max(0, Math.min(100, ((Number(current) || 0) / safeMax) * 100));

  return (
    <div className="stat-bar-wrap">
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => adjust(-step)}>
        −
      </button>
      <span className="stat-bar-label">{label}</span>
      <div className="stat-bar-track">
        <div className={`stat-bar-fill ${kind}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="stat-bar-value">
        {current} / {max}
      </span>
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => adjust(step)}>
        +
      </button>
    </div>
  );
}
