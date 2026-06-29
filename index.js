const express = require("express");
const cors = require("cors");
const path = require("path");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// Servir a pasta public (dashboard + index)
app.use(express.static(path.join(__dirname, "public")));

// Ligação ao PostgreSQL do Railway
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// -----------------------------
// ROTAS DA API PARA O DASHBOARD
// -----------------------------

// CLASSIFICAÇÃO
app.get("/classificacao", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pos, nome, pontos
      FROM classificacao
      ORDER BY pos ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao carregar classificação" });
  }
});

// JOGOS
app.get("/jogos", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT casa, golos_casa AS "golosCasa",
             golos_fora AS "golosFora", fora
      FROM jogos
      ORDER BY id ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao carregar jogos" });
  }
});

// PALPITES
app.get("/palpites", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT jogo, username AS "user",
             palpite, pontos
      FROM palpites
      ORDER BY id ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao carregar palpites" });
  }
});

// -----------------------------
// PORTA
// -----------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("API ativa na porta " + PORT);
});
