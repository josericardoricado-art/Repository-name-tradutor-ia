// ============================================================
// TRADUTOR IA - BACKEND COMPLETO
// OpenAI + Stripe + Mercado Pago
// Tradução de áudio + geração de voz
// Planos: R$100 e R$200 por mês
// ============================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const Stripe = require("stripe");
const OpenAI = require("openai");

const app = express();

// ============================================================
// CONFIGURAÇÕES
// ============================================================

const PORT = process.env.PORT || 3000;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "https://josericardoricado-art.github.io/Repository-name-tradutor-ia";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  "https://repository-name-tradutor-ia-0h2r.onrender.com";

// ============================================================
// OPENAI
// ============================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = OPENAI_API_KEY
  ? new OpenAI({
      apiKey: OPENAI_API_KEY,
    })
  : null;

// Modelos
const OPENAI_TEXT_MODEL =
  process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";

const OPENAI_TRANSCRIBE_MODEL =
  process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";

const OPENAI_TTS_MODEL =
  process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";

const OPENAI_TTS_VOICE =
  process.env.OPENAI_TTS_VOICE || "alloy";

// ============================================================
// STRIPE
// ============================================================

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY)
  : null;

// Seus Price IDs
const STRIPE_PRICE_100 =
  process.env.STRIPE_PRICE_100 ||
  "price_1U8mAoP9zHRcVasofgpq69Nl";

const STRIPE_PRICE_200 =
  process.env.STRIPE_PRICE_200 ||
  "price_1SyfsQP9zHRcVasov83JjPRe";

// ============================================================
// MERCADO PAGO
// ============================================================

const MERCADO_PAGO_ACCESS_TOKEN =
  process.env.MERCADO_PAGO_ACCESS_TOKEN;

const MERCADO_PAGO_PLAN_100 =
  process.env.MERCADO_PAGO_PLAN_100 || "";

const MERCADO_PAGO_PLAN_200 =
  process.env.MERCADO_PAGO_PLAN_200 || "";

// ============================================================
// MULTER
// ============================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

// ============================================================
// CORS
// ============================================================

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ============================================================
// STRIPE WEBHOOK
// IMPORTANTE:
// Deve ficar ANTES do express.json()
// ============================================================

app.post(
  "/webhook/stripe",
  express.raw({
    type: "application/json",
  }),
  async (req, res) => {
    if (!stripe) {
      return res.status(503).json({
        error: "Stripe não configurado",
      });
    }

    const signature = req.headers["stripe-signature"];

    if (!signature) {
      return res.status(400).json({
        error: "Stripe signature ausente",
      });
    }

    try {
      const webhookSecret =
        process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error(
          "STRIPE_WEBHOOK_SECRET não configurado"
        );

        return res.status(500).json({
          error: "Webhook Stripe não configurado",
        });
      }

      const event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret
      );

      console.log(
        "Stripe webhook:",
        event.type
      );

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;

          console.log(
            "Pagamento/assinatura Stripe concluído:",
            session.id
          );

          console.log(
            "Cliente:",
            session.customer
          );

          console.log(
            "Subscription:",
            session.subscription
          );

          break;
        }

        case "customer.subscription.updated": {
          const subscription =
            event.data.object;

          console.log(
            "Assinatura atualizada:",
            subscription.id
          );

          break;
        }

        case "customer.subscription.deleted": {
          const subscription =
            event.data.object;

          console.log(
            "Assinatura cancelada:",
            subscription.id
          );

          break;
        }

        case "invoice.paid": {
          const invoice =
            event.data.object;

          console.log(
            "Fatura paga:",
            invoice.id
          );

          break;
        }

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
            "Evento Stripe recebido:",
            event.type
          );
      }

      return res.json({
        received: true,
      });
    } catch (error) {
      console.error(
        "Erro webhook Stripe:",
        error.message
      );

      return res.status(400).json({
        error: "Webhook Stripe inválido",
      });
    }
  }
);

