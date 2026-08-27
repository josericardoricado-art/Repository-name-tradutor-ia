const session = await stripe.checkout.sessions.create({
  mode: "subscription",

  line_items: [
    {
      price: PLANS[plan],
      quantity: 1
    }
  ],

  customer_email: email || undefined,

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
      session.id,
      "Plano:",
      plan
    );

    return res.json({
      success: true,
      url: session.url
    });

  } catch (error) {
    console.error("Erro Stripe:", error);

    return res.status(500).json({
      error: error.message
    });
  }
});

/*
  HEALTH
*/
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    stripe: !!stripe
  });
});

/*
  404
*/
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.originalUrl
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("================================");
  console.log("Keep - Tradutor Universal");
  console.log("Servidor iniciado");
  console.log("Porta:", PORT);
  console.log("Stripe:", stripe ? "OK" : "NÃO CONFIGURADO");
  console.log(
    "Webhook:",
    process.env.STRIPE_WEBHOOK_SECRET
      ? "OK"
      : "NÃO CONFIGURADO"
  );
  console.log("================================");
});
