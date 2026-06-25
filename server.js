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

// ✅ criar tabelas antes de iniciar
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        pontos INT DEFAULT 0
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        casa TEXT NOT NULL,
        fora TEXT NOT NULL,
        golos_casa INT,
        golos_fora INT
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

    console.log("✅ Tabelas prontas");
  } catch (err) {
    console.error("Erro DB:", err);
  }
}

//
// ✅ ROTAS
//

// ✅ listar jogadores
app.get("/players", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM players ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("erro");
  }
});

// ✅ adicionar jogador
app.post("/add-player", async (req, res) => {
  try {
    const { nome } = req.body;

    if (!nome) {
      return res.status(400).send("Nome obrigatório");
    }

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

// ✅ ranking
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

// ✅ listar jogos
app.get("/matches", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM matches ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("erro");
  }
});

// ✅ adicionar jogo
app.post("/add-match", async (req, res) => {
  try {
    const { casa, fora } = req.body;

    if (!casa || !fora) {
      return res.status(400).send("Equipas obrigatórias");
    }

    await pool.query(
      "INSERT INTO matches(casa, fora) VALUES($1,$2)",
      [casa, fora]
    );

    res.send("ok");
  } catch (err) {
    console.error(err);
    res.status(500).send("erro");
  }
});

// ✅ adicionar palpite
app.post("/add-prediction", async (req, res) => {
  try {
    const { player_id, match_id, palpite_casa, palpite_fora } = req.body;

    await pool.query(
      "INSERT INTO predictions(player_id, match_id, palpite_casa, palpite_fora) VALUES($1,$2,$3,$4)",
      [player_id, match_id, palpite_casa, palpite_fora]
    );

    res.send("ok");
  } catch (err) {
    console.error(err);
    res.status(500).send("erro");
  }
});

// ✅ inserir resultado + calcular pontos
app.post("/result/:id", async (req, res) => {
  try {
    const { casa, fora } = req.body;
    const match_id = req.params.id;

    // guardar resultado
    await pool.query(
      "UPDATE matches SET golos_casa=$1, golos_fora=$2 WHERE id=$3",
      [casa, fora, match_id]
    );

    // buscar palpites
    const preds = await pool.query(
      "SELECT * FROM predictions WHERE match_id=$1",
      [match_id]
    );

    for (let p of preds.rows) {

      let pontos = 0;

      const real =
        casa > fora ? "casa" :
        casa < fora ? "fora" : "empate";

      const palpite =
        p.palpite_casa > p.palpite_fora ? "casa" :
        p.palpite_casa < p.palpite_fora ? "fora" : "empate";

      if (p.palpite_casa == casa && p.palpite_fora == fora) {
        pontos = 3;
      } else if (real === palpite) {
        pontos = 1;
      }

      await pool.query(
        "UPDATE players SET pontos = pontos + $1 WHERE id = $2",
        [pontos, p.player_id]
      );
    }

    res.send("✅ resultado atualizado");
  } catch (err) {
    console.error(err);
    res.status(500).send("erro");
  }
});

// ✅ iniciar servidor
initDB().then(() => {
  app.listen(3000, () => {
    console.log("🚀 Servidor ON");
  });
});
