import { useEffect, useState } from "react";

// Menu de escolha com cursor de coração (♥), navegável pelo mouse (hover +
// clique) ou pelo teclado (setas + Enter), igual às telas de escolha do
// SURVEY_PROGRAM.EXE.
export default function SurveyMenu({ options, resetKey }) {
  const [focus, setFocus] = useState(0);

  useEffect(() => {
    setFocus(0);
  }, [resetKey]);

  useEffect(() => {
    function handleKey(e) {
      if (!options.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocus((f) => (f + 1) % options.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocus((f) => (f - 1 + options.length) % options.length);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const opt = options[focus];
        if (opt) opt.onSelect();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [focus, options]);

  return (
    <div className="survey-menu">
      {options.map((opt, i) => (
        <div
          key={opt.key}
          className={`survey-menu-item ${i === focus ? "focused" : ""}`}
          onMouseEnter={() => setFocus(i)}
          onClick={opt.onSelect}
        >
          <span className="survey-heart">{i === focus ? "♥" : ""}</span>
          <span className="survey-menu-label">
            {opt.dot && <span className="survey-menu-dot" style={{ background: opt.color }} />}
            {opt.label}
          </span>
          {opt.sub && <span className="survey-menu-sub">{opt.sub}</span>}
        </div>
      ))}
    </div>
  );
}
