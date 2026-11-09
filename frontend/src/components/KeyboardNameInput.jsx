import { useEffect, useState } from "react";

const ROWS = [
  ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
  ["K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"],
  ["U", "V", "W", "X", "Y", "Z", "BACK", "END"],
];

export default function KeyboardNameInput({ initialValue = "", onConfirm, maxLength = 16 }) {
  const [name, setName] = useState(initialValue);
  const [row, setRow] = useState(0);
  const [col, setCol] = useState(0);

  function pressKey(key) {
    if (key === "BACK") {
      setName((n) => n.slice(0, -1));
    } else if (key === "END") {
      if (name.trim()) onConfirm(name.trim());
    } else {
      setName((n) => (n.length < maxLength ? n + key : n));
    }
  }

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setCol((c) => (c + 1) % ROWS[row].length);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCol((c) => (c - 1 + ROWS[row].length) % ROWS[row].length);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setRow((r) => {
          const next = Math.min(r + 1, ROWS.length - 1);
          setCol((c) => Math.min(c, ROWS[next].length - 1));
          return next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setRow((r) => {
          const next = Math.max(r - 1, 0);
          setCol((c) => Math.min(c, ROWS[next].length - 1));
          return next;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        pressKey(ROWS[row][col]);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        setName((n) => n.slice(0, -1));
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        setName((n) => (n.length < maxLength ? n + e.key.toUpperCase() : n));
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, col, name]);

  return (
    <div className="keyboard-name">
      <div className="keyboard-name-display">
        {name || "\u00A0"}
        <span className="survey-cursor" />
      </div>
      <div className="keyboard-grid">
        {ROWS.map((r, ri) => (
          <div key={ri} className="keyboard-row">
            {r.map((k, ci) => (
              <button
                type="button"
                key={k}
                className={`keyboard-key ${ri === row && ci === col ? "focused" : ""} ${
                  k.length > 1 ? "keyboard-key-wide" : ""
                }`}
                onMouseEnter={() => {
                  setRow(ri);
                  setCol(ci);
                }}
                onClick={() => {
                  setRow(ri);
                  setCol(ci);
                  pressKey(k);
                }}
              >
                {k}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
