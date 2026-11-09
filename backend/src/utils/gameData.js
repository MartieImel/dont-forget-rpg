// Dados de referência do sistema Don't Forget RPG, extraídos do livro de
// regras v0.5.2. Usados tanto para validação no backend quanto exportados
// para o frontend.

const ATTRIBUTES = [
  { key: "GRR", name: "Garra", desc: "Força física e base para os ataques." },
  { key: "ESP", name: "Esperteza", desc: "Inteligência e capacidade mágica." },
  { key: "FRM", name: "Firmeza", desc: "Resistência e capacidade de suportar dano." },
  { key: "CHR", name: "Charme", desc: "Capacidade de influenciar outros." },
  { key: "RPZ", name: "Rapidez", desc: "Habilidade de desviar e agir com agilidade." },
  { key: "MRL", name: "Moral", desc: "Esperança; resistir a efeitos mentais." },
];

const PERICIAS = [
  { key: "atletismo", name: "Atletismo", attr: "GRR" },
  { key: "bloqueio", name: "Bloqueio", attr: "FRM" },
  { key: "briga", name: "Briga", attr: "GRR" },
  { key: "disparo", name: "Disparo", attr: "RPZ" },
  { key: "enganacao", name: "Enganação", attr: "CHR" },
  { key: "escalada", name: "Escalada", attr: "FRM" },
  { key: "esquiva", name: "Esquiva", attr: "RPZ" },
  { key: "exibicao", name: "Exibição", attr: "CHR" },
  { key: "foco", name: "Foco", attr: "ESP" },
  { key: "furtividade", name: "Furtividade", attr: "RPZ" },
  { key: "historia", name: "História", attr: "ESP" },
  { key: "inspiracao", name: "Inspiração", attr: "MRL" },
  { key: "intimidacao", name: "Intimidação", attr: "GRR" },
  { key: "intuicao", name: "Intuição", attr: "MRL" },
  { key: "percepcao", name: "Percepção", attr: "ESP" },
  { key: "persuasao", name: "Persuasão", attr: "CHR" },
  { key: "vigor", name: "Vigor", attr: "FRM" },
  { key: "vontade", name: "Vontade", attr: "MRL" },
];

const RACES = ["Humano", "Monstro", "Darkner"];

const TRACOS_HUMANOS = [
  "Determinação",
  "Bravura",
  "Justiça",
  "Bondade",
  "Paciência",
  "Integridade",
  "Perseverança",
];

// Tabela de Elementos v0.5.1+ — expandida de 7 para 15 elementos.
const ELEMENTOS_MONSTRO = [
  { key: "Fogo", fraqueza: "Agua", vantagem: "Gelo" },
  { key: "Agua", fraqueza: "Eletrico", vantagem: "Fogo" },
  { key: "Terra", fraqueza: "Ar", vantagem: "Eletrico" },
  { key: "Ar", fraqueza: "Gelo", vantagem: "Terra" },
  { key: "Gelo", fraqueza: "Fogo", vantagem: "Ar" },
  { key: "Eletrico", fraqueza: "Gelo", vantagem: "Agua" },
  { key: "Tecnologia", fraqueza: "Virus", vantagem: "Cromatico" },
  { key: "Virus", fraqueza: "Cromatico", vantagem: "Tecnologia" },
  { key: "Cromatico", fraqueza: "Tecnologia", vantagem: "Virus" },
  { key: "Rude", fraqueza: "Sombrio", vantagem: "Sagrado" },
  { key: "Sombrio", fraqueza: "Sagrado", vantagem: "Rude" },
  { key: "Sagrado", fraqueza: "Rude", vantagem: "Sombrio" },
  { key: "Morte", fraqueza: "Morte", vantagem: "Morte" },
  { key: "Caos", fraqueza: "Todos Elementos", vantagem: "Todos Elementos" },
  { key: "Nulo", fraqueza: "Nenhum", vantagem: "Nenhum" },
];

