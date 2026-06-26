const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


const db = new sqlite3.Database("database.db");

// ===============================
// CRIAR TABELAS
// ===============================
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      pontos INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipa_casa TEXT,
      equipa_fora TEXT,
      jornada INTEGER,
      golos_casa INTEGER,
      golos_fora INTEGER,
      processado INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER,
      match_id INTEGER,
      palpite_casa INTEGER,
      palpite_fora INTEGER
    )
  `);
});

// ===============================
// ROTAS PLAYERS
// ===============================
app.get("/players", (req, res) => {
  db.all("SELECT * FROM players ORDER BY pontos DESC", (err, rows) => {
    res.json(rows);
  });
});

// ===============================
// ADICIONAR JOGO
// ===============================
app.post("/add-match", (req, res) => {
  const { equipa_casa, equipa_fora, jornada } = req.body;

  db.run(
    "INSERT INTO matches (equipa_casa, equipa_fora, jornada) VALUES (?, ?, ?)",
    [equipa_casa, equipa_fora, jornada],
    () => res.json({ status: "ok" })
  );
});

// ===============================
// LISTAR JOGOS
// ===============================
app.get("/matches", (req, res) => {
  db.all("SELECT * FROM matches ORDER BY jornada, id", (err, rows) => {
    res.json(rows);
  });
});

// ===============================
// ADICIONAR PROGNÓSTICO
// ===============================
app.post("/add-prediction", (req, res) => {
  const { player_id, match_id, palpite_casa, palpite_fora } = req.body;

  db.run(
    "INSERT INTO predictions (player_id, match_id, palpite_casa, palpite_fora) VALUES (?, ?, ?, ?)",
    [player_id, match_id, palpite_casa, palpite_fora],
    () => res.json({ status: "ok" })
  );
});

// ===============================
// LISTAR TODOS OS PROGNÓSTICOS
// ===============================
app.get("/all-predictions", (req, res) => {
  db.all("SELECT * FROM predictions", (err, rows) => {
    res.json(rows);
  });
});

// ===============================
// INSERIR RESULTADO DO JOGO
// ===============================
app.post("/result/:id", (req, res) => {
  const id = req.params.id;
  const { casa, fora } = req.body;

  db.run(
    "UPDATE matches SET golos_casa=?, golos_fora=?, processado=1 WHERE id=?",
    [casa, fora, id],
    () => {
      processarJogo(id, () => res.json({ status: "ok" }));
    }
  );
});

// ===============================
// FUNÇÃO DE PROCESSAMENTO DE JOGO
// ===============================
function processarJogo(matchId, callback) {
  db.get("SELECT * FROM matches WHERE id=?", [matchId], (err, match) => {
    if (!match || match.golos_casa === null) return callback();

    db.all("SELECT * FROM predictions WHERE match_id=?", [matchId], (err, preds) => {
      preds.forEach(p => {
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

        db.run("UPDATE players SET pontos = pontos + ? WHERE id=?", [pontos, p.player_id]);
      });

      callback();
    });
  });
}

// ===============================
// REPROCESSAR JOGO INDIVIDUAL
// ===============================
app.post("/reprocess/:id", (req, res) => {
  const id = req.params.id;

  db.run("UPDATE players SET pontos = 0", () => {
    db.all("SELECT id FROM matches WHERE processado=1", (err, jogos) => {
      function next(i) {
        if (i >= jogos.length) return res.json({ status: "ok" });
        processarJogo(jogos[i].id, () => next(i + 1));
      }
      next(0);
    });
  });
});

// ===============================
// REPROCESSAR TUDO
// ===============================
app.post("/recalculate-all", (req, res) => {
  db.run("UPDATE players SET pontos = 0", () => {
    db.all("SELECT id FROM matches WHERE processado=1", (err, jogos) => {
      function next(i) {
        if (i >= jogos.length) return res.json({ status: "ok" });
        processarJogo(jogos[i].id, () => next(i + 1));
      }
      next(0);
    });
  });
});

// ===============================
// REINICIAR PONTOS DE UM JOGO
// ===============================
app.post("/recalculate/:id", (req, res) => {
  const id = req.params.id;

  db.run("UPDATE players SET pontos = 0", () => {
    db.all("SELECT id FROM matches WHERE processado=1", (err, jogos) => {
      function next(i) {
        if (i >= jogos.length) return res.json({ status: "ok" });
        processarJogo(jogos[i].id, () => next(i + 1));
      }
      next(0);
    });
  });
});

// ===============================
// INICIAR SERVIDOR
// ===============================
app.listen(8080, () => {
  console.log("🚀 Server ON na porta 8080");
});
