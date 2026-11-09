// Cores de alma — mapeadas conforme a paleta clássica de UT/DR, aplicadas
// aos 7 Traços humanos e, com uma paleta análoga, aos 15 Elementos de
// Monstro (v0.5.1+).

export const SOUL_COLORS = {
  "Determinação": "#e8384f", // vermelho
  "Bravura": "#f4a13f", // laranja
  "Justiça": "#f4e04d", // amarelo
  "Bondade": "#6fcf7d", // verde
  "Paciência": "#5ec8d8", // ciano
  "Integridade": "#5170e8", // azul
  "Perseverança": "#a85ee8", // roxo
};

export const ELEMENT_COLORS = {
  Fogo: "#e8384f",
  Agua: "#5170e8",
  Terra: "#a9744f",
  Ar: "#c9e8f4",
  Gelo: "#5ec8d8",
  Eletrico: "#f4e04d",
  Tecnologia: "#8b95a8",
  Virus: "#7fd147",
  Cromatico: "#e85ee0",
  Rude: "#f4a13f",
  Sombrio: "#a85ee8",
  Sagrado: "#f1efe7",
  Morte: "#4a4a52",
  Caos: "#ff2fb0",
  Nulo: "#6b6b74",
};

export function soulColor(traco) {
  return SOUL_COLORS[traco] || "var(--accent-red)";
}

export function elementColor(elemento) {
  return ELEMENT_COLORS[elemento] || "var(--accent-cyan)";
}
