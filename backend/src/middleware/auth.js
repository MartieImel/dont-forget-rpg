const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dont-forget-rpg-dev-secret-troque-isso";

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Não autenticado." });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, username, displayName }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Sessão inválida ou expirada." });
  }
}

module.exports = { requireAuth, JWT_SECRET };
