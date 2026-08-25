const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    online: true,
    message: "Keep - Tradutor Universal",
    status: "Backend funcionando"
  });
});

app.get("/status", (req, res) => {
  res.json({
    server: "online",
    mercadoPago: process.env.MP_ACCESS_TOKEN
      ? "configurado"
      : "não configurado"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
