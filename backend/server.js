```js
// ============================================================
// KEEP - TRADUTOR UNIVERSAL
// BACKEND - RENDER
// STRIPE CHECKOUT + WEBHOOK
//
// PLANOS:
// R$100/mês
// R$200/mês
//
// IMPORTANTE:
// As chaves do Stripe NÃO ficam neste arquivo.
// Elas devem ser configuradas no Render > Environment.
// ============================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");

const app = express();

// ============================================================
// CONFIGURAÇÕES
// ============================================================

const PORT = process.env.PORT || 3000;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "https://josericardoricado-art.github.io/Repository-name-tradutor-ia/";

// ============================================================
// STRIPE
// ============================================================

const STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY;

const STRIPE_WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET;

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY)
  : null;

// ============================================================
// PLANOS STRIPE
// ============================================================

const PLANS = {
  "100": {
    name: "Keep - Plano R$100/mês",
    priceId: "price_1U8mAoP9zHRcVasofgpq69Nl"
  },

  "200": {
    name: "Keep - Plano R$200/mês",
    priceId: "price_1SyfsQP9zHRcVasov83JjPRe"
  }
};

// ============================================================
// CORS
// ============================================================

app.use(
  cors({
    origin: [
      "https://josericardoricado-art.github.io",
      FRONTEND_URL
    ],
    methods: [
      "GET",
      "POST",
      "OPTIONS"
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization"
    ]
  })
);

// ============================================================
// STRIPE WEBHOOK
//
// ATENÇÃO:
// express.raw() precisa ser usado nesta rota.
// Ela deve ficar ANTES de express.json().
// ============================================================

app.post(
  "/stripe/webhook",
  express.raw({
    type: "application/json"
  }),
  async (req, res) => {

    if (!stripe) {
      console.error(
        "Stripe não configurado."
      );

      return res.status(500).send(
        "Stripe não configurado"
      );
    }

    const signature =
      req.headers["stripe-signature"];

    let event;

    try {

      if (!STRIPE_WEBHOOK_SECRET) {
        console.error(
          "STRIPE_WEBHOOK_SECRET não configurado."
        );

        return res.status(500).send(
          "Webhook secret não configurado"
        );
      }

      event =
        stripe.webhooks.constructEvent(
          req.body,
          signature,
          STRIPE_WEBHOOK_SECRET
        );

    } catch (error) {

      console.error(
        "Erro ao validar webhook:",
        error.message
      );

      return res.status(400).send(
        `Webhook Error: ${error.message}`
      );
    }

    console.log(
      "----------------------------------------"
    );

    console.log(
      "Stripe Event:",
      event.type
    );

    console.log(
      "Event ID:",
      event.id
    );

    console.log(
      "----------------------------------------"
    );

    // ========================================================
    // CHECKOUT CONCLUÍDO
    // ========================================================

    if (
      event.type ===
      "checkout.session.completed"
    ) {

      const session =
        event.data.object;

      console.log(
        "CHECKOUT CONCLUÍDO"
      );

      console.log(
        "Session:",
        session.id
      );

      console.log(
        "Cliente:",
        session.customer
      );

      console.log(
        "Email:",
        session.customer_details
          ? session.customer_details.email
          : null
      );

      console.log(
        "Subscription:",
        session.subscription
      );

      console.log(
        "Plano:",
        session.metadata
          ? session.metadata.plan
          : null
      );

      // ======================================================
      // FUTURO:
      //
      // Aqui podemos salvar o usuário no banco de dados,
      // liberar o plano e registrar a assinatura.
      // ======================================================
    }

    // ========================================================
    // PAGAMENTO APROVADO
    // ========================================================

    if (
      event.type ===
      "payment_intent.succeeded"
    ) {

      const payment =
        event.data.object;

      console.log(
        "PAGAMENTO APROVADO:",
        payment.id
      );
    }

    // ========================================================
    // PAGAMENTO FALHOU
    // ========================================================

    if (
      event.type ===
      "payment_intent.payment_failed"
    ) {

      const payment =
        event.data.object;

      console.log(
        "PAGAMENTO FALHOU:",
        payment.id
      );
    }

    // ========================================================
    // ASSINATURA ATUALIZADA
    // ========================================================

    if (
      event.type ===
      "customer.subscription.updated"
    ) {

      const subscription =
        event.data.object;

      console.log(
        "ASSINATURA ATUALIZADA:",
        subscription.id
      );

      console.log(
        "Status:",
        subscription.status
      );
    }

    // ========================================================
    // ASSINATURA CANCELADA
    // ========================================================

    if (
      event.type ===
      "customer.subscription.deleted"
    ) {

      const subscription =
        event.data.object;

      console.log(
        "ASSINATURA CANCELADA:",
        subscription.id
      );
    }

    return res.json({
      received: true
    });
  }
);

// ============================================================
// JSON
//
// Deve ficar DEPOIS do webhook.
// ============================================================

app.use(
  express.json()
);

// ============================================================
// ROTA PRINCIPAL
// ============================================================

app.get(
  "/",
  (req, res) => {

    res.json({
      online: true,

      message:
        "Keep - Tradutor Universal",

      stripe:
        !!stripe,

      webhook:
        !!STRIPE_WEBHOOK_SECRET,

      plans: {
        "100": {
          priceId:
            PLANS["100"].priceId
        },

        "200": {
          priceId:
            PLANS["200"].priceId
        }
      }
    });
  }
);

// ============================================================
// STATUS
// ============================================================

app.get(
  "/status",
  (req, res) => {

    res.json({
      online: true,

      stripe:
        !!stripe,

      webhook:
        !!STRIPE_WEBHOOK_SECRET,

      frontend:
        FRONTEND_URL
    });
  }
);

// ============================================================
// CRIAR CHECKOUT STRIPE
// ============================================================

app.post(
  "/create-checkout-session",
  async (req, res) => {

    try {

      // ======================================================
      // VERIFICAR STRIPE
      // ======================================================

      if (!stripe) {

        return res.status(500).json({
          success: false,

          error:
            "Stripe não está configurado no Render."
        });
      }

      // ======================================================
      // RECEBER PLANO
      // ======================================================

      const plan =
        String(req.body.plan || "");

      console.log(
        "Plano solicitado:",
        plan
      );

      // ======================================================
      // VERIFICAR PLANO
      // ======================================================

      if (!PLANS[plan]) {

        return res.status(400).json({

          success: false,

          error:
            "Plano inválido. Use plan 100 ou 200."
        });
      }

      const selectedPlan =
        PLANS[plan];

      // ======================================================
      // CRIAR CHECKOUT
      // ======================================================

      const session =
        await stripe.checkout.sessions.create({

          mode:
            "subscription",

          line_items: [
            {
              price:
                selectedPlan.priceId,

              quantity:
                1
            }
          ],

          success_url:
            `${FRONTEND_URL}?pagamento=sucesso&session_id={CHECKOUT_SESSION_ID}`,

          cancel_url:
            `${FRONTEND_URL}?pagamento=cancelado`,

          billing_address_collection:
            "auto",

          customer_creation:
            "always",

          metadata: {

            plan:
              plan,

            plan_name:
              selectedPlan.name
          },

          subscription_data: {

            metadata: {

              plan:
                plan,

              plan_name:
                selectedPlan.name
            }
          }
        });

      console.log(
        "Checkout criado:"
      );

      console.log(
        "Session ID:",
        session.id
      );

      console.log(
        "Plano:",
        selectedPlan.name
      );

      // ======================================================
      // RETORNAR URL
      // ======================================================

      return res.json({

        success:
          true,

        url:
          session.url,

        sessionId:
          session.id
      });

    } catch (error) {

      console.error(
        "Erro ao criar Checkout Stripe:"
      );

      console.error(
        error
      );

      return res.status(500).json({

        success:
          false,

        error:
          error.message ||
          "Erro ao criar pagamento."
      });
    }
  }
);

// ============================================================
// CONSULTAR CHECKOUT
// ============================================================

app.get(
  "/checkout-session/:id",
  async (req, res) => {

    try {

      if (!stripe) {

        return res.status(500).json({
          success: false,
          error:
            "Stripe não configurado."
        });
      }

      const session =
        await stripe.checkout.sessions.retrieve(
          req.params.id
        );

      return res.json({

        success:
          true,

        id:
          session.id,

        status:
          session.status,

        payment_status:
          session.payment_status,

        customer:
          session.customer,

        subscription:
          session.subscription,

        email:
          session.customer_details
            ? session.customer_details.email
            : null
      });

    } catch (error) {

      console.error(
        "Erro ao consultar Checkout:",
        error
      );

      return res.status(500).json({

        success:
          false,

        error:
          error.message
      });
    }
  }
);

// ============================================================
// CANCELAR ASSINATURA
// ============================================================

app.post(
  "/cancel-subscription",
  async (req, res) => {

    try {

      if (!stripe) {

        return res.status(500).json({
          success: false,
          error:
            "Stripe não configurado."
        });
      }

      const subscriptionId =
        req.body.subscriptionId;

      if (!subscriptionId) {

        return res.status(400).json({

          success:
            false,

          error:
            "subscriptionId é obrigatório."
        });
      }

      const subscription =
        await stripe.subscriptions.cancel(
          subscriptionId
        );

      return res.json({

        success:
          true,

        subscriptionId:
          subscription.id,

        status:
          subscription.status
      });

    } catch (error) {

      console.error(
        "Erro ao cancelar assinatura:",
        error
      );

      return res.status(500).json({

        success:
          false,

        error:
          error.message
      });
    }
  }
);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get(
  "/health",
  (req, res) => {

    res.json({

      status:
        "ok",

      service:
        "Keep - Tradutor Universal",

      stripe:
        !!stripe,

      webhook:
        !!STRIPE_WEBHOOK_SECRET,

      timestamp:
        new Date().toISOString()
    });
  }
);

// ============================================================
// 404
// ============================================================

app.use(
  (req, res) => {

    res.status(404).json({

      success:
        false,

      error:
        "Endpoint not found",

      path:
        req.originalUrl,

      method:
        req.method
    });
  }
);

// ============================================================
// ERRO GLOBAL
// ============================================================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {

    console.error(
      "Erro interno:",
      error
    );

    res.status(500).json({

      success:
        false,

      error:
        "Erro interno do servidor."
    });
  }
);

// ============================================================
// INICIAR SERVIDOR
// ============================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      "============================================"
    );

    console.log(
      "KEEP - TRADUTOR UNIVERSAL"
    );

    console.log(
      "Servidor iniciado"
    );

    console.log(
      `Porta: ${PORT}`
    );

    console.log(
      `Frontend: ${FRONTEND_URL}`
    );

    console.log(
      `Stripe: ${
        stripe
          ? "CONFIGURADO"
          : "NÃO CONFIGURADO"
      }`
    );

    console.log(
      `Webhook: ${
        STRIPE_WEBHOOK_SECRET
          ? "CONFIGURADO"
          : "NÃO CONFIGURADO"
      }`
    );

    console.log(
      "============================================"
    );
  }
);
```
