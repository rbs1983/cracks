const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

app.use(express.json());
app.use(express.static("public"));

function loadJSON(file) {
  const filePath = path.join(__dirname, "data", file);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveJSON(file, data) {
  const filePath = path.join(__dirname, "data", file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/* JOGOS */

app.get("/jogos", (req, res) => {
  const jogos = loadJSON("jogos.json");
  res.json(jogos);
});

app.post("/add-jogo", (req, res) => {
  const novoJogo = req.body;

  const jogos = loadJSON("jogos.json");
  jogos.push(novoJogo);

  saveJSON("jogos.json", jogos);

  res.json({ success: true });
});

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

/* PROGNÓSTICOS */

app.post("/add-prognostico", (req, res) => {
  const novo = req.body;

  const lista = loadJSON("prognosticos.json");
  lista.push(novo);

  saveJSON("prognosticos.json", lista);

  res.json({ success: true });
});

app.get("/prognosticos", (req, res) => {
  const lista = loadJSON("prognosticos.json");
  res.json(lista);
});

/* SERVIDOR */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor a correr na porta " + PORT);
});
