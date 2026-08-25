const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const { MercadoPagoConfig, Preference } = require("mercadopago");

const app = express();

const PORT = process.env.PORT || 10000;

/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MERCADOPAGO_ACCESS_TOKEN =
    process.env.MERCADOPAGO_ACCESS_TOKEN;

const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    "https://josericardoricado-art.github.io/Repository-name-tradutor-ia/";


/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"]
    })
);

app.use(express.json({ limit: "20mb" }));


/* =========================================================
   OPENAI
========================================================= */

let openai = null;

if (OPENAI_API_KEY) {

    openai = new OpenAI({
        apiKey: OPENAI_API_KEY
    });

    console.log("OpenAI: configurada");

} else {

    console.log(
        "AVISO: OPENAI_API_KEY não configurada"
    );

}


/* =========================================================
   MERCADO PAGO
========================================================= */

let mercadoPagoClient = null;
let preferenceClient = null;

if (MERCADOPAGO_ACCESS_TOKEN) {

    mercadoPagoClient =
        new MercadoPagoConfig({
            accessToken:
                MERCADOPAGO_ACCESS_TOKEN
        });

    preferenceClient =
        new Preference(
            mercadoPagoClient
        );

    console.log(
        "Mercado Pago: configurado"
    );

} else {

    console.log(
        "AVISO: MERCADOPAGO_ACCESS_TOKEN não configurado"
    );

}


/* =========================================================
   HOME
========================================================= */

app.get("/", (req, res) => {

    res.json({
        status: "online",
        message:
            "Tradutor IA Backend funcionando!",
        service:
            "tradutor-ia-backend",
        openai:
            !!OPENAI_API_KEY,
        mercadoPago:
            !!MERCADOPAGO_ACCESS_TOKEN,
        version:
            "2.0.0"
    });

});


/* =========================================================
   HEALTH
========================================================= */

app.get("/health", (req, res) => {

    res.json({
        status: "ok",

        openai:
            !!OPENAI_API_KEY,

        mercadoPago:
            !!MERCADOPAGO_ACCESS_TOKEN,

        timestamp:
            new Date().toISOString()
    });

});


/* =========================================================
   TESTE DA OPENAI
========================================================= */

app.get("/api/status", (req, res) => {

    res.json({

        backend: "online",

        openai:
            !!OPENAI_API_KEY,

        mercadoPago:
            !!MERCADOPAGO_ACCESS_TOKEN,

        frontend:
            FRONTEND_URL

    });

});


/* =========================================================
   TRADUÇÃO
========================================================= */

app.post("/translate", async (req, res) => {

    try {

        if (!openai) {

            return res.status(500).json({
                error:
                    "OPENAI_API_KEY não configurada no Render."
            });

        }

        const {
            text,
            targetLanguage
        } = req.body;

        if (!text) {

            return res.status(400).json({
                error:
                    "Informe o texto para tradução."
            });

        }

        const language =
            targetLanguage ||
            "Portuguese";

        const response =
            await openai.responses.create({

                model:
                    "gpt-4o-mini",

                input:
                    `Traduza o texto abaixo para ${language}.
Retorne somente a tradução, sem explicações.

Texto:
${text}`

            });

        const translation =
            response.output_text || "";

        res.json({

            success: true,

            original:
                text,

            translation:
                translation,

            targetLanguage:
                language

        });

    } catch (error) {

        console.error(
            "Erro na tradução:",
            error
        );

        res.status(500).json({

            error:
                "Erro ao traduzir o texto.",

            details:
                error.message

        });

    }

});


/* =========================================================
   TRADUÇÃO + VOZ
========================================================= */

app.post(
    "/translate-and-speak",
    async (req, res) => {

        try {

            if (!openai) {

                return res.status(500).json({
                    error:
                        "OPENAI_API_KEY não configurada."
                });

            }

            const {
                text,
                targetLanguage,
                voice
            } = req.body;

            if (!text) {

                return res.status(400).json({
                    error:
                        "Informe o texto."
                });

            }

            const language =
                targetLanguage ||
                "Portuguese";

            const selectedVoice =
                voice ||
                "alloy";


            /* -------------------------
               TRADUÇÃO
            ------------------------- */

            const translationResponse =
                await openai.responses.create({

                    model:
                        "gpt-4o-mini",

                    input:
                        `Traduza o texto abaixo para ${language}.
Mantenha o significado natural para uma dublagem.
Retorne somente o texto traduzido.

Texto:
${text}`

                });

            const translation =
                translationResponse.output_text || "";


            /* -------------------------
               VOZ
            ------------------------- */

            const speech =
                await openai.audio.speech.create({

                    model:
                        "gpt-4o-mini-tts",

                    voice:
                        selectedVoice,

                    input:
                        translation,

                    format:
                        "mp3"

                });


            const buffer =
                Buffer.from(
                    await speech.arrayBuffer()
                );

            const audio =
                buffer.toString("base64");


            res.json({

                success: true,

                original:
                    text,

                translation:
                    translation,

                targetLanguage:
                    language,

                voice:
                    selectedVoice,

                mimeType:
                    "audio/mpeg",

                audio:
                    audio

            });

        } catch (error) {

            console.error(
                "Erro tradução/voz:",
                error
            );

            res.status(500).json({

                error:
                    "Erro ao traduzir e gerar voz.",

                details:
                    error.message

            });

        }

    }
);


