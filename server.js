const express = require("express");
const { Pool } = require("pg");
const path = require("path");
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// POSTGRESQL CONNECTION (Railway)
// ===============================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ===============================
// CRIAR TABELAS
// ===============================
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      nome TEXT,
      pontos INTEGER DEFAULT 0
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS matches (
      id SERIAL PRIMARY KEY,
      equipa_casa TEXT,
      equipa_fora TEXT,
      jornada INTEGER,
      golos_casa INTEGER,
      golos_fora INTEGER,
      processado INTEGER DEFAULT 0
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS predictions (
      id SERIAL PRIMARY KEY,
      player_id INTEGER REFERENCES players(id),
      match_id INTEGER REFERENCES matches(id),
      palpite_casa INTEGER,
      palpite_fora INTEGER
    )
  `);
}

// ===============================
// ROTAS PLAYERS
// ===============================
app.get("/players", async (req, res) => {
  const result = await pool.query("SELECT * FROM players ORDER BY pontos DESC");
  res.json(result.rows);
});

app.post("/add-player", async (req, res) => {
  const { nome } = req.body;
  await pool.query("INSERT INTO players (nome) VALUES ($1)", [nome]);
  res.json({ status: "ok" });
});

// ===============================
// ADICIONAR JOGO (COM JORNADA)
// ===============================
app.post("/add-match", async (req, res) => {
  const { equipa_casa, equipa_fora, jornada } = req.body;

  await pool.query(
    "INSERT INTO matches (equipa_casa, equipa_fora, jornada) VALUES ($1, $2, $3)",
    [equipa_casa, equipa_fora, jornada]
  );

  res.json({ status: "ok" });
});

// ===============================
// LISTAR JOGOS
// ===============================
app.get("/matches", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM matches ORDER BY jornada ASC, id ASC"
  );
  res.json(result.rows);
});

// ===============================
// ADICIONAR / EDITAR PROGNÓSTICO
// ===============================
app.post("/add-prediction", async (req, res) => {
  const { player_id, match_id, palpite_casa, palpite_fora } = req.body;

  const existing = await pool.query(
    "SELECT id FROM predictions WHERE player_id=$1 AND match_id=$2",
    [player_id, match_id]
  );

  if (existing.rows.length > 0) {
    await pool.query(
      "UPDATE predictions SET palpite_casa=$1, palpite_fora=$2 WHERE id=$3",
      [palpite_casa, palpite_fora, existing.rows[0].id]
    );
    return res.json({ status: "updated" });
  }

  await pool.query(
    "INSERT INTO predictions (player_id, match_id, palpite_casa, palpite_fora) VALUES ($1, $2, $3, $4)",
    [player_id, match_id, palpite_casa, palpite_fora]
  );

  res.json({ status: "inserted" });
});

// ===============================
// LISTAR TODOS OS PROGNÓSTICOS
// ===============================
app.get("/all-predictions", async (req, res) => {
  const result = await pool.query("SELECT * FROM predictions");
  res.json(result.rows);
});

// ===============================
// INSERIR RESULTADO DO JOGO
// ===============================
app.post("/result/:id", async (req, res) => {
  const id = req.params.id;
  const { casa, fora } = req.body;

  await pool.query(
    "UPDATE matches SET golos_casa=$1, golos_fora=$2, processado=1 WHERE id=$3",
    [casa, fora, id]
  );

  await processarJogo(id);
  res.json({ status: "ok" });
});

// ===============================
// FUNÇÃO DE PROCESSAMENTO DE JOGO
// ===============================
async function processarJogo(matchId) {
  const matchRes = await pool.query("SELECT * FROM matches WHERE id=$1", [matchId]);
  const match = matchRes.rows[0];

  if (!match || match.golos_casa === null) return;

  const predsRes = await pool.query(
    "SELECT * FROM predictions WHERE match_id=$1",
    [matchId]
  );

  for (const p of predsRes.rows) {
    let pontos = 0;

    const pc = p.palpite_casa;
    const pf = p.palpite_fora;
    const rc = match.golos_casa;
    const rf = match.golos_fora;

    if (pc === rc && pf === rf) {
      pontos = 10;
    } else {
      const diffP = pc - pf;
      const diffR = rc - rf;

      const vP = diffP > 0 ? "casa" : diffP < 0 ? "fora" : "empate";
      const vR = diffR > 0 ? "casa" : diffR < 0 ? "fora" : "empate";

      if (vP === vR) pontos += 4;
      if (pc === rc || pf === rf) pontos += 1;
    }

    await pool.query(
      "UPDATE players SET pontos = pontos + $1 WHERE id=$2",
      [pontos, p.player_id]
    );
  }
}

// ===============================
// REPROCESSAR TUDO
// ===============================
app.post("/recalculate-all", async (req, res) => {
  await pool.query("UPDATE players SET pontos = 0");

  const jogos = await pool.query("SELECT id FROM matches WHERE processado=1");

  for (const j of jogos.rows) {
    await processarJogo(j.id);
  }

  res.json({ status: "ok" });
});

// ===============================
// REPROCESSAR JOGO INDIVIDUAL
// ===============================
app.post("/reprocess/:id", async (req, res) => {
  const id = req.params.id;

  await pool.query("UPDATE players SET pontos = 0");

  const jogos = await pool.query("SELECT id FROM matches WHERE processado=1");

  for (const j of jogos.rows) {
    await processarJogo(j.id);
  }

  res.json({ status: "ok" });
});

// ===============================
// INICIAR SERVIDOR
// ===============================
initDB().then(() => {
  app.listen(8080, () => {
    console.log("🚀 Server ON na porta 8080 (PostgreSQL + Jornadas)");
  });
});
