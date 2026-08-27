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

const PLANS = {
  "100": "price_1SyfsQP9zHRcVasov83JjPRe",
  "200": "price_1U8mAoP9zHRcVasofgpq69Nl"
};

app.use(cors());

/* =========================
   WEBHOOK STRIPE
========================= */

app.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {

    if (!stripe) {
      return res.status(500).send("Stripe não configurado");
    }

    const signature =
      req.headers["stripe-signature"];

    let event;

    try {

      event =
        stripe.webhooks.constructEvent(
          req.body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET
        );

    } catch (error) {

      console.error(
        "Erro no webhook:",
        error.message
      );

      return res.status(400).send(
        `Webhook Error: ${error.message}`
      );
    }

    console.log(
      "Evento Stripe:",
      event.type
    );

    if (
      event.type ===
      "checkout.session.completed"
    ) {

      const session =
        event.data.object;

      console.log(
        "Checkout concluído:",
        session.id
      );

      console.log(
        "Cliente:",
        session.customer_details?.email
      );
    }

    res.json({
      received: true
    });
  }
);


/* =========================
   JSON
========================= */

app.use(express.json());


/* =========================
   HOME
========================= */

app.get("/", (req, res) => {

  res.json({

    online: true,

    message:
      "Keep - Tradutor Universal",

    stripe:
      !!stripe,

    webhook:
      !!process.env.STRIPE_WEBHOOK_SECRET

  });

});


/* =========================
   CHECKOUT STRIPE
========================= */

app.post(
  "/create-checkout-session",
  async (req, res) => {

    try {

      if (!stripe) {

        return res.status(500).json({
          error:
            "Stripe não está configurado no Render."
        });

      }

      const plan =
        String(req.body.plan || "");

      const email =
        req.body.email || undefined;


      if (!PLANS[plan]) {

        return res.status(400).json({
          error:
            "Plano inválido. Use 100 ou 200."
        });

      }


      console.log(
        "Criando Checkout para plano:",
        plan
      );


      /*
        AQUI ESTÁ A CRIAÇÃO DO CHECKOUT
      */

      const session =
        await stripe.checkout.sessions.create({

          mode: "subscription",
payment_method_types: ["card"],
          line_items: [
            {
              price: PLANS[plan],

              quantity: 1
            }
          ],

          customer_email:
            email,

          success_url:
            FRONTEND_URL +
            "?pagamento=sucesso&session_id={CHECKOUT_SESSION_ID}",

          cancel_url:
            FRONTEND_URL +
            "?pagamento=cancelado",

          metadata: {
            plan: plan
          },

          subscription_data: {
            metadata: {
              plan: plan
            }
          }

        });


      console.log(
        "Checkout criado:",
        session.id
      );


      return res.json({

        success: true,

        url: session.url

      });

    }

    catch (error) {

      console.error(
        "Erro Stripe:",
        error
      );

      return res.status(500).json({

        error:
          error.message

      });

    }

  }
);


/* =========================
   HEALTH
========================= */

app.get(
  "/health",
  (req, res) => {

    res.json({

      status: "ok",

      stripe:
        !!stripe,

      webhook:
        !!process.env.STRIPE_WEBHOOK_SECRET

    });

  }
);


/* =========================
   404
========================= */

app.use(
  (req, res) => {

    res.status(404).json({

      error:
        "Endpoint not found",

      path:
        req.originalUrl

    });

  }
);


/* =========================
   START
========================= */

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
      "Servidor iniciado na porta:",
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
      "================================"
    );

  }
);
