const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

let players = [];
let matches = [];
let predictions = [];

// adicionar jogador
app.post("/add-player", (req, res) => {
  const { nome } = req.body;
  players.push({ id: players.length + 1, nome, pontos: 0 });
  res.send("ok");
});

// adicionar jogo
app.post("/add-match", (req, res) => {
  const { casa, fora } = req.body;
  matches.push({
    id: matches.length + 1,
    casa,
    fora,
    resultado: null
  });
  res.send("ok");
});

// adicionar palpite
app.post("/add-prediction", (req, res) => {
  const { player_id, match_id, casa, fora } = req.body;

  predictions.push({
    player_id,
    match_id,
    casa,
    fora
  });

  res.send("ok");
});

// colocar resultado real e calcular pontos
app.post("/result/:id", (req, res) => {
  const { casa, fora } = req.body;

  const match = matches.find(m => m.id == req.params.id);
  match.resultado = { casa, fora };

  predictions.forEach(p => {
    if (p.match_id == match.id) {
      let pontos = 0;

      if (p.casa == casa && p.fora == fora) {
        pontos = 3;
      } else {
        const real =
          casa > fora ? "casa" :
          casa < fora ? "fora" : "empate";

        const palpite =
          p.casa > p.fora ? "casa" :
          p.casa < p.fora ? "fora" : "empate";

        if (real === palpite) pontos = 1;
      }

      const player = players.find(pl => pl.id == p.player_id);
      player.pontos += pontos;
    }
  });

  res.send("resultado atualizado");
});

// ranking
app.get("/ranking", (req, res) => {
  res.json(players.sort((a, b) => b.pontos - a.pontos));
});

app.listen(3000, () => {
  console.log("Servidor ON 🚀");
});
