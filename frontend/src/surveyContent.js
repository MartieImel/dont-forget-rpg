// Conteúdo original (não copiado do jogo) inspirado no clima do
// SURVEY_PROGRAM.EXE do início de Deltarune — perguntas de personalidade
// que decidem os Atributos do Receptáculo, em vez de números soltos.

export const RACE_OPTIONS = [
  { key: "Humano", sub: "Um coração que pode escolher qualquer caminho." },
  { key: "Monstro", sub: "Feito de magia e sentimento — um elemento te chama." },
  { key: "Darkner", sub: "Nascido do sonho de alguém, dentro de uma Fonte Negra." },
];

export const TRACO_FLAVOR = {
  "Determinação": "A vontade de continuar, não importa o quê.",
  "Bravura": "Encarar o medo de peito aberto.",
  "Justiça": "Fazer o que é certo, mesmo quando dói.",
  "Bondade": "Cuidar dos outros antes de si mesmo.",
  "Paciência": "Esperar o momento certo, sem pressa.",
  "Integridade": "Ser o mesmo por dentro e por fora.",
  "Perseverança": "Levantar de novo, sempre.",
};

export const ORIGEM_OPTIONS = [
  "Um sonho de coragem.",
  "Um sonho esquecido.",
  "Um sonho de fúria.",
  "Um sonho gentil.",
  "Prefiro não dizer.",
];

// As duas perguntas de "aceite" clássicas de telas assim — texto original,
// não uma tradução literal do jogo, mas no mesmo espírito solene/irônico
// (as duas opções sempre levam a um "sim", de propósito).
export const CONSENT_STEPS = [
  {
    prompt: "ESTE É O SEU RECEPTÁCULO.\nVOCÊ O ACEITA?",
    options: ["Aceito.", "Sim, claro que aceito."],
  },
  {
    prompt: "VOCÊ RECONHECE OS RISCOS DESTA\nJORNADA — DOR, PERDA, E O INESPERADO?",
    options: ["Reconheço.", "Reconheço, plenamente."],
  },
];

// Corrente de perguntas por atributo (GRR-ESP-FRM-CHR-RPZ-MRL): cada
// resposta vale +2 pontos. 5 perguntas × 2 pontos = 10 pontos, igual ao
// orçamento de Nível 1 (v0.5.2). Atributos nas pontas (GRR, MRL) aparecem
// em 1 pergunta (máx. 2 pontos); os do meio aparecem em 2 (máx. 4 pontos)
// — exatamente o novo limite por atributo do Nível 1.
export const ATTR_QUESTIONS = [
  {
    prompt: "Uma porta emperrada bloqueia seu caminho. O que você faz?",
    options: [
      { label: "Arrombo com um bom chute.", attr: "GRR" },
      { label: "Procuro outro jeito de abrir, com calma.", attr: "ESP" },
    ],
  },
  {
    prompt: "Você encontra um quebra-cabeça complicado numa sala escondida.",
    options: [
      { label: "Estudo cada peça com atenção até entender a lógica.", attr: "ESP" },
      { label: "Ignoro o quebra-cabeça e sigo em frente, sem me abalar.", attr: "FRM" },
    ],
  },
  {
    prompt: "Um monstro claramente maior que você bloqueia a passagem.",
    options: [
      { label: "Fico firme e absorvo o que vier.", attr: "FRM" },
      { label: "Tento conversar e encontrar um jeito amigável de passar.", attr: "CHR" },
    ],
  },
  {
    prompt: "Alguém em apuros grita por ajuda numa sala cheia de gente.",
    options: [
      { label: "Chamo atenção de todos e organizo uma ajuda coletiva.", attr: "CHR" },
      { label: "Corro na frente de todos e chego primeiro.", attr: "RPZ" },
    ],
  },
  {
    prompt: "Você está exausto, mas o caminho à frente ainda é longo.",
    options: [
      { label: "Acelero o passo, sem perder tempo.", attr: "RPZ" },
      { label: "Respiro fundo e sigo em frente, com esperança de que vai dar certo.", attr: "MRL" },
    ],
  },
];
