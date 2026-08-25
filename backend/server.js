const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;

// =====================================================
// SEUS ENDEREÇOS
// =====================================================

const BACKEND_URL =
  "https://repository-name-tradutor-ia-0h2r.onrender.com";

const SITE_URL =
  "https://josericardoricado-art.github.io/Repository-name-tradutor-ia";

// =====================================================
// TOKEN DO MERCADO PAGO
// =====================================================
// O token fica no Render:
// Environment → MP_ACCESS_TOKEN
// NÃO coloque o token diretamente neste arquivo.

const MP_ACCESS_TOKEN =
  process.env.MP_ACCESS_TOKEN;


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(express.json());

app.use(
  cors({
    origin: [
      "https://josericardoricado-art.github.io",
      "http://localhost:5500",
      "http://127.0.0.1:5500"
    ]
  })
);


// =====================================================
// TESTE DO SERVIDOR
// =====================================================

app.get("/", (req, res) => {

  res.json({
    online: true,
    message: "Keep - Tradutor Universal",
    mercadoPago:
      MP_ACCESS_TOKEN
        ? "configurado"
        : "NÃO configurado"
  });

});


// =====================================================
// STATUS
// =====================================================

app.get("/status", (req, res) => {

  res.json({

    server: "online",

    mercadoPago:
      MP_ACCESS_TOKEN
        ? "configurado"
        : "não configurado",

    backend: BACKEND_URL,

    site: SITE_URL

  });

});


// =====================================================
// CRIAR PREFERÊNCIA MERCADO PAGO
// =====================================================

app.post(
  "/create-preference",
  async (req, res) => {

    try {

      console.log(
        "Criando pagamento Mercado Pago..."
      );


      // -------------------------------------------------
      // VERIFICAR TOKEN
      // -------------------------------------------------

      if (!MP_ACCESS_TOKEN) {

        return res.status(500).json({

          success: false,

          error:
            "MP_ACCESS_TOKEN não está configurado no Render."

        });

      }


      // -------------------------------------------------
      // PREFERÊNCIA
      // -------------------------------------------------

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

            unit_price: 100.00
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


        auto_return:
          "approved",


        notification_url:
          `${BACKEND_URL}/webhook/mercadopago`

      };


      // -------------------------------------------------
      // CHAMAR MERCADO PAGO
      // -------------------------------------------------

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


      // -------------------------------------------------
      // ERRO
      // -------------------------------------------------

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
            "Erro ao criar preferência no Mercado Pago.",

          details:
            data

        });

      }


      // -------------------------------------------------
      // SUCESSO
      // -------------------------------------------------

      console.log(
        "Preferência criada:",
        data.id
      );


      return res.json({

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
        "Erro interno:",
        error
      );


      return res.status(500).json({

        success: false,

        error:
          "Erro interno do servidor.",

        details:
          error.message

      });

    }

  }
);


// =====================================================
// WEBHOOK
// =====================================================

app.post(
  "/webhook/mercadopago",
  (req, res) => {

    console.log(
      "Webhook Mercado Pago recebido:"
    );

    console.log(
      JSON.stringify(
        req.body,
        null,
        2
      )
    );


    res.sendStatus(200);

  }
);


// =====================================================
// INICIAR SERVIDOR
// =====================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
      "================================"
    );

    console.log(
      "KEEP - TRADUTOR UNIVERSAL"
    );

    console.log(
      `Servidor na porta ${PORT}`
    );

    console.log(
      `Backend: ${BACKEND_URL}`
    );

    console.log(
      "Mercado Pago:",
      MP_ACCESS_TOKEN
        ? "CONFIGURADO"
        : "NÃO CONFIGURADO"
    );

    console.log(
      "================================"
    );

  }
);
```
// INICIAR SERVIDOR

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
