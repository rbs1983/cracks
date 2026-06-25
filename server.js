const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ligação à base de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// criar tabelas automaticamente
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        nome TEXT,
        pontos INT DEFAULT 0
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        casa TEXT,
        fora TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS predictions (
        id SERIAL PRIMARY KEY,
        player_id INT,
        match_id INT,
        palpite_casa INT,
        palpite_fora INT
      );
    `);

    console.log("Tabelas prontas ✅");
  } catch (err) {
    console.error("Erro ao criar tabelas:", err);
  }
}

initDB();

// adicionar jogador
app.post("/add-player", async (req, res) => {
  try {
    const { nome } = req.body;

    await pool.query(
      "INSERT INTO players(nome) VALUES($1)",
      [nome]
    );

    res.send("ok");
  } catch (err) {
    console.error(err);
    res.status(500).send("erro");
  }
});

// ranking
app.get("/ranking", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT nome, pontos FROM players ORDER BY pontos DESC"
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("erro");
  }
});

app.listen(3000, () => {
  console.log("Servidor ON 🚀");
});
``