// ============================================================
// JSON
// ============================================================

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function getPlan(plan) {
  if (
    plan === "100" ||
    plan === "plano100" ||
    plan === "basic"
  ) {
    return {
      id: "100",
      name: "Plano R$100",
      amount: 100,
      stripePrice: STRIPE_PRICE_100,
      mercadoPagoPlan:
        MERCADO_PAGO_PLAN_100,
    };
  }

  if (
    plan === "200" ||
    plan === "plano200" ||
    plan === "premium"
  ) {
    return {
      id: "200",
      name: "Plano R$200",
      amount: 200,
      stripePrice: STRIPE_PRICE_200,
      mercadoPagoPlan:
        MERCADO_PAGO_PLAN_200,
    };
  }

  return null;
}

function normalizeLanguage(language) {
  if (!language) {
    return "Português";
  }

  return String(language).trim();
}

// ============================================================
// ROTA PRINCIPAL
// ============================================================

app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "Tradutor IA Backend funcionando!",
    service: "tradutor-ia-backend",

    openai: !!OPENAI_API_KEY,

    stripe: !!STRIPE_SECRET_KEY,

    mercadoPago: !!MERCADO_PAGO_ACCESS_TOKEN,

    plans: {
      plano100: {
        amount: 100,
        currency: "BRL",
        interval: "month",
        stripePrice: STRIPE_PRICE_100,
      },

      plano200: {
        amount: 200,
        currency: "BRL",
        interval: "month",
        stripePrice: STRIPE_PRICE_200,
      },
    },

    translation: true,

    version: "3.0.0",
  });
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    server: true,
    openai: !!OPENAI_API_KEY,
    stripe: !!STRIPE_SECRET_KEY,
    mercadoPago: !!MERCADO_PAGO_ACCESS_TOKEN,
  });
});

// ============================================================
// PLANOS
// ============================================================

app.get("/api/plans", (req, res) => {
  res.json({
    success: true,

    plans: [
      {
        id: "100",
        name: "Plano Básico",
        price: 100,
        currency: "BRL",
        interval: "month",

        features: [
          "Tradução em tempo real",
          "Tradução de áudio",
          "Voz IA",
        ],
      },

      {
        id: "200",
        name: "Plano Premium",
        price: 200,
        currency: "BRL",
        interval: "month",

        features: [
          "Tradução em tempo real",
          "Tradução de áudio",
          "Voz IA",
          "Maior limite de tradução",
          "Recursos premium",
        ],
      },
    ],
  });
});

// ============================================================
// STRIPE - CRIAR CHECKOUT
// ============================================================

app.post(
  "/api/stripe/create-checkout",
  async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({
          success: false,
          error:
            "Stripe não configurado. Adicione STRIPE_SECRET_KEY no Render.",
        });
      }

      const {
        plan,
        email,
      } = req.body || {};

      const selectedPlan = getPlan(plan);

      if (!selectedPlan) {
        return res.status(400).json({
          success: false,
          error:
            "Plano inválido. Use 100 ou 200.",
        });
      }

      const session =
        await stripe.checkout.sessions.create({
          mode: "subscription",

          line_items: [
            {
              price:
                selectedPlan.stripePrice,
              quantity: 1,
            },
          ],

          ...(email
            ? {
                customer_email: email,
              }
            : {}),

          metadata: {
            plan: selectedPlan.id,
            plan_name:
              selectedPlan.name,
          },

          subscription_data: {
            metadata: {
              plan: selectedPlan.id,
              plan_name:
                selectedPlan.name,
            },
          },

          success_url:
            `${FRONTEND_URL}` +
            `?pagamento=stripe-sucesso` +
            `&session_id={CHECKOUT_SESSION_ID}`,

          cancel_url:
            `${FRONTEND_URL}` +
            `?pagamento=stripe-cancelado`,
        });

      return res.json({
        success: true,

        provider: "stripe",

        plan: selectedPlan.id,

        sessionId: session.id,

        url: session.url,
      });
    } catch (error) {
      console.error(
        "Erro Stripe Checkout:",
        error
      );

      return res.status(500).json({
        success: false,

        error:
          error.message ||
          "Erro ao criar checkout Stripe",
      });
    }
  }
);

// ============================================================
// STRIPE - CONSULTAR CHECKOUT
// ============================================================

