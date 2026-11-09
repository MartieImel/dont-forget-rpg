// Funções puras do tabuleiro (fáceis de testar, sem React).

export const chebyshev = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

// Converte uma posição da tela (clientX/Y) na casa do tabuleiro. `rect` é o
// getBoundingClientRect() do elemento do tabuleiro (já considera rolagem e zoom).
export function cellFromPoint(rect, cols, rows, clientX, clientY) {
  if (!rect || !rect.width || !rect.height) return null;
  const px = clientX - rect.left;
  const py = clientY - rect.top;
  if (px < 0 || py < 0 || px >= rect.width || py >= rect.height) return null;
  return { x: Math.floor(px / (rect.width / cols)), y: Math.floor(py / (rect.height / rows)) };
}

// Casas que o jogador pode alcançar neste turno: dentro do alcance a partir de
// onde a ficha começou o turno, dentro do tabuleiro e sem ficha em cima.
export function reachableCells(token, cols, rows, tokens) {
  const occupied = new Set(tokens.filter((t) => t.id !== token.id).map((t) => `${t.x},${t.y}`));
  const cells = [];
  const r = token.moveRange;
  for (let y = Math.max(0, token.startY - r); y <= Math.min(rows - 1, token.startY + r); y++) {
    for (let x = Math.max(0, token.startX - r); x <= Math.min(cols - 1, token.startX + r); x++) {
      if (occupied.has(`${x},${y}`)) continue;
      cells.push({ x, y, origin: x === token.startX && y === token.startY });
    }
  }
  return cells;
}
