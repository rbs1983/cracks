const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// dados em memória
let players = [
  { nome: "João", pontos: 3 },
  { nome: "Pedro", pontos: 1 },
  { nome: "Miguel", pontos: 5 }
];

// rota ranking
app.get("/ranking", (req, res) => {
  res.json(players.sort((a, b) => b.pontos - a.pontos));
});

app.listen(3000, () => {
  console.log("Servidor ON 🚀");
});
