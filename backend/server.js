const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;

const BACKEND_URL =
  "https://repository-name-tradutor-ia-0h2r.onrender.com";

const SITE_URL =
  "https://josericardoricado-art.github.io/Repository-name-tradutor-ia";

const MP_ACCESS_TOKEN =
  process.env.MP_ACCESS_TOKEN;

app.use(cors());

app.use(express.json());


// ==========================================
// TESTE
// ==========================================

app.get("/", (req, res) => {

  res.json({
    online: true,
    message: "Keep - Tradutor Universal",
    mercadoPago: MP_ACCESS_TOKEN
      ? "configurado"
      : "não configurado"
  });

});


// ==========================================
// CRIAR PAGAMENTO MERCADO PAGO
// ==========================================

app.post("/create-preference", async (req, res) => {

  try {

    if (!MP_ACCESS_TOKEN) {

      return res.status(500).json({
        success: false,
        error:
          "MP_ACCESS_TOKEN não está configurado no Render."
      });

    }


    const preference = {

      items: [

        {
          id: "keep-premium",

          title:
            "Keep - Tradutor Universal Premium",

          description:
            "Plano Premium mensal",

          quantity: 1,

          currency_id: "BRL",

          unit_price: 100
        }

      ],


      external_reference:
        "KEEP-" + Date.now(),


      back_urls: {

        success:
          `${SITE_URL}/?pagamento=sucesso`,

        failure:
          `${SITE_URL}/?pagamento=falhou`,

        pending:
          `${SITE_URL}/?pagamento=pendente`

      },


      auto_return: "approved",


      notification_url:
        `${BACKEND_URL}/webhook/mercadopago`

    };


    const response =
      await fetch(
        "https://api.mercadopago.com/checkout/preferences",
        {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${MP_ACCESS_TOKEN}`

          },

          body:
            JSON.stringify(preference)

        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      console.error(
        "Erro Mercado Pago:",
        data
      );

      return res.status(
        response.status
      ).json({

        success: false,

        error:
          "Erro ao criar pagamento no Mercado Pago.",

        details:
          data

      });

    }


    console.log(
      "Pagamento criado:",
      data.id
    );


    res.json({

      success: true,

      preferenceId:
        data.id,

      init_point:
        data.init_point,

      sandbox_init_point:
        data.sandbox_init_point

    });

  }

  catch (error) {

    console.error(
      "Erro:",
      error
    );

    res.status(500).json({

      success: false,

      error:
        error.message

    });

  }

});


// ==========================================
// WEBHOOK
// ==========================================

app.post(
  "/webhook/mercadopago",
  (req, res) => {

    console.log(
      "Webhook Mercado Pago:"
    );

    console.log(
      req.body
    );

    res.sendStatus(200);

  }
);


// ==========================================
// INICIAR SERVIDOR
// ==========================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Servidor rodando na porta ${PORT}`
    );

  }
);
