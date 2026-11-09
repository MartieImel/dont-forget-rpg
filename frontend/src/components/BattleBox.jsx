export default function BattleBox({ children, accent, tight, className = "", ...rest }) {
  const cls = ["box", accent === "red" && "box-accent", accent === "gold" && "box-gold", tight && "box-tight", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} {...rest}>
      <span className="corner-tl" aria-hidden="true" />
      <span className="corner-br" aria-hidden="true" />
      {children}
    </div>
  );
}
