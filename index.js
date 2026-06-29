const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

app.use(express.json());
app.use(express.static("public"));

/* ============================
   FUNÇÕES PARA JSON
============================ */

function loadJSON(file) {
  const filePath = path.join(__dirname, "data", file);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveJSON(file, data) {
  const filePath = path.join(__dirname, "data", file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/* ============================
   ENDPOINTS — JOGOS
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

// Atualizar resultado do jogo
app.post("/update-resultado", (req, res) => {
  const { jornada, casa, fora, golosCasa, golosFora } = req.body;

  const jogos = loadJSON("jogos.json");

  const index = jogos.findIndex(j =>
    j.jornada === jornada &&
    j.casa === casa &&
    j.fora === fora
  );

  if (index === -1) {
    return res.json({ success: false, message: "Jogo não encontrado" });
  }

  jogos[index].golosCasa = golosCasa;
  jogos[index].golosFora = golosFora;

  saveJSON("jogos.json", jogos);

  res.json({ success: true });
});

/* ============================
   ENDPOINTS — PROGNÓSTICOS
============================ */

// Guardar prognóstico
app.post("/add-prognostico", (req, res) => {
  const novo = req.body;

  const lista = loadJSON("prognosticos.json");
  lista.push(novo);

  saveJSON("prognosticos.json", lista);

  res.json({ success: true });
});

// Obter prognósticos
app.get("/prognosticos", (req, res) => {
  const lista = loadJSON("prognosticos.json");
  res.json(lista);
});

/* ============================
   ENDPOINTS — CLASSIFICAÇÃO
============================ */

app.get("/classificacao", (req, res) => {
  const tabela = loadJSON("classificacao.json");
  res.json(tabela);
});

/* ============================
   ENDPOINTS — PALPITES (se precisares)
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
