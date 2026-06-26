const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const db = new sqlite3.Database("database.db");

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

app.get("/players", (req, res) => {
  db.all("SELECT * FROM players ORDER BY pontos DESC", (err, rows) => {
    res.json(rows);
  });
});

app.post("/add-player", (req, res) => {
  db.run("INSERT INTO players (nome) VALUES (?)", [req.body.nome]);
  res.json({ status: "ok" });
});

app.post("/add-match", (req, res) => {
  db.run(
    "INSERT INTO matches (equipa_casa, equipa_fora) VALUES (?, ?)",
    [req.body.equipa_casa, req.body.equipa_fora]
  );
  res.json({ status: "ok" });
});

app.get("/matches", (req, res) => {
  db.all("SELECT * FROM matches", (err, rows) => {
    res.json(rows);
  });
});

app.post("/add-prediction", (req, res) => {
  const { player_id, match_id, palpite_casa, palpite_fora } = req.body;

  db.get(
    "SELECT id FROM predictions WHERE player_id=? AND match_id=?",
    [player_id, match_id],
    (err, row) => {
      if (row) {
        db.run(
          "UPDATE predictions SET palpite_casa=?, palpite_fora=? WHERE id=?",
          [palpite_casa, palpite_fora, row.id]
        );
        return res.json({ status: "updated" });
      }

      db.run(
        "INSERT INTO predictions (player_id, match_id, palpite_casa, palpite_fora) VALUES (?, ?, ?, ?)",
        [player_id, match_id, palpite_casa, palpite_fora]
      );
      res.json({ status: "inserted" });
    }
  );
});

app.get("/all-predictions", (req, res) => {
  db.all("SELECT * FROM predictions", (err, rows) => {
    res.json(rows);
  });
});

app.post("/result/:id", (req, res) => {
  const { casa, fora } = req.body;

  db.run(
    "UPDATE matches SET golos_casa=?, golos_fora=?, processado=1 WHERE id=?",
    [casa, fora, req.params.id]
  );

  processarJogo(req.params.id);
  res.json({ status: "ok" });
});

function processarJogo(id) {
  db.get("SELECT * FROM matches WHERE id=?", [id], (err, match) => {
    if (!match || match.golos_casa === null) return;

    db.all("SELECT * FROM predictions WHERE match_id=?", [id], (err, preds) => {
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

        db.run("UPDATE players SET pontos = pontos + ? WHERE id=?", [
          pontos,
          p.player_id
        ]);
      });
    });
  });
}

app.listen(8080, () => console.log("Server ON"));
