import { useEffect, useRef, useState } from "react";

export function useTypewriter(text, speed = 16) {
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);
  const idxRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    setShown("");
    setDone(text.length === 0);
    idxRef.current = 0;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      idxRef.current += 1;
      setShown(text.slice(0, idxRef.current));
      if (idxRef.current >= text.length) {
        clearInterval(timerRef.current);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(timerRef.current);
  }, [text, speed]);

  function skip() {
    clearInterval(timerRef.current);
    setShown(text);
    setDone(true);
  }

  return { shown, done, skip };
}
