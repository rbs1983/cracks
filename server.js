const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

let players = [];

// adicionar jogador
app.post("/add-player", (req, res) => {
  const { nome } = req.body;
  players.push({ nome, pontos: 0 });
  res.send("ok");
});

// ranking
app.get("/ranking", (req, res) => {
  res.json(players.sort((a, b) => b.pontos - a.pontos));
});

app.listen(3000, () => {
  console.log("Servidor ON 🚀");
});
