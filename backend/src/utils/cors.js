// Quem pode chamar a API pelo navegador. CORS_ORIGIN lista os sites permitidos, separados
// por vírgula (ex.: https://meu-app.vercel.app). Aceita "*.dominio.com" para subdomínios
// (só https). "*" ou nada = aberto (útil em desenvolvimento e no 1º deploy).
function parseOrigins(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function originAllowed(origin, rules) {
  if (!origin || rules.length === 0 || rules.includes("*")) return true; // sem Origin = não é navegador (curl, servidor); "*" = aberto
  return rules.some((rule) => {
    if (!rule.startsWith("*.")) return origin === rule;
    try {
      const u = new URL(origin);
      const suffix = rule.slice(1); // ".dominio.com"
      return u.protocol === "https:" && u.hostname.endsWith(suffix) && u.hostname.length > suffix.length;
    } catch {
      return false;
    }
  });
}

function corsOptions(raw) {
  const rules = parseOrigins(raw);
  if (rules.length === 0) return undefined; // padrão do pacote: aberto
  return { origin: (origin, cb) => cb(null, originAllowed(origin, rules)) };
}

module.exports = { parseOrigins, originAllowed, corsOptions };
