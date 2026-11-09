// Mesmas fórmulas do backend (src/utils/gameData.js), usadas aqui só para
// feedback imediato na ficha. O servidor é sempre a fonte de verdade.
// Atualizado para o livro de regras v0.5.2.

export function ATTR_LIMIT(_attributesRef, level) {
  // v0.5.2: base 4 no Nível 1, +1 por Nível
  return 4 + Math.max(0, (Number(level) || 1) - 1) * 1;
}

const LEVEL_POINTS = { 1: 10, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 5 };

export function ATTR_TOTAL(_attributesRef, level) {
  let total = 0;
  const lv = Number(level) || 1;
  for (let i = 1; i <= lv; i++) total += LEVEL_POINTS[i] ?? 2;
  return total;
}

// v0.5.1, mecânica nova: teto de pontos por Perícia = metade do Limite de
// Atributo daquele Nível (arredondado pra baixo).
export function PERICIA_CAP(level) {
  return Math.floor(ATTR_LIMIT(null, level) / 2);
}

export function computeStatus(attrs, classeKey, classes, hpBonusManual = 0, hopeBonusManual = 0, level = 1, lv = 1) {
  const grr = Number(attrs.GRR) || 0;
  const esp = Number(attrs.ESP) || 0;
  const frm = Number(attrs.FRM) || 0;
  const mrl = Number(attrs.MRL) || 0;
  const love = Number(lv) || 1;
  const loveSteps = Math.max(0, love - 1);
  const defBase = frm * 3;
  const atk = grr * 5 + loveSteps * 2;
  const def = defBase + loveSteps * 2;
  const mag = esp * 5;
  const hopeBase = 5 + mrl * 2;
  const hope = hopeBase + (Number(hopeBonusManual) || 0);
  const classeInfo = classes ? classes.find((c) => c.key === classeKey) : null;
  const hpBase = classeInfo ? classeInfo.hpBase : 70;
  const lvl = Number(level) || 1;
  const levelHpBonus = lvl >= 2 ? 15 * (lvl - 1) : 0;
  const loveHpBonus = loveSteps * 5;
  const hpMax = hpBase + defBase + (Number(hpBonusManual) || 0) + levelHpBonus + loveHpBonus;
  return { atk, def, mag, hope, hopeBase, hpMax, hpBase, defBase, levelHpBonus, loveHpBonus };
}
