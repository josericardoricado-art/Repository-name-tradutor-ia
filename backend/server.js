require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");

const app = express();

const PORT = process.env.PORT || 3000;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "https://josericardoricado-art.github.io/Repository-name-tradutor-ia/";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// =========================
// PLANOS
// =========================

const PLANS = {
  "100": "price_1SyfsQP9zHRcVasov83JjPRe",
  "200": "price_1U8mAoP9zHRcVasofgpq69Nl"
};

// =========================
// CORS
// =========================

app.use(cors());

// =====================================================
// WEBHOOK STRIPE
// IMPORTANTE: TEM QUE VIR ANTES DO express.json()
// =====================================================

app.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    if (!stripe) {
      console.error("Stripe não configurado.");
      return res.status(500).send("Stripe não configurado");
    }

    const signature = req.headers["stripe-signature"];

    if (!signature) {
      console.error("Stripe-Signature não encontrada.");
      return res.status(400).send("Stripe-Signature ausente");
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("STRIPE_WEBHOOK_SECRET não configurado.");
      return res.status(500).send("Webhook Secret não configurado");
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      console.error(
        "Erro na assinatura do webhook:",
        error.message
      );

      return res.status(400).send(
        `Webhook Error: ${error.message}`
      );
    }

    console.log("================================");
    console.log("Evento Stripe recebido:");
    console.log("Tipo:", event.type);
    console.log("ID:", event.id);
    console.log("================================");

    // ==========================================
    // PAGAMENTO / ASSINATURA CONCLUÍDA
    // ==========================================

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      console.log("CHECKOUT CONCLUÍDO");
      console.log("Session:", session.id);
      console.log(
        "Email:",
        session.customer_details?.email || "não informado"
      );
      console.log(
        "Plano:",
        session.metadata?.plan || "não informado"
      );
      console.log(
        "Subscription:",
        session.subscription || "não informado"
      );
    }

    // ==========================================
    // PAGAMENTO BEM-SUCEDIDO
    // ==========================================

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;

      console.log("PAGAMENTO APROVADO");
      console.log("PaymentIntent:", paymentIntent.id);
      console.log(
        "Valor:",
        paymentIntent.amount
      );
    }

    // ==========================================
    // ASSINATURA CANCELADA
    // ==========================================

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;

      console.log("ASSINATURA CANCELADA");
      console.log("Subscription:", subscription.id);
    }

    // ==========================================
    // FATURA PAGA
    // ==========================================

    if (event.type === "invoice.paid") {
      const invoice = event.data.object;

      console.log("FATURA PAGA");
      console.log("Invoice:", invoice.id);
    }

    // Resposta obrigatória para o Stripe
    return res.json({
      received: true
    });
  }
);

// =========================
// JSON
// =========================

app.use(express.json());

// =========================
// HOME
// =========================

app.get("/", (req, res) => {
  res.json({
    online: true,
    message: "Keep - Tradutor Universal",

    stripe: !!stripe,

    webhook: !!process.env.STRIPE_WEBHOOK_SECRET,

    frontend: FRONTEND_URL
  });
});

// =========================
// HEALTH
// =========================

app.get("/health", (req, res) => {
  res.json({
    status: "ok",

    stripe: !!stripe,

    webhook: !!process.env.STRIPE_WEBHOOK_SECRET,

    time: new Date().toISOString()
  });
});

// =====================================================
// CRIAR CHECKOUT STRIPE
// =====================================================

app.post(
  "/create-checkout-session",
  async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({
          success: false,
          error:
            "Stripe não está configurado no Render."
        });
      }

      const plan = String(
        req.body.plan || ""
      );

      const email =
        req.body.email || undefined;

      // ==========================================
      // VERIFICAR PLANO
      // ==========================================

      if (!PLANS[plan]) {
        return res.status(400).json({
          success: false,
          error:
            "Plano inválido. Use 100 ou 200."
        });
      }

      console.log("================================");
      console.log("CRIANDO CHECKOUT STRIPE");
      console.log("Plano:", plan);
      console.log("Price ID:", PLANS[plan]);
      console.log("Email:", email || "não informado");
      console.log("================================");

      // ==========================================
      // CRIAR CHECKOUT
      //
      // NÃO usamos:
      // payment_method_types: ["card"]
      //
      // Assim o Stripe utiliza os métodos
      // habilitados/configurados no Dashboard.
      // ==========================================

      const session =
        await stripe.checkout.sessions.create({

          mode: "subscription",

          line_items: [
            {
              price: PLANS[plan],
              quantity: 1
            }
          ],

          // Email do cliente
          customer_email: email,

          // URLs
          success_url:
            FRONTEND_URL +
            "?pagamento=sucesso&session_id={CHECKOUT_SESSION_ID}",

          cancel_url:
            FRONTEND_URL +
            "?pagamento=cancelado",

          // Dados do plano
          metadata: {
            plan: plan
          },

          // Dados da assinatura
          subscription_data: {
            metadata: {
              plan: plan
            }
          }
        });

      console.log("Checkout criado com sucesso!");
      console.log("Session ID:", session.id);
      console.log("URL:", session.url);

      return res.json({
        success: true,
        url: session.url,
        session_id: session.id
      });

    } catch (error) {

      console.error(
        "================================"
      );

      console.error(
        "ERRO STRIPE"
      );

      console.error(
        "Mensagem:",
        error.message
      );

      console.error(
        "Tipo:",
        error.type || "não informado"
      );

      console.error(
        "Código:",
        error.code || "não informado"
      );

      console.error(
        "================================"
      );

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// =========================
// 404
// =========================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.originalUrl
  });
});

// =========================
// INICIAR SERVIDOR
// =========================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      "================================"
    );

    console.log(
      "Keep - Tradutor Universal"
    );

    console.log(
      "Servidor iniciado"
    );

    console.log(
      "Porta:",
      PORT
    );

    console.log(
      "Stripe:",
      stripe
        ? "OK"
        : "NÃO CONFIGURADO"
    );

    console.log(
      "Webhook:",
      process.env.STRIPE_WEBHOOK_SECRET
        ? "OK"
        : "NÃO CONFIGURADO"
    );

    console.log(
      "Frontend:",
      FRONTEND_URL
    );

    console.log(
      "================================"
    );
  }
);
