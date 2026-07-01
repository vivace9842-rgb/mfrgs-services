const express = require("express");
const path = require("path");

const app = express();

// Servir arquivos estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Rota principal da Landing Page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Exportar para o Vercel
module.exports = app;
