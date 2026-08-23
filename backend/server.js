// ============================================================
// TRADUTOR IA - BACKEND
// server.js
// Node.js + Express + OpenAI
// ============================================================

const express = require("express");
const cors = require("cors");

// ------------------------------------------------------------
// OpenAI
// ------------------------------------------------------------
const OpenAI = require("openai");

// ------------------------------------------------------------
// Configuração
// ------------------------------------------------------------

const app = express();

const PORT = Number(process.env.PORT) || 10000;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ------------------------------------------------------------
// Cliente OpenAI
// ------------------------------------------------------------

let openai = null;

if (OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: OPENAI_API_KEY
    });
}

// ------------------------------------------------------------
// Middlewares
// ------------------------------------------------------------

app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"]
    })
);

app.use(
    express.json({
        limit: "25mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "25mb"
    })
);

// ------------------------------------------------------------
// Logs
// ------------------------------------------------------------

app.use((req, res, next) => {
    console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
    );

    next();
});

// ============================================================
// HOME
// ============================================================

app.get("/", (req, res) => {
    res.json({
        status: "online",
        message: "Tradutor IA Backend funcionando!",
        openai: !!OPENAI_API_KEY,
        service: "tradutor-ia-backend",
        version: "1.0.0"
    });
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        server: "online",
        openai: !!OPENAI_API_KEY,
        timestamp: new Date().toISOString()
    });
});

// ============================================================
// STATUS DA API
// ============================================================

app.get("/api/status", (req, res) => {
    res.json({
        online: true,
        openai_configurada: !!OPENAI_API_KEY,
        openai_cliente: !!openai,
        timestamp: new Date().toISOString()
    });
});

// ============================================================
// TRADUÇÃO DE TEXTO
// POST /translate
//
// Exemplo:
//
// {
//   "text": "Hello, how are you?",
//   "targetLanguage": "Portuguese"
// }
// ============================================================

app.post("/translate", async (req, res) => {
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
                error: "OPENAI_API_KEY não configurada no Render."
            });
        }

        console.log("Texto recebido para tradução:");
        console.log(text);

        console.log("Idioma de destino:", targetLanguage);

        // ----------------------------------------------------
        // Tradução
        // ----------------------------------------------------

        const response = await openai.responses.create({
            model: "gpt-5-mini",
            input: [
                {
                    role: "system",
                    content:
                        `Você é um tradutor profissional de áudio e vídeo.
Traduza o texto para ${targetLanguage}.
Mantenha o significado original.
Não explique a tradução.
Retorne somente o texto traduzido.`
                },
                {
                    role: "user",
                    content: text
                }
            ]
        });

        const translation = response.output_text;

        return res.json({
            success: true,
            original: text,
            translation: translation,
            targetLanguage: targetLanguage
        });

    } catch (error) {

        console.error("ERRO NA TRADUÇÃO:");
        console.error(error);

        return res.status(500).json({
            success: false,
            error: "Erro ao traduzir o texto.",
            details:
                process.env.NODE_ENV === "production"
                    ? undefined
                    : error.message
        });
    }
});

// ============================================================
// GERAÇÃO DE VOZ
//
// POST /speech
//
// Exemplo:
//
// {
//   "text": "Olá, pessoal!",
//   "voice": "alloy"
// }
//
// Retorna áudio em base64.
// ============================================================

app.post("/speech", async (req, res) => {

    try {

        const { text, voice = "alloy" } = req.body;

        if (!text) {
            return res.status(400).json({
                error: "Texto para voz não informado."
            });
        }

        if (!openai) {
            return res.status(500).json({
                error: "OPENAI_API_KEY não configurada no Render."
            });
        }

        console.log("Gerando voz:");

        console.log(text);

        // ----------------------------------------------------
        // Geração do áudio
        // ----------------------------------------------------

        const speech = await openai.audio.speech.create({
            model: "gpt-4o-mini-tts",
            voice: voice,
            input: text,
            format: "mp3"
        });

        const buffer = Buffer.from(
            await speech.arrayBuffer()
        );

        const audioBase64 = buffer.toString("base64");

        return res.json({
            success: true,
            audio: audioBase64,
            mimeType: "audio/mpeg"
        });

    } catch (error) {

        console.error("ERRO AO GERAR VOZ:");
        console.error(error);

        return res.status(500).json({
            success: false,
            error: "Erro ao gerar o áudio.",
            details:
                process.env.NODE_ENV === "production"
                    ? undefined
                    : error.message
        });
    }
});

// ============================================================
// TRADUZIR + GERAR VOZ
//
// POST /translate-and-speak
//
// Esse será um dos principais endpoints do aplicativo.
//
// Exemplo:
//
// {
//   "text": "Hello everyone",
//   "targetLanguage": "Portuguese",
//   "voice": "alloy"
// }
// ============================================================

