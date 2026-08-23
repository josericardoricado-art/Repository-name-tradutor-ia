const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

const PORT = process.env.PORT || 10000;

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "10mb" }));

// ===============================
// OPENAI
// ===============================

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("ERRO: OPENAI_API_KEY não foi configurada no Render.");
} else {
  console.log("OPENAI_API_KEY encontrada.");
}

const openai = apiKey
  ? new OpenAI({ apiKey })
  : null;

// ===============================
// TESTE DO SERVIDOR
// ===============================

app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "Tradutor IA Backend funcionando!",
    openai: !!apiKey
  });
});

// ===============================
// HEALTH CHECK
// ===============================

app.get("/health", (req, res) => {
  res.json({
    status: "ok"
  });
});

// ===============================
// TRADUÇÃO
// ===============================

app.post("/api/translate", async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;

    if (!text) {
      return res.status(400).json({
        error: "Texto não informado."
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({
        error: "Idioma de destino não informado."
      });
    }

    if (!openai) {
      return res.status(500).json({
        error: "OPENAI_API_KEY não configurada no servidor."
      });
    }

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "Você é um tradutor profissional. Traduza o texto mantendo o sentido original. Não explique a tradução. Retorne somente o texto traduzido."
        },
        {
          role: "user",
          content: `Traduza para ${targetLanguage}:\n\n${text}`
        }
      ]
    });

    const translatedText = response.output_text;

    res.json({
      success: true,
      translation: translatedText
    });

  } catch (error) {
    console.error("Erro na tradução:", error);

    res.status(500).json({
      success: false,
      error: "Erro ao realizar a tradução."
    });
  }
});

// ===============================
// INICIAR SERVIDOR
// ===============================

app.listen(PORT, "0.0.0.0", () => {
  console.log("=================================");
  console.log("TRADUTOR IA BACKEND ONLINE");
  console.log(`Porta: ${PORT}`);
  console.log("=================================");
});
