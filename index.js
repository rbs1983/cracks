const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// Servir a pasta public
app.use(express.static(path.join(__dirname, "public")));

// Função para carregar JSON
function loadJSON(file) {
  const filePath = path.join(__dirname, "data", file);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// Função para guardar JSON
function saveJSON(file, data) {
  const filePath = path.join(__dirname, "data", file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// -----------------------------
// ROTAS GET
// -----------------------------

app.get("/classificacao", (req, res) => {
  res.json(loadJSON("classificacao.json"));
});

app.get("/jogos", (req, res) => {
  res.json(loadJSON("jogos.json"));
});

app.get("/palpites", (req, res) => {
  res.json(loadJSON("palpites.json"));
});

// -----------------------------
// ROTAS POST
// -----------------------------

// Criar jogo (sem golos)
app.post("/add-jogo", (req, res) => {
  const jogos = loadJSON("jogos.json");

  const novoJogo = {
    casa: req.body.casa,
    fora: req.body.fora
  };

  jogos.push(novoJogo);
  saveJSON("jogos.json", jogos);

  res.json({ message: "Jogo criado!", jogo: novoJogo });
});

// Adicionar palpite
app.post("/add-palpite", (req, res) => {
  const palpites = loadJSON("palpites.json");

  const novoPalpite = {
    jogo: req.body.jogo,
    user: req.body.user,
    palpite: req.body.palpite,
    pontos: req.body.pontos
  };

  palpites.push(novoPalpite);
  saveJSON("palpites.json", palpites);

  res.json({ message: "Palpite adicionado!", palpite: novoPalpite });
});

// Atualizar classificação
app.post("/add-classificacao", (req, res) => {
  const classificacao = loadJSON("classificacao.json");

  const novaEquipa = {
    pos: req.body.pos,
    nome: req.body.nome,
    pontos: req.body.pontos
  };

  const index = classificacao.findIndex(e => e.pos === novaEquipa.pos);

  if (index >= 0) {
    classificacao[index] = novaEquipa;
  } else {
    classificacao.push(novaEquipa);
  }

  classificacao.sort((a, b) => a.pos - b.pos);

  saveJSON("classificacao.json", classificacao);

  res.json({ message: "Classificação atualizada!", equipa: novaEquipa });
});

// -----------------------------
// PORTA
// -----------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("API ativa na porta " + PORT);
});
