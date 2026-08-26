require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const Stripe = require("stripe");
const OpenAI = require("openai");
const path = require("path");
const fs = require("fs");

// =====================================================
// CONFIGURAÇÃO
// =====================================================

const app = express();

const PORT = process.env.PORT || 3000;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "https://josericardoricado-art.github.io/Repository-name-tradutor-ia/";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  "https://repository-name-tradutor-ia-0h2r.onrender.com";

// =====================================================
// CHAVES
// =====================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";

const STRIPE_WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET || "";

const MERCADOPAGO_ACCESS_TOKEN =
  process.env.MERCADOPAGO_ACCESS_TOKEN || "";

// =====================================================
// STRIPE PRICE IDS
// =====================================================

// R$100/mês
const STRIPE_PRICE_100 =
  process.env.STRIPE_PRICE_100 ||
  "price_1U8mAoP9zHRcVasofgpq69Nl";

// R$200/mês
const STRIPE_PRICE_200 =
  process.env.STRIPE_PRICE_200 ||
  "price_1SyfsQP9zHRcVasov83JjPRe";

// =====================================================
// MERCADO PAGO
// =====================================================

// Se você criar planos recorrentes no Mercado Pago,
// coloque os IDs aqui no Render:
//
// MERCADOPAGO_PLAN_100=ID_DO_PLANO_100
// MERCADOPAGO_PLAN_200=ID_DO_PLANO_200

const MERCADOPAGO_PLAN_100 =
  process.env.MERCADOPAGO_PLAN_100 || "";

const MERCADOPAGO_PLAN_200 =
  process.env.MERCADOPAGO_PLAN_200 || "";

// =====================================================
// OPENAI
// =====================================================

let openai = null;

if (OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: OPENAI_API_KEY
  });
}

// =====================================================
// STRIPE
// =====================================================

let stripe = null;

if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY);
}

// =====================================================
// MULTER
// =====================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

// =====================================================
// CORS
// =====================================================

app.use(
  cors({
    origin: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS"
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With"
    ]
  })
);

// =====================================================
// WEBHOOK STRIPE
// IMPORTANTE:
// Deve ficar ANTES do express.json()
// =====================================================

app.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!stripe) {
      return res.status(503).send("Stripe não configurado.");
    }

    let event;

    try {
      if (STRIPE_WEBHOOK_SECRET) {
        const signature = req.headers["stripe-signature"];

        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          STRIPE_WEBHOOK_SECRET
        );
      } else {
        event = JSON.parse(req.body.toString());
      }
    } catch (error) {
      console.error(
        "Erro no webhook Stripe:",
        error.message
      );

      return res.status(400).send(
        `Webhook Error: ${error.message}`
      );
    }

    console.log(
      "Stripe webhook:",
      event.type
    );

    try {
      switch (event.type) {
        // ---------------------------------------------
        // Checkout concluído
        // ---------------------------------------------

        case "checkout.session.completed": {
          const session = event.data.object;

          console.log(
            "Pagamento/assinatura Stripe concluída:",
            session.id
          );

          console.log(
            "Cliente:",
            session.customer_details?.email || "sem email"
          );

          break;
        }

        // ---------------------------------------------
        // Assinatura criada/atualizada
        // ---------------------------------------------

        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const subscription =
            event.data.object;

          console.log(
            "Assinatura Stripe:",
            subscription.id,
            subscription.status
          );

          break;
        }

        // ---------------------------------------------
        // Assinatura cancelada
        // ---------------------------------------------

        case "customer.subscription.deleted": {
          const subscription =
            event.data.object;

          console.log(
            "Assinatura cancelada:",
            subscription.id
          );

          break;
        }

        // ---------------------------------------------
        // Fatura paga
        // ---------------------------------------------

        case "invoice.paid": {
          const invoice =
            event.data.object;

          console.log(
            "Fatura Stripe paga:",
            invoice.id
          );

          break;
        }

        // ---------------------------------------------
        // Falha de pagamento
        // ---------------------------------------------

        case "invoice.payment_failed": {
          const invoice =
            event.data.object;

          console.log(
            "Pagamento Stripe falhou:",
            invoice.id
          );

          break;
        }

        default:
          console.log(
            "Evento Stripe não tratado:",
            event.type
          );
      }

      return res.json({
        received: true
      });
    } catch (error) {
      console.error(
        "Erro processando webhook Stripe:",
        error
      );

      return res.status(500).json({
        error: "Erro ao processar webhook."
      });
    }
  }
);

