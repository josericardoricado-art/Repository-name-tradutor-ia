app.post("/create-checkout-session", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({
        error: "Stripe não configurado"
      });
    }

    const { plan } = req.body;

    const plans = {
      "100": "price_1U8mAoP9zHRcVasofgpq69Nl",
      "200": "price_1SyfsQP9zHRcVasov83JjPRe"
    };

    if (!plans[plan]) {
      return res.status(400).json({
        error: "Plano inválido"
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      line_items: [
        {
          price: plans[plan],
          quantity: 1
        }
      ],

      success_url:
        "https://josericardoricado-art.github.io/Repository-name-tradutor-ia/?pagamento=sucesso",

      cancel_url:
        "https://josericardoricado-art.github.io/Repository-name-tradutor-ia/?pagamento=cancelado"
    });

    res.json({
      success: true,
      url: session.url
    });

  } catch (error) {
    console.error("Erro Stripe:", error);

    res.status(500).json({
      error: error.message
    });
  }
});