// HP base = valor fixo da classe + DEF (Firmeza x 3)
const CLASSES = [
  {
    key: "Ator",
    lema: "Aquele que luta com as ações.",
    hpBase: 80,
    bonusAtributo: { add: "CHR", sub: "GRR" },
    periciaOpcoes: ["Inspiração", "Exibição", "Enganação"],
    subclasses: ["Ator de Ação", "Comediante", "Dublê"],
  },
  {
    key: "Lutador",
    lema: "Aquele que luta antes de agir.",
    hpBase: 100,
    bonusAtributo: { add: "GRR", sub: "ESP" },
    periciaOpcoes: ["Briga", "Vontade", "Disparo"],
    subclasses: ["Impactante", "Espadachim", "Pistoleiro"],
  },
  {
    key: "Mágico",
    lema: "Aquele que luta com sua esperança.",
    hpBase: 70,
    bonusAtributo: { add: "ESP", sub: "FRM" },
    periciaOpcoes: ["Vontade", "Foco", "História"],
    subclasses: ["Elemental", "Suporte Mágico", "Mágico Econômico"],
  },
  {
    key: "Escudeiro",
    lema: "Aquele que protege na luta.",
    hpBase: 120,
    bonusAtributo: { add: "FRM", sub: "RPZ" },
    periciaOpcoes: ["Bloqueio", "Vigor", "Percepção"],
    subclasses: ["Escudo Afiado", "Defesa Total", "Corajoso"],
  },
  {
    key: "Cozinheiro",
    lema: "Aquele que se energiza para a luta.",
    hpBase: 60,
    bonusAtributo: { add: "CHR", sub: "MRL" },
    periciaOpcoes: ["Foco", "História", "Exibição"],
    subclasses: ["Master Chef", "Nutricionista", "Caseiro"],
  },
  {
    key: "Explorador",
    lema: "Aquele que analisa o campo da luta.",
    hpBase: 80,
    bonusAtributo: { add: "FRM", sub: "MRL" },
    periciaOpcoes: ["História", "Intuição", "Escalada"],
    subclasses: ["Analista", "Estrategista", "Engenheiro"],
  },
  {
    key: "Curandeiro",
    lema: "Aquele que cura na luta.",
    hpBase: 80, // v0.5.1: era 65, agora 80
    bonusAtributo: { add: "ESP", sub: "GRR" },
    periciaOpcoes: ["Persuasão", "Vigor", "Esquiva"],
    subclasses: ["Vampiro", "Farmacêutico", "Medicina Alternativa"], // Sanguessuga -> Vampiro
  },
  {
    key: "Trapaceiro",
    lema: "Aquele que aposta na luta.",
    hpBase: 75,
    bonusAtributo: { add: "RPZ", sub: "CHR" },
    periciaOpcoes: ["Furtividade", "Intuição", "Enganação"],
    subclasses: ["Cheater", "Ladrão", "Apostador"],
  },
];

// Bônus de Perícia da Classe (v0.5.x): cada Classe dá +1 em UMA de 3 perícias,
// à escolha. Guardamos as opções também como chaves (ex.: "inspiracao").
// Se algum nome estiver errado, falha já na subida do servidor.
CLASSES.forEach((c) => {
  c.periciaOpcoesKeys = c.periciaOpcoes.map((nome) => {
    const found = PERICIAS.find((p) => p.name === nome);
    if (!found) throw new Error(`Perícia desconhecida na Classe ${c.key}: ${nome}`);
    return found.key;
  });
});

// bonusKey vazio = sem bônus escolhido (sempre válido).
function validatePericiaBonus(classeKey, bonusKey) {
  if (!bonusKey) return { valid: true };
  const classe = CLASSES.find((c) => c.key === classeKey);
  if (!classe) return { valid: false, error: "Escolha uma Classe antes do bônus de perícia." };
  if (!classe.periciaOpcoesKeys.includes(bonusKey)) {
    return { valid: false, error: `Essa perícia não é uma das opções de bônus da Classe ${classe.key}.` };
  }
  return { valid: true };
}

// Tabela de progressão de Nível v0.5.1+ — pontos de atributo por nível.
// (v0.2.1 tinha 12/+3/+3/+3/+3/+3/+5; agora é 10/+2/+2/+2/+2/+2/+5)
const LEVEL_TABLE = {
  1: { pontosAtributo: 10, marcos: ["Habilidade de Classe", "Habilidade de Alma/Magia", "Aspectos"] },
  2: { pontosAtributo: 2, marcos: ["Habilidade de Trilha", "Habilidade de Alma/Magia"] },
  3: { pontosAtributo: 2, marcos: ["Habilidade de Alma/Magia"] },
  4: { pontosAtributo: 2, marcos: ["Habilidade de Trilha", "Habilidade de Alma/Magia"] },
  5: { pontosAtributo: 2, marcos: ["Habilidade de Alma/Magia"] },
  6: { pontosAtributo: 2, marcos: ["Habilidade de Trilha", "Habilidade de Alma/Magia"] },
  7: { pontosAtributo: 5, marcos: ["Habilidade de Alma/Magia"] },
};

const TIPOS_EQUIPAMENTO = ["Arma", "Armadura", "Amuleto"];
const TIPOS_ARMA = ["Corpo a Corpo", "À Distância", "Mágica"];
const SUBTIPOS_ARMA = ["Impacto", "Cortante", "Perfurante"];
const TIPOS_ACAO = ["Completa", "Parcial", "Reação", "Passiva"];