// =====================================================
// JSON
// =====================================================

app.use(
  express.json({
    limit: "10mb"
  })
);

// =====================================================
// FORM URL ENCODED
// =====================================================

app.use(
  express.urlencoded({
    extended: true
  })
);

// =====================================================
// LOG
// =====================================================

app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} ${req.method} ${req.originalUrl}`
  );

  next();
});

// =====================================================
// HOME / HEALTH
// =====================================================

app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "Tradutor IA Backend funcionando!",
    service: "tradutor-ia-backend",

    openai: Boolean(OPENAI_API_KEY),

    stripe: Boolean(STRIPE_SECRET_KEY),

    mercadoPago: Boolean(MERCADOPAGO_ACCESS_TOKEN),

    plans: {
      stripe100: STRIPE_PRICE_100,
      stripe200: STRIPE_PRICE_200,
      mercadoPago100: Boolean(MERCADOPAGO_PLAN_100),
      mercadoPago200: Boolean(MERCADOPAGO_PLAN_200)
    },

    version: "3.0.0"
  });
});

// =====================================================
// STATUS
// =====================================================

app.get("/api/status", (req, res) => {
  res.json({
    online: true,

    services: {
      openai: Boolean(OPENAI_API_KEY),
      stripe: Boolean(STRIPE_SECRET_KEY),
      mercadoPago: Boolean(MERCADOPAGO_ACCESS_TOKEN)
    },

    plans: {
      stripe: {
        100: STRIPE_PRICE_100,
        200: STRIPE_PRICE_200
      },

      mercadoPago: {
        100: Boolean(MERCADOPAGO_PLAN_100),
        200: Boolean(MERCADOPAGO_PLAN_200)
      }
    }
  });
});

// =====================================================
// PLANOS
// =====================================================

app.get("/api/plans", (req, res) => {
  res.json({
    success: true,

    plans: [
      {
        id: "basico",
        name: "Keep Tradutor Básico",
        price: 100,
        currency: "BRL",
        interval: "month",

        stripe: {
          available: Boolean(STRIPE_SECRET_KEY),
          priceId: STRIPE_PRICE_100
        },

        mercadoPago: {
          available: Boolean(MERCADOPAGO_ACCESS_TOKEN),
          planId: MERCADOPAGO_PLAN_100 || null
        }
      },

      {
        id: "premium",
        name: "Keep Tradutor Premium",
        price: 200,
        currency: "BRL",
        interval: "month",

        stripe: {
          available: Boolean(STRIPE_SECRET_KEY),
          priceId: STRIPE_PRICE_200
        },

        mercadoPago: {
          available: Boolean(MERCADOPAGO_ACCESS_TOKEN),
          planId: MERCADOPAGO_PLAN_200 || null
        }
      }
    ]
  });
});

// =====================================================
// STRIPE - CHECKOUT R$100
// =====================================================

app.post("/api/stripe/checkout/100", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: "Stripe não configurado no backend."
      });
    }

    const email =
      req.body?.email || undefined;

    const session =
      await stripe.checkout.sessions.create({
        mode: "subscription",

        line_items: [
          {
            price: STRIPE_PRICE_100,
            quantity: 1
          }
        ],

        customer_email: email,

        success_url:
          FRONTEND_URL +
          "?payment=success&provider=stripe&plan=100",

        cancel_url:
          FRONTEND_URL +
          "?payment=cancelled&provider=stripe",

        metadata: {
          plan: "100",
          product: "keep-tradutor"
        },

        subscription_data: {
          metadata: {
            plan: "100",
            product: "keep-tradutor"
          }
        }
      });

    return res.json({
      success: true,
      provider: "stripe",
      plan: 100,
      url: session.url,
      sessionId: session.id
    });
  } catch (error) {
    console.error(
      "Stripe R$100:",
      error
    );

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// STRIPE - CHECKOUT R$200
// =====================================================

app.post("/api/stripe/checkout/200", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: "Stripe não configurado no backend."
      });
    }

    const email =
      req.body?.email || undefined;

    const session =
      await stripe.checkout.sessions.create({
        mode: "subscription",

        line_items: [
          {
            price: STRIPE_PRICE_200,
            quantity: 1
          }
        ],

        customer_email: email,

        success_url:
          FRONTEND_URL +
          "?payment=success&provider=stripe&plan=200",

        cancel_url:
          FRONTEND_URL +
          "?payment=cancelled&provider=stripe",

        metadata: {
          plan: "200",
          product: "keep-tradutor"
        },

        subscription_data: {
          metadata: {
            plan: "200",
            product: "keep-tradutor"
          }
        }
      });

    return res.json({
      success: true,
      provider: "stripe",
      plan: 200,
      url: session.url,
      sessionId: session.id
    });
  } catch (error) {
    console.error(
      "Stripe R$200:",
      error
    );

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// STRIPE - CHECKOUT GENÉRICO
// =====================================================

app.post(
  "/api/stripe/checkout",
  async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({
          success: false,
          error: "Stripe não configurado."
        });
      }

      const plan =
        String(req.body?.plan || "");

      const email =
        req.body?.email || undefined;

      let priceId;

      if (plan === "100") {
        priceId = STRIPE_PRICE_100;
      } else if (plan === "200") {
        priceId = STRIPE_PRICE_200;
      } else {
        return res.status(400).json({
          success: false,
          error:
            "Plano inválido. Use 100 ou 200."
        });
      }

      const session =
        await stripe.checkout.sessions.create({
          mode: "subscription",

          line_items: [
            {
              price: priceId,
              quantity: 1
            }
          ],

          customer_email: email,

          success_url:
            FRONTEND_URL +
            `?payment=success&provider=stripe&plan=${plan}`,

          cancel_url:
            FRONTEND_URL +
            "?payment=cancelled&provider=stripe",

          metadata: {
            plan,
            product: "keep-tradutor"
          },

          subscription_data: {
            metadata: {
              plan,
              product: "keep-tradutor"
            }
          }
        });

      return res.json({
        success: true,
        url: session.url,
        sessionId: session.id,
        plan
      });
    } catch (error) {
      console.error(
        "Stripe checkout:",
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// =====================================================
// MERCADO PAGO - CRIAR ASSINATURA
// =====================================================

async function criarAssinaturaMercadoPago({
  plan,
  email
}) {
  if (!MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error(
      "MERCADOPAGO_ACCESS_TOKEN não configurado."
    );
  }

  let planId = "";

  let amount = 100;

  if (String(plan) === "100") {
    planId = MERCADOPAGO_PLAN_100;
    amount = 100;
  }

  if (String(plan) === "200") {
    planId = MERCADOPAGO_PLAN_200;
    amount = 200;
  }

  if (!["100", "200"].includes(String(plan))) {
    throw new Error(
      "Plano Mercado Pago inválido."
    );
  }

  // ---------------------------------------------------
  // Se você criou um plano recorrente no Mercado Pago
  // ---------------------------------------------------

  if (planId) {
    const response = await fetch(
      "https://api.mercadopago.com/preapproval",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,

          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          preapproval_plan_id: planId,

          reason:
            `Keep Tradutor - Plano R$${amount}/mês`,

          external_reference:
            `KEEP-${plan}-${Date.now()}`,

          payer_email: email,

          back_url:
            FRONTEND_URL,

          status: "pending"
        })
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message ||
        JSON.stringify(data)
      );
    }

    return data;
  }

  // ---------------------------------------------------
  // Se ainda não houver PLAN ID
  // ---------------------------------------------------
  //
  // Cria uma assinatura recorrente diretamente.
  //
  // Depois recomendamos criar os dois planos
  // oficiais no Mercado Pago.
  // ---------------------------------------------------

  const response = await fetch(
    "https://api.mercadopago.com/preapproval",
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,

        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        reason:
          `Keep Tradutor - Plano R$${amount}/mês`,

        external_reference:
          `KEEP-${plan}-${Date.now()}`,

        payer_email: email,

        auto_recurring: {
          frequency: 1,

          frequency_type: "months",

          transaction_amount: amount,

          currency_id: "BRL"
        },

        back_url:
          FRONTEND_URL,

        status: "pending"
      })
    }
  );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
      JSON.stringify(data)
    );
  }

  return data;
}

// =====================================================
// MERCADO PAGO - R$100
// =====================================================

app.post(
  "/api/mercadopago/checkout/100",
  async (req, res) => {
    try {
      const email =
        req.body?.email;

      if (!email) {
        return res.status(400).json({
          success: false,
          error:
            "Informe o email do cliente."
        });
      }

      const data =
        await criarAssinaturaMercadoPago({
          plan: "100",
          email
        });

      return res.json({
        success: true,
        provider: "mercadopago",
        plan: 100,

        id: data.id || null,

        url:
          data.init_point ||
          data.sandbox_init_point ||
          null,

        init_point:
          data.init_point ||
          null,

        sandbox_init_point:
          data.sandbox_init_point ||
          null,

        status:
          data.status || "pending"
      });
    } catch (error) {
      console.error(
        "Mercado Pago R$100:",
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// =====================================================
// MERCADO PAGO - R$200
// =====================================================

app.post(
  "/api/mercadopago/checkout/200",
  async (req, res) => {
    try {
      const email =
        req.body?.email;

      if (!email) {
        return res.status(400).json({
          success: false,
          error:
            "Informe o email do cliente."
        });
      }

      const data =
        await criarAssinaturaMercadoPago({
          plan: "200",
          email
        });

      return res.json({
        success: true,
        provider: "mercadopago",
        plan: 200,

        id: data.id || null,

        url:
          data.init_point ||
          data.sandbox_init_point ||
          null,

        init_point:
          data.init_point ||
          null,

        sandbox_init_point:
          data.sandbox_init_point ||
          null,

        status:
          data.status || "pending"
      });
    } catch (error) {
      console.error(
        "Mercado Pago R$200:",
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// =====================================================
// MERCADO PAGO - CHECKOUT GENÉRICO
// =====================================================

app.post(
  "/api/mercadopago/checkout",
  async (req, res) => {
    try {
      const plan =
        String(req.body?.plan || "");

      const email =
        req.body?.email;

      if (!email) {
        return res.status(400).json({
          success: false,
          error:
            "Informe o email."
        });
      }

      if (!["100", "200"].includes(plan)) {
        return res.status(400).json({
          success: false,
          error:
            "Plano inválido. Use 100 ou 200."
        });
      }

      const data =
        await criarAssinaturaMercadoPago({
          plan,
          email
        });

      return res.json({
        success: true,
        provider: "mercadopago",
        plan,

        id: data.id || null,

        url:
          data.init_point ||
          data.sandbox_init_point ||
          null,

        status:
          data.status || "pending"
      });
    } catch (error) {
      console.error(
        "Mercado Pago checkout:",
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// =====================================================
// MERCADO PAGO WEBHOOK
// =====================================================

app.post(
  "/webhook/mercadopago",
  async (req, res) => {
    try {
      console.log(
        "Mercado Pago webhook:",
        JSON.stringify(req.body)
      );

      const type =
        req.body?.type ||
        req.body?.topic;

      const dataId =
        req.body?.data?.id ||
        req.body?.id;

      // -----------------------------------------------
      // Quando receber uma notificação de assinatura,
      // podemos consultar a API do Mercado Pago.
      // -----------------------------------------------

      if (
        type === "subscription_preapproval" &&
        dataId &&
        MERCADOPAGO_ACCESS_TOKEN
      ) {
        const response =
          await fetch(
            `https://api.mercadopago.com/preapproval/${dataId}`,
            {
              headers: {
                Authorization:
                  `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`
              }
            }
          );

        const subscription =
          await response.json();

        console.log(
          "Status da assinatura Mercado Pago:",
          subscription.status
        );
      }

      return res.status(200).json({
        received: true
      });
    } catch (error) {
      console.error(
        "Mercado Pago webhook:",
        error
      );

      return res.status(200).json({
        received: true
      });
    }
  }
);

