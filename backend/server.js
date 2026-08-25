```javascript
const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;

// =====================================================
// ENDEREÇOS DO SEU PROJETO
// =====================================================

const BACKEND_URL =
  "https://repository-name-tradutor-ia-0h2r.onrender.com";

const SITE_URL =
  "https://josericardoricado-art.github.io/Repository-name-tradutor-ia";

// =====================================================
// ACCESS TOKEN DO MERCADO PAGO
// =====================================================
// NÃO coloque o token aqui.
// Ele será lido das Environment Variables do Render.

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
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
  })
);


// =====================================================
// ROTA PRINCIPAL
// =====================================================

app.get("/", (req, res) => {

  res.json({
    online: true,

    message:
      "Keep - Tradutor Universal",

    backend:
      BACKEND_URL,

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

    server:
      "online",

    mercadoPago:
      MP_ACCESS_TOKEN
        ? "configurado"
        : "não configurado",

    backend:
      BACKEND_URL,

    site:
      SITE_URL

  });

});


// =====================================================
// CRIAR PAGAMENTO
// =====================================================

app.post(
  "/create-preference",
  async (req, res) => {

    try {

      console.log(
        "================================"
      );

      console.log(
        "CRIANDO PAGAMENTO"
      );

      console.log(
        "================================"
      );


      // -------------------------------------------------
      // VERIFICAR TOKEN
      // -------------------------------------------------

      if (!MP_ACCESS_TOKEN) {

        console.error(
          "MP_ACCESS_TOKEN não configurado."
        );

        return res.status(500).json({

          success: false,

          error:
            "MP_ACCESS_TOKEN não está configurado no Render."

        });

      }


      // -------------------------------------------------
      // PREFERÊNCIA DO MERCADO PAGO
      // -------------------------------------------------

      const preference = {

        items: [

          {

            id:
              "keep-premium-100",

            title:
              "Keep - Tradutor Universal - Plano Premium",

            description:
              "Plano Premium mensal do Keep - Tradutor Universal",

            quantity:
              1,

            currency_id:
              "BRL",

            unit_price:
              100.00

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


      console.log(
        "Enviando preferência para Mercado Pago..."
      );


      // -------------------------------------------------
      // API MERCADO PAGO
      // -------------------------------------------------

      const response =
        await fetch(
          "https://api.mercadopago.com/checkout/preferences",
          {

            method:
              "POST",

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
      // VERIFICAR RESPOSTA
      // -------------------------------------------------

      if (!response.ok) {

        console.error(
          "ERRO MERCADO PAGO:"
        );

        console.error(
          data
        );


        return res.status(
          response.status
        ).json({

          success:
            false,

          error:
            "Mercado Pago recusou a criação do pagamento.",

          details:
            data

        });

      }


      // -------------------------------------------------
      // PAGAMENTO CRIADO
      // -------------------------------------------------

      console.log(
        "Pagamento criado!"
      );

      console.log(
        "Preference ID:",
        data.id
      );


      return res.json({

        success:
          true,

        preferenceId:
          data.id,

        init_point:
          data.init_point,

```
