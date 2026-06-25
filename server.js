import express from "express";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // 🔥 SERVE O DASHBOARD

const PORT = process.env.PORT || 8080;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 🔥 Criar tabelas
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

// 🔥 Jogadores
app.get("/players", async (req, res) => {
  const result = await pool.query("SELECT * FROM players ORDER BY id ASC");
  res.json(result.rows);
});

app.post("/add-player", async (req, res) => {
  const { nome } = req.body;
  await pool.query("INSERT INTO players(nome) VALUES($1)", [nome]);
  res.json({ message: "Jogador criado" });
});

// 🔥 Jogos
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

// 🔥 Prognósticos
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

// 🔥 PROCESSAR RESULTADO — REGRAS 10 / 4 / 1 / 0
app.post("/result/:id", async (req, res) => {
  const matchId = req.params.id;

  const casa = parseInt(req.body.casa);
  const fora = parseInt(req.body.fora);

  if (isNaN(casa) || isNaN(fora)) {
    return res.status(400).json({ error: "Resultado inválido" });
  }

  try {
    // 1) Atualizar resultado
    await pool.query(
      "UPDATE matches SET golos_casa=$1, golos_fora=$2, processado=true WHERE id=$3",
      [casa, fora, matchId]
    );

    // 2) Buscar prognósticos
    const predictions = await pool.query(
      "SELECT * FROM predictions WHERE match_id=$1",
      [matchId]
    );

    // 3) Atribuir pontos
    for (const p of predictions.rows) {
      const palpiteCasa = Number(p.palpite_casa);
      const palpiteFora = Number(p.palpite_fora);

      const diffPalpite = palpiteCasa - palpiteFora;
      const diffReal = casa - fora;

      const palpiteVencedor =
        diffPalpite > 0 ? "casa" :
        diffPalpite < 0 ? "fora" :
        "empate";

      const realVencedor =
        diffReal > 0 ? "casa" :
        diffReal < 0 ? "fora" :
        "empate";

      let pontos = 0;

      // ✔ 10 pontos — resultado exato
      if (palpiteCasa === casa && palpiteFora === fora) {
        pontos = 10;
      }

      // ✔ 1 ponto — acertou só um golo
      else if (palpiteCasa === casa || palpiteFora === fora) {
        pontos = 1;
      }

      // ✔ 4 pontos — acertou vencedor mas falhou golos
      else if (palpiteVencedor === realVencedor) {
        pontos = 4;
      }

      // 0 pontos — resto

      await pool.query(
        "UPDATE players SET pontos = pontos + $1 WHERE id=$2",
        [pontos, p.player_id]
      );
    }

    res.json({ message: "Resultado processado com sucesso" });

  } catch (err) {
    console.error("ERRO AO PROCESSAR RESULTADO:", err);
    res.status(500).json({ error: "Erro ao processar resultado" });
  }
});

// 🔥 Ranking
app.get("/ranking", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM players ORDER BY pontos DESC, nome ASC"
  );
  res.json(result.rows);
});

// 🔥 Start
app.listen(PORT, () => {
  console.log(`🚀 Server ON na porta ${PORT}`);
});
