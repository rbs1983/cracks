const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// INIT DB
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      nome TEXT UNIQUE NOT NULL,
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

  // jogadores fixos
  const jogadores = [
    "André", "João", "Pedro",
    "Miguel", "Rui", "Carlos",
    "Bruno", "Tiago"
  ];

  for (let nome of jogadores) {
    await pool.query(
      "INSERT INTO players(nome) VALUES($1) ON CONFLICT (nome) DO NOTHING",
      [nome]
    );
  }

  console.log("✅ DB pronta");
}

// ROTAS
app.get("/players", async (req, res) => {
  const result = await pool.query("SELECT * FROM players");
  res.json(result.rows);
});

app.get("/ranking", async (req, res) => {
  const result = await pool.query(
    "SELECT nome,pontos FROM players ORDER BY pontos DESC"
  );
  res.json(result.rows);
});

app.get("/matches", async (req, res) => {
  const result = await pool.query("SELECT * FROM matches");
  res.json(result.rows);
});

app.post("/add-match", async (req, res) => {
  const { casa, fora } = req.body;

  await pool.query(
    "INSERT INTO matches(casa,fora) VALUES($1,$2)",
    [casa, fora]
  );

  res.send("ok");
});

app.post("/add-prediction", async (req, res) => {
  const { player_id, match_id, palpite_casa, palpite_fora } = req.body;

  await pool.query(
    "INSERT INTO predictions(player_id,match_id,palpite_casa,palpite_fora) VALUES($1,$2,$3,$4)",
    [player_id, match_id, palpite_casa, palpite_fora]
  );

  res.send("ok");
});

app.post("/result/:id", async (req, res) => {
  const { casa, fora } = req.body;
  const id = req.params.id;

  await pool.query(
    "UPDATE matches SET golos_casa=$1,golos_fora=$2 WHERE id=$3",
    [casa, fora, id]
  );

  const preds = await pool.query(
    "SELECT * FROM predictions WHERE match_id=$1",
    [id]
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
      "UPDATE players SET pontos = pontos + $1 WHERE id=$2",
      [pontos, p.player_id]
    );
  }

  res.send("ok");
});

initDB().then(() => {
  app.listen(3000, () => console.log("🚀 Server ON"));
});
