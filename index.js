const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

app.use(express.json());
app.use(express.static("public"));

// Função para carregar JSON
function loadJSON(file) {
  const filePath = path.join(__dirname, "data", file);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// Função para gravar JSON
function saveJSON(file, data) {
  const filePath = path.join(__dirname, "data", file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/* ============================
   ENDPOINTS DOS JOGOS
============================ */

// Obter todos os jogos
app.get("/jogos", (req, res) => {
  const jogos = loadJSON("jogos.json");
  res.json(jogos);
});

// Criar jogo
app.post("/add-jogo", (req, res) => {
  const novoJogo = req.body;

  const jogos = loadJSON("jogos.json");
  jogos.push(novoJogo);

  saveJSON("jogos.json", jogos);

  res.json({ success: true });
});

// Apagar jogo
app.post("/delete-jogo", (req, res) => {
  const { index } = req.body;

  const jogos = loadJSON("jogos.json");

  if (index < 0 || index >= jogos.length) {
    return res.json({ success: false, message: "Índice inválido" });
  }

  jogos.splice(index, 1);
  saveJSON("jogos.json", jogos);

  res.json({ success: true });
});

/* ============================
   ENDPOINTS DA CLASSIFICAÇÃO
============================ */

app.get("/classificacao", (req, res) => {
  const tabela = loadJSON("classificacao.json");
  res.json(tabela);
});

/* ============================
   ENDPOINTS DOS PALPITES
============================ */

app.get("/palpites", (req, res) => {
  const palpites = loadJSON("palpites.json");
  res.json(palpites);
});

app.post("/add-palpite", (req, res) => {
  const novoPalpite = req.body;

  const palpites = loadJSON("palpites.json");
  palpites.push(novoPalpite);

  saveJSON("palpites.json", palpites);

  res.json({ success: true });
});

/* ============================
   INICIAR SERVIDOR
============================ */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor a correr na porta " + PORT);
});
