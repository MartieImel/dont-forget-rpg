// O `neon env pull` / `neon deploy` grava `.env.local` na RAIZ do projeto (uma pasta acima
// de backend/); aceitamos ali e aqui. Variáveis já definidas no ambiente (Render) vencem.
require("dotenv").config({ path: [".env.local", ".env", "../.env.local", "../.env"] });
const express = require("express");
const cors = require("cors");

const { initSchema } = require("./src/db");
const authRoutes = require("./src/routes/authRoutes");
const characterRoutes = require("./src/routes/characterRoutes");
const campaignRoutes = require("./src/routes/campaignRoutes");
const gameData = require("./src/utils/gameData");
const { corsOptions } = require("./src/utils/cors");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors(corsOptions(process.env.CORS_ORIGIN)));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true, name: "Don't Forget RPG API" }));
app.get("/api/game-data", (req, res) => res.json(gameData));

app.use("/api/auth", authRoutes);
app.use("/api/characters", characterRoutes);
app.use("/api/campaigns", campaignRoutes);

app.use((req, res) => res.status(404).json({ error: "Rota não encontrada." }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor." });
});

initSchema()
  .then(() => app.listen(PORT, () => console.log(`Don't Forget RPG API rodando na porta ${PORT}`)))
  .catch((err) => {
    console.error("Falha ao inicializar o banco de dados:", err);
    process.exit(1);
  });
