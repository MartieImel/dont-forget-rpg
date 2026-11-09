const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");
const { pool } = require("../db");
const { JWT_SECRET } = require("../middleware/auth");

function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username, displayName: user.displayName }, JWT_SECRET, {
    expiresIn: "30d",
  });
}

async function register(req, res) {
  const { username, password, displayName } = req.body || {};
  if (!username || !password || !displayName) {
    return res.status(400).json({ error: "Preencha usuário, nome de exibição e senha." });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: "A senha precisa ter pelo menos 4 caracteres." });
  }
  const cleanUsername = String(username).trim().toLowerCase();
  const existing = await pool.query("SELECT id FROM users WHERE username = $1", [cleanUsername]);
  if (existing.rows.length > 0) return res.status(409).json({ error: "Esse nome de usuário já existe." });

  const id = nanoid();
  const passwordHash = bcrypt.hashSync(password, 10);
  await pool.query(`INSERT INTO users (id, username, "displayName", "passwordHash") VALUES ($1,$2,$3,$4)`, [
    id,
    cleanUsername,
    displayName.trim(),
    passwordHash,
  ]);
  const user = { id, username: cleanUsername, displayName: displayName.trim() };
  res.status(201).json({ token: signToken(user), user });
}

async function login(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Preencha usuário e senha." });
  const cleanUsername = String(username).trim().toLowerCase();
  const result = await pool.query("SELECT * FROM users WHERE username = $1", [cleanUsername]);
  const row = result.rows[0];
  if (!row || !bcrypt.compareSync(password, row.passwordHash)) {
    return res.status(401).json({ error: "Usuário ou senha inválidos." });
  }
  const user = { id: row.id, username: row.username, displayName: row.displayName };
  res.json({ token: signToken(user), user });
}

async function me(req, res) {
  const result = await pool.query(`SELECT id, username, "displayName" FROM users WHERE id = $1`, [req.user.id]);
  if (!result.rows[0]) return res.status(404).json({ error: "Usuário não encontrado." });
  res.json({ user: result.rows[0] });
}

module.exports = { register, login, me };
