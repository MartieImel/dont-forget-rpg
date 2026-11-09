export default function StatBar({ label, current, max, kind = "hp" }) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.max(0, Math.min(100, (current / safeMax) * 100));
  return (
    <div className="stat-bar-wrap">
      <span className="stat-bar-label">{label}</span>
      <div className="stat-bar-track">
        <div className={`stat-bar-fill ${kind}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="stat-bar-value">
        {current} / {max}
      </span>
    </div>
  );
}
