import express from "express";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 8080;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Criar tabelas
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
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
      palpite_casa INTEGER,
      palpite_fora INTEGER
    );
  `);

  console.log("BD pronta");
}
initDB();

// Jogadores
app.get("/players", async (req, res) => {
  const result = await pool.query("SELECT * FROM players ORDER BY id ASC");
  res.json(result.rows);
});

app.post("/add-player", async (req, res) => {
  const { nome } = req.body;
  await pool.query("INSERT INTO players(nome) VALUES($1)", [nome]);
  res.json({ message: "Jogador criado" });
});

// Jogos
app.post("/add-match", async (req, res) => {
  const { equipa_casa, equipa_fora } = req.body;
  await pool.query(
    "INSERT INTO matches(equipa_casa, equipa_fora) VALUES($1, $2)",
    [equipa_casa, equipa_fora]
  );
  res.json({ message: "Jogo criado" });
});

app.get("/matches", async (req, res) => {
  const result = await pool.query("SELECT * FROM matches ORDER BY id ASC");
  res.json(result.rows);
});

// Prognósticos
app.post("/add-prediction", async (req, res) => {
  const { player_id, match_id, palpite_casa, palpite_fora } = req.body;

  await pool.query(
    "INSERT INTO predictions(player_id, match_id, palpite_casa, palpite_fora) VALUES($1,$2,$3,$4)",
    [player_id, match_id, palpite_casa, palpite_fora]
  );

  res.json({ message: "Prognóstico guardado" });
});

app.get("/all-predictions", async (req, res) => {
  const result = await pool.query("SELECT * FROM predictions ORDER BY id ASC");
  res.json(result.rows);
});

// EDITAR PROGNÓSTICO
app.post("/edit-prediction/:id", async (req, res) => {
  const id = req.params.id;
  const { palpite_casa, palpite_fora } = req.body;

  try {
    await pool.query(
      "UPDATE predictions SET palpite_casa=$1, palpite_fora=$2 WHERE id=$3",
      [palpite_casa, palpite_fora, id]
    );

    res.json({ message: "Prognóstico atualizado" });

  } catch (err) {
    console.error("Erro ao editar prognóstico:", err);
    res.status(500).json({ error: "Erro ao editar prognóstico" });
  }
});

// PROCESSAR RESULTADO (REGRAS ACUMULATIVAS)
app.post("/result/:id", async (req, res) => {
  const matchId = req.params.id;

  const casa = Number(req.body.casa);
  const fora = Number(req.body.fora);

  if (isNaN(casa) || isNaN(fora)) {
    return res.status(400).json({ error: "Resultado inválido" });
  }

  try {
    await pool.query(
      "UPDATE matches SET golos_casa=$1, golos_fora=$2, processado=true WHERE id=$3",
      [casa, fora, matchId]
    );

    const predictions = await pool.query(
      "SELECT * FROM predictions WHERE match_id=$1",
      [matchId]
    );

    for (const p of predictions.rows) {
      const pc = Number(p.palpite_casa);
      const pf = Number(p.palpite_fora);

      let pontos = 0;

      // 10 pontos — resultado exato
      if (pc === casa && pf === fora) {
        pontos = 10;
      } else {
        // 4 pontos — acertou vencedor
        const diffP = pc - pf;
        const diffR = casa - fora;

        const vP = diffP > 0 ? "casa" : diffP < 0 ? "fora" : "empate";
        const vR = diffR > 0 ? "casa" : diffR < 0 ? "fora" : "empate";

        if (vP === vR) pontos += 4;

        // 1 ponto — acertou um golo
        if (pc === casa || pf === fora) pontos += 1;
      }

      await pool.query(
        "UPDATE players SET pontos = pontos + $1 WHERE id=$2",
        [pontos, p.player_id]
      );
    }

    res.json({ message: "Resultado processado com sucesso" });

  } catch (err) {
    console.error("Erro:", err);
    res.status(500).json({ error: "Erro ao processar resultado" });
  }
});

// REPROCESSAR JOGO (REGRAS ACUMULATIVAS)
app.post("/reprocess/:id", async (req, res) => {
  const matchId = req.params.id;

  try {
    const predictions = await pool.query(
      "SELECT * FROM predictions WHERE match_id=$1",
      [matchId]
    );

    const jogo = await pool.query(
      "SELECT golos_casa, golos_fora FROM matches WHERE id=$1",
      [matchId]
    );

    const casa = jogo.rows[0].golos_casa;
    const fora = jogo.rows[0].golos_fora;

    // Remover pontos antigos
    for (const p of predictions.rows) {
      const pc = Number(p.palpite_casa);
      const pf = Number(p.palpite_fora);

      let pontos = 0;

      if (pc === casa && pf === fora) {
        pontos = 10;
      } else {
        const diffP = pc - pf;
        const diffR = casa - fora;

        const vP = diffP > 0 ? "casa" : diffP < 0 ? "fora" : "empate";
        const vR = diffR > 0 ? "casa" : diffR < 0 ? "fora" : "empate";

        if (vP === vR) pontos += 4;
        if (pc === casa || pf === fora) pontos += 1;
      }

      await pool.query(
        "UPDATE players SET pontos = pontos - $1 WHERE id=$2",
        [pontos, p.player_id]
      );
    }

    // Marcar como não processado
    await pool.query(
      "UPDATE matches SET processado=false WHERE id=$1",
      [matchId]
    );

    // Reprocessar
    await fetch(`http://localhost:${PORT}/result/${matchId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ casa, fora })
    });

    res.json({ message: "Jogo reprocessado com sucesso" });

  } catch (err) {
    console.error("Erro ao reprocessar:", err);
    res.status(500).json({ error: "Erro ao reprocessar jogo" });
  }
});

// Ranking
app.get("/ranking", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM players ORDER BY pontos DESC, nome ASC"
  );
  res.json(result.rows);
});

// Start
app.listen(PORT, () => {
  console.log(`🚀 Server ON na porta ${PORT}`);
});
