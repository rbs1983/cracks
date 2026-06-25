const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Conexão PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Inicializar BD
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      nome TEXT UNIQUE NOT NULL,
      pontos INTEGER DEFAULT 0
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS matches (
      id SERIAL PRIMARY KEY,
      equipa_casa TEXT NOT NULL,
      equipa_fora TEXT NOT NULL,
      golos_casa INTEGER,
      golos_fora INTEGER,
      processado BOOLEAN DEFAULT false
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS predictions (
      id SERIAL PRIMARY KEY,
      player_id INTEGER REFERENCES players(id),
      match_id INTEGER REFERENCES matches(id),
      palpite_casa INTEGER NOT NULL,
      palpite_fora INTEGER NOT NULL,
      UNIQUE(player_id, match_id)
    );
  `);

  console.log("DB pronta");
}

// DASHBOARD COMO PÁGINA INICIAL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// Listar jogadores
app.get("/players", async (req, res) => {
  const result = await pool.query("SELECT * FROM players ORDER BY id ASC");
  res.json(result.rows);
});

// Ranking
app.get("/ranking", async (req, res) => {
  const result = await pool.query(
    "SELECT nome, pontos FROM players ORDER BY pontos DESC"
  );
  res.json(result.rows);
});

// Listar todos os palpites
app.get("/all-predictions", async (req, res) => {
  const result = await pool.query("SELECT * FROM predictions");
  res.json(result.rows);
});

// Adicionar jogo
app.post("/add-match", async (req, res) => {
  const { equipa_casa, equipa_fora } = req.body;

  await pool.query(
    "INSERT INTO matches(equipa_casa, equipa_fora) VALUES($1, $2)",
    [equipa_casa, equipa_fora]
  );

  res.send("Jogo adicionado");
});

// Listar jogos
app.get("/matches", async (req, res) => {
  const result = await pool.query("SELECT * FROM matches ORDER BY id ASC");
  res.json(result.rows);
});

// Adicionar palpite
app.post("/add-prediction", async (req, res) => {
  const { player_id, match_id, palpite_casa, palpite_fora } = req.body;

  await pool.query(
    `INSERT INTO predictions(player_id, match_id, palpite_casa, palpite_fora)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (player_id, match_id)
     DO UPDATE SET palpite_casa = EXCLUDED.palpite_casa,
                   palpite_fora = EXCLUDED.palpite_fora`,
    [player_id, match_id, palpite_casa, palpite_fora]
  );

  res.send("Palpite registado");
});

// Registar resultado e calcular pontos
app.post("/result/:id", async (req, res) => {
  const match_id = req.params.id;
  const { casa, fora } = req.body;

  const jogo = await pool.query(
    "SELECT processado FROM matches WHERE id=$1",
    [match_id]
  );

  if (jogo.rows[0].processado) {
    return res.send("Este jogo já foi processado");
  }

  await pool.query(
    "UPDATE matches SET golos_casa=$1, golos_fora=$2, processado=true WHERE id=$3",
    [casa, fora, match_id]
  );

  const predictions = await pool.query(
    "SELECT * FROM predictions WHERE match_id=$1",
    [match_id]
  );

  for (let p of predictions.rows) {
    let pontos = 0;

    if (p.palpite_casa === casa && p.palpite_fora === fora) {
      pontos = 3;
    } else if (
      (p.palpite_casa - p.palpite_fora) === (casa - fora)
    ) {
      pontos = 1;
    }

    await pool.query(
      "UPDATE players SET pontos = pontos + $1 WHERE id=$2",
      [pontos, p.player_id]
    );
  }

  res.send("Resultado registado e pontos atribuídos");
});

// Iniciar servidor
initDB().then(() => {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => console.log(`🚀 Server ON na porta ${PORT}`));
});