/* =========================================================
   MERCADO PAGO
   CRIAR CHECKOUT
========================================================= */

app.post(
    "/api/checkout",
    async (req, res) => {

        try {

            if (!preferenceClient) {

                return res.status(500).json({

                    error:
                        "Mercado Pago não está configurado no Render."

                });

            }

            const {
                plan
            } = req.body;


            /* -------------------------
               PLANOS
            ------------------------- */

            const plans = {

                mensal: {

                    title:
                        "Keep Tradutor IA - Plano Mensal",

                    price:
                        100

                },

                premium: {

                    title:
                        "Keep Tradutor IA - Plano Premium",

                    price:
                        200

                }

            };


            const selectedPlan =
                plans[plan];


            if (!selectedPlan) {

                return res.status(400).json({

                    error:
                        "Plano inválido. Use mensal ou premium."

                });

            }


            /* -------------------------
               PREFERÊNCIA
            ------------------------- */

            const preferenceData = {

                body: {

                    items: [

                        {

                            id:
                                plan,

                            title:
                                selectedPlan.title,

                            quantity:
                                1,

                            currency_id:
                                "BRL",

                            unit_price:
                                selectedPlan.price

                        }

                    ],

                    back_urls: {

                        success:
                            `${FRONTEND_URL}?payment=success`,

                        failure:
                            `${FRONTEND_URL}?payment=failure`,

                        pending:
                            `${FRONTEND_URL}?payment=pending`

                    },

                    auto_return:
                        "approved",

                    external_reference:
                        `tradutor-ia-${plan}-${Date.now()}`

                }

            };


            const response =
                await preferenceClient.create(
                    preferenceData
                );


            console.log(
                "Preferência Mercado Pago criada:",
                response.id
            );


            res.json({

                success: true,

                preferenceId:
                    response.id,

                init_point:
                    response.init_point,

                sandbox_init_point:
                    response.sandbox_init_point,

                plan:
                    plan,

                price:
                    selectedPlan.price

            });

        } catch (error) {

            console.error(
                "Erro Mercado Pago:",
                error
            );

            res.status(500).json({

                error:
                    "Não foi possível criar o pagamento.",

                details:
                    error.message

            });

        }

    }
);


/* =========================================================
   VERIFICAR CONFIGURAÇÃO DO MERCADO PAGO
========================================================= */

app.get(
    "/api/mercadopago/status",
    (req, res) => {

        res.json({

            configured:
                !!MERCADOPAGO_ACCESS_TOKEN,

            message:
                MERCADOPAGO_ACCESS_TOKEN
                    ? "Mercado Pago configurado."
                    : "Configure MERCADOPAGO_ACCESS_TOKEN no Render."

        });

    }
);


/* =========================================================
   WEBHOOK MERCADO PAGO
========================================================= */

app.post(
    "/api/mercadopago/webhook",
    async (req, res) => {

        try {

            console.log(
                "Webhook Mercado Pago:",
                JSON.stringify(
                    req.body,
                    null,
                    2
                )
            );

            /*
              Aqui futuramente vamos consultar
              o pagamento e liberar o plano
              do usuário somente quando estiver
              aprovado.
            */

            res.sendStatus(200);

        } catch (error) {

            console.error(
                "Erro webhook:",
                error
            );

            res.sendStatus(500);

        }

    }
);


/* =========================================================
   404
========================================================= */

app.use(
    (req, res) => {

        res.status(404).json({

            error:
                "Rota não encontrada.",

            path:
                req.path

        });

    }
);


/* =========================================================
   ERRO GERAL
========================================================= */

app.use(
    (error, req, res, next) => {

        console.error(
            "Erro geral:",
            error
        );

        res.status(500).json({

            error:
                "Erro interno do servidor."

        });

    }
);


/* =========================================================
   INICIAR SERVIDOR
========================================================= */

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "===================================="
        );

        console.log(
            "Keep Tradutor IA Backend"
        );

        console.log(
            `Servidor rodando na porta ${PORT}`
        );

        console.log(
            `Frontend: ${FRONTEND_URL}`
        );

        console.log(
            `OpenAI: ${
                OPENAI_API_KEY
                    ? "OK"
                    : "NÃO CONFIGURADA"
            }`
        );

        console.log(
            `Mercado Pago: ${
                MERCADOPAGO_ACCESS_TOKEN
                    ? "OK"
                    : "NÃO CONFIGURADO"
            }`
        );

        console.log(
            "===================================="

        );

    }
);
