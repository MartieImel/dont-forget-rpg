import { useCallback, useEffect, useRef } from "react";
import { STICK_RADIUS } from "../escape/render.js";

// Controles da Cena de Fuga: teclado (setas/WASD, Shift = devagar) e toque (arrastar o dedo em
// qualquer ponto vira um joystick). Compartilhado pelo jogador solo e pelo ao vivo.
const KEYS = {
  ArrowLeft: "l", a: "l", A: "l",
  ArrowRight: "r", d: "r", D: "r",
  ArrowUp: "u", w: "u", W: "u",
  ArrowDown: "d", s: "d", S: "d",
};

// isRunning(): true enquanto a cena está rodando (só então seguramos o scroll das setas)
export function useEscapeInput(canvasRef, sceneRef, isRunning) {
  const keysRef = useRef(new Set());
  const shiftRef = useRef(false);
  const touchRef = useRef(null); // { id, ox, oy, cx, cy } em px da tela
  const runningRef = useRef(isRunning);
  runningRef.current = isRunning;

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Shift") shiftRef.current = true;
      const k = KEYS[e.key];
      if (!k) return;
      const tag = (e.target && e.target.tagName) || "";
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (runningRef.current()) e.preventDefault(); // não rolar a página jogando
      keysRef.current.add(k);
    }
    function onKeyUp(e) {
      if (e.key === "Shift") shiftRef.current = false;
      const k = KEYS[e.key];
      if (k) keysRef.current.delete(k);
    }
    function onBlur() {
      keysRef.current.clear();
      shiftRef.current = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const readInput = useCallback(() => {
    const t = touchRef.current;
    if (t) {
      const dx = t.cx - t.ox, dy = t.cy - t.oy;
      const rect = canvasRef.current.getBoundingClientRect();
      const unit = rect.width / sceneRef.current.box.w; // px de tela por unidade da cena
      const len = Math.hypot(dx, dy) / unit;
      if (len < 4) return { x: 0, y: 0, slow: false }; // zona morta
      const k = Math.min(1, len / STICK_RADIUS);
      return { x: (dx / unit / len) * k, y: (dy / unit / len) * k, slow: false };
    }
    const ks = keysRef.current;
    return { x: (ks.has("r") ? 1 : 0) - (ks.has("l") ? 1 : 0), y: (ks.has("d") ? 1 : 0) - (ks.has("u") ? 1 : 0), slow: shiftRef.current };
  }, [canvasRef, sceneRef]);

  const touchView = useCallback(() => {
    const t = touchRef.current;
    if (!t) return undefined;
    const rect = canvasRef.current.getBoundingClientRect();
    const f = sceneRef.current.box.w / rect.width;
    return { ox: (t.ox - rect.left) * f, oy: (t.oy - rect.top) * f, cx: (t.cx - rect.left) * f, cy: (t.cy - rect.top) * f };
  }, [canvasRef, sceneRef]);

  const reset = useCallback(() => {
    keysRef.current.clear();
    shiftRef.current = false;
  }, []);

  const handlers = {
    onPointerDown(e) {
      if (e.pointerType === "mouse" || touchRef.current) return;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      touchRef.current = { id: e.pointerId, ox: e.clientX, oy: e.clientY, cx: e.clientX, cy: e.clientY };
    },
    onPointerMove(e) {
      const t = touchRef.current;
      if (t && t.id === e.pointerId) {
        t.cx = e.clientX;
        t.cy = e.clientY;
      }
    },
    onPointerUp(e) {
      if (touchRef.current && touchRef.current.id === e.pointerId) touchRef.current = null;
    },
  };
  handlers.onPointerCancel = handlers.onPointerUp;

  return { readInput, touchView, reset, handlers };
}