app.get(
  "/api/stripe/session/:id",
  async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({
          error:
            "Stripe não configurado",
        });
      }

      const session =
        await stripe.checkout.sessions.retrieve(
          req.params.id
        );

      res.json({
        success: true,

        id: session.id,

        status:
          session.status,

        paymentStatus:
          session.payment_status,

        customer:
          session.customer,

        subscription:
          session.subscription,

        metadata:
          session.metadata,
      });
    } catch (error) {
      console.error(
        "Erro consultando sessão Stripe:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// ============================================================
// STRIPE - PORTAL DO CLIENTE
// ============================================================

app.post(
  "/api/stripe/customer-portal",
  async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({
          error:
            "Stripe não configurado",
        });
      }

      const {
        customerId,
      } = req.body || {};

      if (!customerId) {
        return res.status(400).json({
          error:
            "customerId é obrigatório",
        });
      }

      const session =
        await stripe.billingPortal.sessions.create(
          {
            customer: customerId,

            return_url:
              FRONTEND_URL,
          }
        );

      res.json({
        success: true,
        url: session.url,
      });
    } catch (error) {
      console.error(
        "Erro portal Stripe:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// ============================================================
// MERCADO PAGO - CRIAR ASSINATURA
// ============================================================

app.post(
  "/api/mercadopago/create-subscription",
  async (req, res) => {
    try {
      if (!MERCADO_PAGO_ACCESS_TOKEN) {
        return res.status(503).json({
          success: false,

          error:
            "Mercado Pago não configurado. Adicione MERCADO_PAGO_ACCESS_TOKEN no Render.",
        });
      }

      const {
        plan,
        email,
      } = req.body || {};

      const selectedPlan = getPlan(plan);

      if (!selectedPlan) {
        return res.status(400).json({
          success: false,

          error:
            "Plano inválido. Use 100 ou 200.",
        });
      }

      if (!email) {
        return res.status(400).json({
          success: false,

          error:
            "Informe o e-mail do cliente.",
        });
      }

      const externalReference =
        `TRADUTOR-${selectedPlan.id}-${Date.now()}`;

      const body = {
        reason:
          `Tradutor IA - ${selectedPlan.name}`,

        external_reference:
          externalReference,

        payer_email: email,

        auto_recurring: {
          frequency: 1,

          frequency_type: "months",

          transaction_amount:
            selectedPlan.amount,

          currency_id: "BRL",
        },

        back_url:
          `${FRONTEND_URL}?pagamento=mercadopago-retorno`,

        notification_url:
          `${BACKEND_URL}/webhook/mercadopago`,
      };

      // Se você criar planos no Mercado Pago
      // e colocar os IDs no Render,
      // o backend poderá associá-los.
      if (selectedPlan.mercadoPagoPlan) {
        body.preapproval_plan_id =
          selectedPlan.mercadoPagoPlan;
      }

      const response = await fetch(
        "https://api.mercadopago.com/preapproval",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,

            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body: JSON.stringify(body),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        console.error(
          "Mercado Pago:",
          data
        );

        return res.status(
          response.status
        ).json({
          success: false,

          error:
            data.message ||
            data.error ||
            "Erro Mercado Pago",

          details: data,
        });
      }

      return res.json({
        success: true,

        provider: "mercadopago",

        plan: selectedPlan.id,

        amount:
          selectedPlan.amount,

        subscriptionId:
          data.id,

        status:
          data.status,

        checkoutUrl:
          data.init_point,

        init_point:
          data.init_point,

        externalReference:
          externalReference,
      });
    } catch (error) {
      console.error(
        "Erro Mercado Pago:",
        error
      );

      return res.status(500).json({
        success: false,

        error:
          error.message ||
          "Erro ao criar assinatura Mercado Pago",
      });
    }
  }
);

// ============================================================
// MERCADO PAGO - CONSULTAR ASSINATURA
// ============================================================

app.get(
  "/api/mercadopago/subscription/:id",
  async (req, res) => {
    try {
      if (!MERCADO_PAGO_ACCESS_TOKEN) {
        return res.status(503).json({
          error:
            "Mercado Pago não configurado",
        });
      }

      const response = await fetch(
        `https://api.mercadopago.com/preapproval/${encodeURIComponent(
          req.params.id
        )}`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,

            Accept:
              "application/json",
          },
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        return res.status(
          response.status
        ).json({
          success: false,
          error:
            data.message ||
            "Erro ao consultar assinatura",
          details: data,
        });
      }

      res.json({
        success: true,

        id: data.id,

        status: data.status,

        plan:
          data.preapproval_plan_id,

        nextPaymentDate:
          data.next_payment_date,

        amount:
          data.auto_recurring
            ?.transaction_amount,

        currency:
          data.auto_recurring
            ?.currency_id,

        initPoint:
          data.init_point,
      });
    } catch (error) {
      console.error(
        "Erro consultando Mercado Pago:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// ============================================================
// MERCADO PAGO WEBHOOK
// ============================================================

app.post(
  "/webhook/mercadopago",
  async (req, res) => {
    try {
      console.log(
        "Mercado Pago webhook recebido:"
      );

      console.log(
        JSON.stringify(
          req.body,
          null,
          2
        )
      );

      // Responde rapidamente ao Mercado Pago
      res.status(200).json({
        received: true,
      });

      // Processamento posterior
      const type =
        req.body?.type ||
        req.body?.topic;

      const dataId =
        req.body?.data?.id ||
        req.body?.id;

      console.log(
        "Tipo:",
        type
      );

      console.log(
        "ID:",
        dataId
      );

      // Se for pagamento, consulta os detalhes
      if (
        type === "payment" &&
        dataId &&
        MERCADO_PAGO_ACCESS_TOKEN
      ) {
        try {
          const response =
            await fetch(
              `https://api.mercadopago.com/v1/payments/${encodeURIComponent(
                dataId
              )}`,
              {
                headers: {
                  Authorization:
                    `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,

                  Accept:
                    "application/json",
                },
              }
            );

          const payment =
            await response.json();

          console.log(
            "Status pagamento MP:",
            payment.status
          );

          console.log(
            "Valor:",
            payment.transaction_amount
          );
        } catch (error) {
          console.error(
            "Erro consultando pagamento MP:",
            error.message
          );
        }
      }
    } catch (error) {
      console.error(
        "Erro webhook Mercado Pago:",
        error
      );

      // Se já respondeu, não tenta responder novamente
    }
  }
);

// ============================================================
// OPENAI - TRADUZIR TEXTO
// ============================================================

app.post(
  "/api/translate",
  async (req, res) => {
    try {
      if (!openai) {
        return res.status(503).json({
          success: false,

          error:
            "OpenAI não configurada. Adicione OPENAI_API_KEY no Render.",
        });
      }

      const {
        text,
        targetLanguage,
        sourceLanguage,
      } = req.body || {};

      if (!text) {
        return res.status(400).json({
          success: false,

          error:
            "Texto obrigatório.",
        });
      }

      const target =
        normalizeLanguage(
          targetLanguage
        );

      const source =
        normalizeLanguage(
          sourceLanguage
        );

      const response =
        await openai.responses.create({
          model:
            OPENAI_TEXT_MODEL,

          input: [
            {
              role: "system",

              content:
                `Você é um tradutor profissional para tradução em tempo real.
Traduza somente o conteúdo recebido.
Não explique a tradução.
Não adicione comentários.
Mantenha nomes próprios e o sentido original.
Idioma de origem: ${source}.
Idioma de destino: ${target}.`,
            },

            {
              role: "user",

              content: String(text),
            },
          ],
        });

      const translatedText =
        response.output_text ||
        "";

      return res.json({
        success: true,

        original:
          text,

        translated:
          translatedText,

        sourceLanguage:
          source,

        targetLanguage:
          target,
      });
    } catch (error) {
      console.error(
        "Erro tradução OpenAI:",
        error
      );

      res.status(500).json({
        success: false,

        error:
          error.message ||
          "Erro na tradução",
      });
    }
  }
);

// ============================================================
// OPENAI - ÁUDIO -> TEXTO
// ============================================================

app.post(
  "/api/transcribe",
  upload.single("audio"),
  async (req, res) => {
    try {
      if (!openai) {
        return res.status(503).json({
          success: false,

          error:
            "OpenAI não configurada.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,

          error:
            "Envie um arquivo no campo 'audio'.",
        });
      }

      const { toFile } =
        require("openai");

      const file =
        await toFile(
          req.file.buffer,
          req.file.originalname ||
            "audio.webm",
          {
            type:
              req.file.mimetype ||
              "audio/webm",
          }
        );

      const transcription =
        await openai.audio.transcriptions.create(
          {
            file,

            model:
              OPENAI_TRANSCRIBE_MODEL,

            response_format:
              "json",
          }
        );

      return res.json({
        success: true,

        text:
          transcription.text ||
          "",

        language:
          req.body?.sourceLanguage ||
          null,
      });
    } catch (error) {
      console.error(
        "Erro transcrição:",
        error
      );

      res.status(500).json({
        success: false,

        error:
          error.message ||
          "Erro ao transcrever áudio",
      });
    }
  }
);

// ============================================================
// OPENAI - TEXTO -> ÁUDIO
// ============================================================

app.post(
  "/api/speech",
  async (req, res) => {
    try {
      if (!openai) {
        return res.status(503).json({
          success: false,

          error:
            "OpenAI não configurada.",
        });
      }

      const {
        text,
        voice,
        speed,
      } = req.body || {};

      if (!text) {
        return res.status(400).json({
          success: false,

          error:
            "Texto obrigatório.",
        });
      }

      const speech =
        await openai.audio.speech.create({
          model:
            OPENAI_TTS_MODEL,

          voice:
            voice ||
            OPENAI_TTS_VOICE,

          input:
            String(text).slice(
              0,
              4096
            ),

          response_format:
            "mp3",

          speed:
            Number(speed) || 1,
        });

      const audioBuffer =
        Buffer.from(
          await speech.arrayBuffer()
        );

      res.setHeader(
        "Content-Type",
        "audio/mpeg"
      );

      res.setHeader(
        "Content-Length",
        audioBuffer.length
      );

      return res.send(
        audioBuffer
      );
    } catch (error) {
      console.error(
        "Erro TTS:",
        error
      );

      res.status(500).json({
        success: false,

        error:
          error.message ||
          "Erro ao gerar voz IA",
      });
    }
  }
);

// ============================================================
// TRADUÇÃO COMPLETA DE ÁUDIO
//
// áudio -> transcrição -> tradução -> voz IA
//
// Essa é a rota principal para o tradutor ao vivo.
// ============================================================

app.post(
  "/api/translate-audio",
  upload.single("audio"),
  async (req, res) => {
    try {
      if (!openai) {
        return res.status(503).json({
          success: false,

          error:
            "OpenAI não configurada.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,

          error:
            "Envie o áudio no campo 'audio'.",
        });
      }

      const sourceLanguage =
        normalizeLanguage(
          req.body?.sourceLanguage
        );

      const targetLanguage =
        normalizeLanguage(
          req.body?.targetLanguage
        );

      const voice =
        req.body?.voice ||
        OPENAI_TTS_VOICE;

      // --------------------------------------------------------
      // 1. Preparar arquivo
      // --------------------------------------------------------

      const { toFile } =
        require("openai");

      const file =
        await toFile(
          req.file.buffer,
          req.file.originalname ||
            "live.webm",
          {
            type:
              req.file.mimetype ||
              "audio/webm",
          }
        );

      // --------------------------------------------------------
      // 2. TRANSCRIÇÃO
      // --------------------------------------------------------

      const transcription =
        await openai.audio.transcriptions.create(
          {
            file,

            model:
              OPENAI_TRANSCRIBE_MODEL,

            response_format:
              "json",

            ...(sourceLanguage &&
            sourceLanguage !==
              "Português"
              ? {}
              : {}),
          }
        );

      const originalText =
        transcription.text ||
        "";

      if (!originalText.trim()) {
        return res.json({
          success: true,

          originalText: "",

          translatedText: "",

          audioBase64: null,

          audioMimeType:
            "audio/mpeg",

          message:
            "Nenhuma fala detectada.",
        });
      }

      // --------------------------------------------------------
      // 3. TRADUÇÃO
      // --------------------------------------------------------

      const translation =
        await openai.responses.create(
          {
            model:
              OPENAI_TEXT_MODEL,

            input: [
              {
                role: "system",

                content:
                  `Traduza o texto abaixo de ${sourceLanguage} para ${targetLanguage}.
Retorne somente a tradução.
Não explique.
Não adicione aspas.
Preserve nomes próprios, números e o sentido original.`,
              },

              {
                role: "user",

                content:
                  originalText,
              },
            ],
          }
        );

      const translatedText =
        translation.output_text ||
        "";

      // --------------------------------------------------------
      // 4. GERAR VOZ
      // --------------------------------------------------------

      const speech =
        await openai.audio.speech.create(
          {
            model:
              OPENAI_TTS_MODEL,

            voice,

            input:
              translatedText.slice(
                0,
                4096
              ),

            response_format:
              "mp3",

            speed: 1,
          }
        );

      const audioBuffer =
        Buffer.from(
          await speech.arrayBuffer()
        );

      // --------------------------------------------------------
      // 5. RETORNAR
      // --------------------------------------------------------

      return res.json({
        success: true,

        originalText,

        translatedText,

        sourceLanguage,

        targetLanguage,

        audioMimeType:
          "audio/mpeg",

        audioBase64:
          audioBuffer.toString(
            "base64"
          ),
      });
    } catch (error) {
      console.error(
        "ERRO TRADUÇÃO DE ÁUDIO:"
      );

      console.error(
        error
      );

      return res.status(500).json({
        success: false,

        error:
          error.message ||
          "Erro ao traduzir áudio",
      });
    }
  }
);

// ============================================================
// TESTE DE TRADUÇÃO
// ============================================================

app.get(
  "/api/test-translation",
  async (req, res) => {
    try {
      if (!openai) {
        return res.status(503).json({
          success: false,

          error:
            "OPENAI_API_KEY não configurada.",
        });
      }

      const response =
        await openai.responses.create({
          model:
            OPENAI_TEXT_MODEL,

          input:
            "Translate this sentence to Portuguese: Hello, how are you?",
        });

      res.json({
        success: true,

        result:
          response.output_text,
      });
    } catch (error) {
      console.error(
        error
      );

      res.status(500).json({
        success: false,

        error:
          error.message,
      });
    }
  }
);

// ============================================================
// 404
// ============================================================

app.use(
  (req, res) => {
    res.status(404).json({
      success: false,

      error:
        "Endpoint not found",

      path:
        req.originalUrl,

      method:
        req.method,
    });
  }
);

// ============================================================
// ERRO GLOBAL
// ============================================================

app.use(
  (error, req, res, next) => {
    console.error(
      "Erro global:",
      error
    );

    if (res.headersSent) {
      return next(error);
    }

    res.status(500).json({
      success: false,

      error:
        error.message ||
        "Erro interno do servidor",
    });
  }
);

// ============================================================
// START SERVER
// ============================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      "=============================================="
    );

    console.log(
      "TRADUTOR IA BACKEND"
    );

    console.log(
      "=============================================="
    );

    console.log(
      `Servidor rodando na porta ${PORT}`
    );

    console.log(
      `Backend: ${BACKEND_URL}`
    );

    console.log(
      `Frontend: ${FRONTEND_URL}`
    );

    console.log(
      `OpenAI: ${
        OPENAI_API_KEY
          ? "CONFIGURADA"
          : "NÃO CONFIGURADA"
      }`
    );

    console.log(
      `Stripe: ${
        STRIPE_SECRET_KEY
          ? "CONFIGURADO"
          : "NÃO CONFIGURADO"
      }`
    );

    console.log(
      `Mercado Pago: ${
        MERCADO_PAGO_ACCESS_TOKEN
          ? "CONFIGURADO"
          : "NÃO CONFIGURADO"
      }`
    );

    console.log(
      "Plano R$100:",
      STRIPE_PRICE_100
    );

    console.log(
      "Plano R$200:",
      STRIPE_PRICE_200
    );

    console.log(
      "=============================================="
    );
  }
);