app.post("/translate-and-speak", async (req, res) => {

    try {

        const {
            text,
            targetLanguage,
            voice = "alloy"
        } = req.body;

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
                error: "OPENAI_API_KEY não configurada no Render."
            });
        }

        console.log("=================================");
        console.log("TRADUZIR + GERAR VOZ");
        console.log("=================================");

        // ----------------------------------------------------
        // 1. Traduz
        // ----------------------------------------------------

        const translationResponse =
            await openai.responses.create({

                model: "gpt-5-mini",

                input: [
                    {
                        role: "system",
                        content:
                            `Você é um tradutor profissional.
Traduza para ${targetLanguage}.
Retorne somente a tradução.
Não adicione explicações.`
                    },
                    {
                        role: "user",
                        content: text
                    }
                ]
            });

        const translation =
            translationResponse.output_text;

        console.log("Tradução:");
        console.log(translation);

        // ----------------------------------------------------
        // 2. Gera a voz
        // ----------------------------------------------------

        const speech =
            await openai.audio.speech.create({

                model: "gpt-4o-mini-tts",

                voice: voice,

                input: translation,

                format: "mp3"
            });

        const buffer =
            Buffer.from(
                await speech.arrayBuffer()
            );

        const audioBase64 =
            buffer.toString("base64");

        // ----------------------------------------------------
        // 3. Retorna tudo
        // ----------------------------------------------------

        return res.json({

            success: true,

            original: text,

            translation: translation,

            targetLanguage: targetLanguage,

            audio: audioBase64,

            mimeType: "audio/mpeg"
        });

    } catch (error) {

        console.error(
            "ERRO EM /translate-and-speak:"
        );

        console.error(error);

        return res.status(500).json({

            success: false,

            error:
                "Não foi possível traduzir e gerar a voz.",

            details:
                process.env.NODE_ENV === "production"
                    ? undefined
                    : error.message
        });
    }
});

// ============================================================
// TRANSCRIÇÃO DE ÁUDIO
//
// POST /transcribe
//
// Futuramente o index.html poderá enviar pequenos trechos
// de áudio capturados do vídeo para este endpoint.
//
// O áudio deverá ser enviado como arquivo multipart/form-data
// com o campo "audio".
// ============================================================

const multer = require("multer");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024
    }
});

app.post(
    "/transcribe",
    upload.single("audio"),
    async (req, res) => {

        try {

            if (!req.file) {
                return res.status(400).json({
                    error: "Nenhum arquivo de áudio enviado."
                });
            }

            if (!openai) {
                return res.status(500).json({
                    error:
                        "OPENAI_API_KEY não configurada no Render."
                });
            }

            console.log(
                "Áudio recebido:",
                req.file.originalname
            );

            // ------------------------------------------------
            // Criar arquivo temporário
            // ------------------------------------------------

            const fs = require("fs");
            const os = require("os");
            const path = require("path");

            const tempFile = path.join(
                os.tmpdir(),
                `audio-${Date.now()}-${req.file.originalname}`
            );

            fs.writeFileSync(
                tempFile,
                req.file.buffer
            );

            // ------------------------------------------------
            // Transcrição
            // ------------------------------------------------

            const transcription =
                await openai.audio.transcriptions.create({

                    file: fs.createReadStream(tempFile),

                    model: "gpt-4o-mini-transcribe"
                });

            // ------------------------------------------------
            // Apagar arquivo temporário
            // ------------------------------------------------

            try {
                fs.unlinkSync(tempFile);
            } catch (e) {
                console.log(
                    "Não foi possível apagar arquivo temporário."
                );
            }

            return res.json({

                success: true,

                text: transcription.text
            });

        } catch (error) {

            console.error(
                "ERRO NA TRANSCRIÇÃO:"
            );

            console.error(error);

            return res.status(500).json({

                success: false,

                error:
                    "Erro ao transcrever o áudio.",

                details:
                    process.env.NODE_ENV === "production"
                        ? undefined
                        : error.message
            });
        }
    }
);

// ============================================================
// TRADUÇÃO DE TRANSCRIÇÃO
//
// POST /translate-transcription
// ============================================================

app.post(
    "/translate-transcription",
    async (req, res) => {

        try {

            const {
                text,
                targetLanguage
            } = req.body;

            if (!text) {
                return res.status(400).json({
                    error: "Transcrição não informada."
                });
            }

            if (!targetLanguage) {
                return res.status(400).json({
                    error:
                        "Idioma de destino não informado."
                });
            }

            if (!openai) {
                return res.status(500).json({
                    error:
                        "OPENAI_API_KEY não configurada."
                });
            }

            const response =
                await openai.responses.create({

                    model: "gpt-5-mini",

                    input: [
                        {
                            role: "system",

                            content:
                                `Traduza o texto abaixo para ${targetLanguage}.
Retorne somente a tradução.
Preserve o sentido e o contexto da fala.`
                        },
                        {
                            role: "user",
                            content: text
                        }
                    ]
                });

            return res.json({

                success: true,

                original: text,

                translation:
                    response.output_text,

                targetLanguage:
                    targetLanguage
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                success: false,

                error:
                    "Erro ao traduzir a transcrição."
            });
        }
    }
);

// ============================================================
// 404
// ============================================================

app.use((req, res) => {

    res.status(404).json({

        success: false,

        error: "Endpoint não encontrado.",

        path: req.originalUrl
    });
});

// ============================================================
// TRATAMENTO GLOBAL DE ERROS
// ============================================================

app.use((error, req, res, next) => {

    console.error(
        "ERRO GLOBAL:",
        error
    );

    res.status(500).json({

        success: false,

        error: "Erro interno do servidor."
    });
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log("");
        console.log(
            "=========================================="
        );

        console.log(
            "      TRADUTOR IA BACKEND ONLINE"
        );

        console.log(
            "=========================================="
        );

        console.log(
            `PORTA: ${PORT}`
        );

        console.log(
            "HOST: 0.0.0.0"
        );

        console.log(
            `OPENAI: ${
                OPENAI_API_KEY
                    ? "CONFIGURADA"
                    : "NÃO CONFIGURADA"
            }`
        );

        console.log(
            "=========================================="
        );

        console.log("");
    }
);