function attrLimitForLevel(level) {
  // v0.5.2: "Limite de Atributo no Nível 1 é 4" e "aumenta em +1 a cada Nível"
  return 4 + Math.max(0, (Number(level) || 1) - 1) * 1;
}

function totalAttributePointsForLevel(level) {
  let total = 0;
  const lvl = Number(level) || 1;
  for (let lv = 1; lv <= lvl; lv++) {
    total += LEVEL_TABLE[lv] ? LEVEL_TABLE[lv].pontosAtributo : 2;
  }
  return total;
}

// v0.5.1, mecânica nova: o teto de pontos por Perícia é metade do Limite
// de Atributo daquele Nível (arredondado pra baixo).
function periciaCapForLevel(level) {
  return Math.floor(attrLimitForLevel(level) / 2);
}

function validateAttrs(attrs, level) {
  const limit = attrLimitForLevel(level);
  const budget = totalAttributePointsForLevel(level);
  const keys = ATTRIBUTES.map((a) => a.key);
  let total = 0;
  for (const k of keys) {
    const v = Number((attrs || {})[k]) || 0;
    if (v < 0) return { valid: false, error: `${k} não pode ser negativo.` };
    if (v > limit) return { valid: false, error: `${k} excede o limite de ${limit} pontos para o Nível ${level}.` };
    total += v;
  }
  if (total > budget) {
    return { valid: false, error: `Total de pontos de atributo (${total}) excede o orçamento de ${budget} para o Nível ${level}.` };
  }
  return { valid: true, total, budget, limit };
}

// v0.5.1, mecânica nova: os pontos que dá pra gastar nas Perícias de um
// Atributo são limitados ao valor daquele Atributo (soma do grupo), e cada
// Perícia individual tem teto de metade do Limite de Atributo.
function validatePericias(pericias, attrs, level) {
  const cap = periciaCapForLevel(level);
  const groups = {};
  PERICIAS.forEach((p) => {
    groups[p.attr] = groups[p.attr] || [];
    groups[p.attr].push(p);
  });
  for (const attrKey of Object.keys(groups)) {
    const budget = Number((attrs || {})[attrKey]) || 0;
    let spent = 0;
    for (const p of groups[attrKey]) {
      const v = Number((pericias || {})[p.key]) || 0;
      if (v < 0) return { valid: false, error: `${p.name} não pode ser negativo.` };
      if (v > cap) return { valid: false, error: `${p.name} excede o limite de ${cap} pontos para o Nível ${level}.` };
      spent += v;
    }
    if (spent > budget) {
      return {
        valid: false,
        error: `Perícias de ${attrKey} somam ${spent}, mas seu ${attrKey} só permite ${budget}.`,
      };
    }
  }
  return { valid: true, cap };
}

// v0.5.1: LOVE agora concede bônus mecânico direto (+5 HP, +2 ATK, +2 DEF
// a cada vez que o valor de LV aumenta). LV começa em 1 (o mínimo, igual
// ao Nível), então o bônus é contado a partir do segundo ponto de LV pra
// frente — mesma lógica usada pro bônus de HP por Nível.
function calcStatus({ grr, esp, frm, chr, rpz, mrl, classeKey, level, lv, hpBonusManual, hopeBonusManual }) {
  const love = Number(lv) || 1;
  const loveSteps = Math.max(0, love - 1);
  const defBase = frm * 3;
  const atk = grr * 5 + loveSteps * 2;
  const def = defBase + loveSteps * 2;
  const mag = esp * 5;
  const hopeBase = 5 + mrl * 2;
  const hope = hopeBase + (Number(hopeBonusManual) || 0);
  const classeInfo = CLASSES.find((c) => c.key === classeKey);
  const hpBase = classeInfo ? classeInfo.hpBase : 70;
  const lvl = Number(level) || 1;
  const levelHpBonus = lvl >= 2 ? 15 * (lvl - 1) : 0;
  const loveHpBonus = loveSteps * 5;
  const hpMax = hpBase + defBase + (Number(hpBonusManual) || 0) + levelHpBonus + loveHpBonus;
  return { atk, def, mag, hope, hopeBase, hpMax, hpBase, defBase, levelHpBonus, loveHpBonus };
}

module.exports = {
  ATTRIBUTES,
  PERICIAS,
  RACES,
  TRACOS_HUMANOS,
  ELEMENTOS_MONSTRO,
  CLASSES,
  LEVEL_TABLE,
  TIPOS_EQUIPAMENTO,
  TIPOS_ARMA,
  SUBTIPOS_ARMA,
  TIPOS_ACAO,
  attrLimitForLevel,
  totalAttributePointsForLevel,
  periciaCapForLevel,
  validateAttrs,
  validatePericias,
  validatePericiaBonus,
  calcStatus,
};