// =====================================================
// OPENAI - TRADUZIR TEXTO
// =====================================================

app.post(
  "/api/translate",
  async (req, res) => {
    try {
      if (!openai) {
        return res.status(503).json({
          success: false,
          error:
            "OPENAI_API_KEY não configurada."
        });
      }

      const text =
        String(req.body?.text || "").trim();

      const targetLanguage =
        String(
          req.body?.targetLanguage ||
          "Português"
        ).trim();

      const sourceLanguage =
        String(
          req.body?.sourceLanguage ||
          "automático"
        ).trim();

      if (!text) {
        return res.status(400).json({
          success: false,
          error:
            "Nenhum texto enviado."
        });
      }

      const response =
        await openai.responses.create({
          model:
            process.env.OPENAI_TEXT_MODEL ||
            "gpt-5-mini",

          input: `
Você é um tradutor profissional.

Traduza o texto abaixo para ${targetLanguage}.

Idioma de origem:
${sourceLanguage}

Regras:
- Preserve o significado.
- Não explique a tradução.
- Não coloque aspas.
- Mantenha nomes próprios.
- Mantenha números.
- Mantenha o tom natural da fala.

Texto:
${text}
          `
        });

      const translated =
        response.output_text?.trim() || "";

      return res.json({
        success: true,

        sourceLanguage,

        targetLanguage,

        original: text,

        translation: translated
      });
    } catch (error) {
      console.error(
        "Erro OpenAI tradução:",
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// =====================================================
// OPENAI - TRANSCRIÇÃO
// =====================================================

app.post(
  "/api/transcribe",
  upload.single("audio"),
  async (req, res) => {
    try {
      if (!openai) {
        return res.status(503).json({
          success: false,
          error:
            "OPENAI_API_KEY não configurada."
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error:
            "Arquivo de áudio não enviado."
        });
      }

      const filename =
        req.file.originalname ||
        "audio.webm";

      const tempDir =
        path.join(
          __dirname,
          "tmp"
        );

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, {
          recursive: true
        });
      }

      const filePath =
        path.join(
          tempDir,
          `${Date.now()}-${filename}`
        );

      fs.writeFileSync(
        filePath,
        req.file.buffer
      );

      try {
        const transcription =
          await openai.audio.transcriptions.create(
            {
              file:
                fs.createReadStream(filePath),

              model:
                process.env.OPENAI_TRANSCRIBE_MODEL ||
                "gpt-4o-mini-transcribe"
            }
          );

        return res.json({
          success: true,
          text:
            transcription.text || ""
        });
      } finally {
        try {
          fs.unlinkSync(filePath);
        } catch {}
      }
    } catch (error) {
      console.error(
        "Erro transcrição:",
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// =====================================================
// OPENAI - TRADUZIR ÁUDIO
// =====================================================
//
// Recebe:
// audio = arquivo
// targetLanguage = idioma desejado
//
// Retorna:
// texto original
// texto traduzido
//
// =====================================================

app.post(
  "/api/translate-audio",
  upload.single("audio"),
  async (req, res) => {
    try {
      if (!openai) {
        return res.status(503).json({
          success: false,
          error:
            "OPENAI_API_KEY não configurada."
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error:
            "Áudio não enviado."
        });
      }

      const targetLanguage =
        String(
          req.body?.targetLanguage ||
          "Português"
        );

      const sourceLanguage =
        String(
          req.body?.sourceLanguage ||
          "automático"
        );

      const filename =
        req.file.originalname ||
        "audio.webm";

      const tempDir =
        path.join(
          __dirname,
          "tmp"
        );

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, {
          recursive: true
        });
      }

      const filePath =
        path.join(
          tempDir,
          `${Date.now()}-${filename}`
        );

      fs.writeFileSync(
        filePath,
        req.file.buffer
      );

      try {
        // ---------------------------------------------
        // 1. TRANSCRIÇÃO
        // ---------------------------------------------

        const transcription =
          await openai.audio.transcriptions.create(
            {
              file:
                fs.createReadStream(filePath),

              model:
                process.env.OPENAI_TRANSCRIBE_MODEL ||
                "gpt-4o-mini-transcribe"
            }
          );

        const originalText =
          transcription.text?.trim() || "";

        if (!originalText) {
          return res.json({
            success: true,
            original: "",
            translation: "",
            audio: null
          });
        }

        // ---------------------------------------------
        // 2. TRADUÇÃO
        // ---------------------------------------------

        const translationResponse =
          await openai.responses.create({
            model:
              process.env.OPENAI_TEXT_MODEL ||
              "gpt-5-mini",

            input: `
Traduza para ${targetLanguage}.

Idioma de origem:
${sourceLanguage}

Não explique.
Não coloque aspas.
Retorne somente a tradução.

Texto:
${originalText}
            `
          });

        const translatedText =
          translationResponse.output_text?.trim() ||
          "";

        // ---------------------------------------------
        // 3. VOZ IA
        // ---------------------------------------------

        const speech =
          await openai.audio.speech.create({
            model:
              process.env.OPENAI_TTS_MODEL ||
              "gpt-4o-mini-tts",

            voice:
              process.env.OPENAI_TTS_VOICE ||
              "alloy",

            input:
              translatedText,

            response_format:
              "mp3"
          });

        const audioBuffer =
          Buffer.from(
            await speech.arrayBuffer()
          );

        const audioBase64 =
          audioBuffer.toString("base64");

        // ---------------------------------------------
        // 4. RETORNO
        // ---------------------------------------------

        return res.json({
          success: true,

          sourceLanguage,

          targetLanguage,

          original:
            originalText,

          translation:
            translatedText,

          audio: {
            mimeType:
              "audio/mpeg",

            base64:
              audioBase64,

            dataUrl:
              `data:audio/mpeg;base64,${audioBase64}`
          }
        });
      } finally {
        try {
          fs.unlinkSync(filePath);
        } catch {}
      }
    } catch (error) {
      console.error(
        "Erro tradução de áudio:",
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// =====================================================
// OPENAI - GERAR VOZ A PARTIR DE TEXTO
// =====================================================

app.post(
  "/api/speech",
  async (req, res) => {
    try {
      if (!openai) {
        return res.status(503).json({
          success: false,
          error:
            "OPENAI_API_KEY não configurada."
        });
      }

      const text =
        String(
          req.body?.text || ""
        ).trim();

      const voice =
        String(
          req.body?.voice ||
          process.env.OPENAI_TTS_VOICE ||
          "alloy"
        );

      if (!text) {
        return res.status(400).json({
          success: false,
          error:
            "Texto não enviado."
        });
      }

      const speech =
        await openai.audio.speech.create({
          model:
            process.env.OPENAI_TTS_MODEL ||
            "gpt-4o-mini-tts",

          voice,

          input: text,

          response_format:
            "mp3"
        });

      const buffer =
        Buffer.from(
          await speech.arrayBuffer()
        );

      res.setHeader(
        "Content-Type",
        "audio/mpeg"
      );

      res.setHeader(
        "Content-Length",
        buffer.length
      );

      return res.send(buffer);
    } catch (error) {
      console.error(
        "Erro TTS:",
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// =====================================================
// TESTE DE TRADUÇÃO
// =====================================================

app.get(
  "/api/test-translate",
  async (req, res) => {
    try {
      if (!openai) {
        return res.status(503).json({
          success: false,
          error:
            "OPENAI_API_KEY não configurada."
        });
      }

      const response =
        await openai.responses.create({
          model:
            process.env.OPENAI_TEXT_MODEL ||
            "gpt-5-mini",

          input:
            "Traduza para português: Hello, how are you?"
        });

      return res.json({
        success: true,
        translation:
          response.output_text
      });
    } catch (error) {
      console.error(
        "Teste OpenAI:",
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// =====================================================
// 404
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint não encontrado.",
    path: req.originalUrl
  });
});

// =====================================================
// ERRO GLOBAL
// =====================================================

app.use(
  (error, req, res, next) => {
    console.error(
      "Erro global:",
      error
    );

    res.status(500).json({
      success: false,
      error:
        error.message ||
        "Erro interno do servidor."
    });
  }
);

// =====================================================
// INICIAR SERVIDOR
// =====================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      "=========================================="
    );

    console.log(
      "🚀 TRADUTOR IA BACKEND ONLINE"
    );

    console.log(
      `🌐 Porta: ${PORT}`
    );

    console.log(
      `🔗 Backend: ${BACKEND_URL}`
    );

    console.log(
      `🌎 Frontend: ${FRONTEND_URL}`
    );

    console.log(
      `🤖 OpenAI: ${
        OPENAI_API_KEY
          ? "CONFIGURADA"
          : "NÃO CONFIGURADA"
      }`
    );

    console.log(
      `💳 Stripe: ${
        STRIPE_SECRET_KEY
          ? "CONFIGURADO"
          : "NÃO CONFIGURADO"
      }`
    );

    console.log(
      `💰 Mercado Pago: ${
        MERCADOPAGO_ACCESS_TOKEN
          ? "CONFIGURADO"
          : "NÃO CONFIGURADO"
      }`
    );

    console.log(
      `💵 Stripe R$100: ${STRIPE_PRICE_100}`
    );

    console.log(
      `💵 Stripe R$200: ${STRIPE_PRICE_200}`
    );

    console.log(
      "=========================================="
    );
  }
);
