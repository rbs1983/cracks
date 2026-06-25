const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public")); // serve index.html e admin.html automaticamente

// ENDPOINT ROOT (evita erro 502 na Railway)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// POSTGRES CONNECTION
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// INIT DB
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      nome TEXT UNIQUE NOT NULL,
      pontos INT DEFAULT 0
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS matches (
      id SERIAL PRIMARY KEY,
      casa TEXT NOT NULL,
      fora TEXT NOT NULL,
      golos_casa INT,
      golos_fora INT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS predictions (
      id SERIAL PRIMARY KEY,
      player_id INT,
      match_id INT,
      palpite_casa INT,
      palpite_fora INT
    );
  `);

  // jogadores fixos
  const jogadores = [
    "André", "João", "Pedro",
    "Miguel", "Rui", "Carlos",
    "Bruno", "Tiago",
    "Mark", "Gabriel"
  ];

  for (let nome of jogadores) {
    await pool.query(
      "INSERT INTO players(nome) VALUES($1) ON CONFLICT DO NOTHING",
      [nome]
    );
  }

  console.log("✅ DB pronta");
}

// ROTAS

app.get("/players", async (req, res) => {
  const result = await pool.query("SELECT * FROM players");
  res.json(result.rows);
});

app.get("/ranking", async (req, res) => {
  const result = await pool.query(
    "SELECT nome, pontos FROM players ORDER BY pontos DESC"
  );
  res.json(result.rows);
});

app.get("/matches", async (req, res) => {
  const result = await pool.query("SELECT * FROM matches");
  res.json(result.rows);
});

app.post("/add-match", async (req, res) => {
  const { casa, fora } = req.body;

  await pool.query(
    "INSERT
