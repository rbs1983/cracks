const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Servir ficheiros estáticos
app.use(express.static(path.join(__dirname, "public")));

// Healthcheck (Railway usa isto para confirmar que o servidor está vivo)
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Rotas da API
app.get("/", (req, res) => {
  res.send("API da Liga Portuguesa está online!");
});

app.get("/classificacao", (req, res) => {
  res.json({ secao: "Classificação" });
});

app.get("/jogos", (req, res) => {
  res.json({ secao: "Jogos" });
});

app.get("/palpites", (req, res) => {
  res.json({ secao: "Palpites" });
});

// Porta obrigatória para Railway
const PORT = process.env.PORT || 3000;

// Bind explícito para 0.0.0.0 (ESSENCIAL no Railway)
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});
app.get("/classificacao", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM classificacao_jogadores ORDER BY pontos_totais DESC, acertos_exatos DESC;"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao obter classificação' });
  }
});
