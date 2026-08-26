// ============================================================
// TRADUTOR IA - BACKEND
// OpenAI + Stripe + Mercado Pago
// Planos: R$100/mês e R$200/mês
// Compatível com Render
// ============================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const OpenAI = require("openai");
const Stripe = require("stripe");

const app = express();

// ============================================================
// CONFIGURAÇÕES
// ============================================================

const PORT = process.env.PORT || 3000;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "https://josericardoricado-art.github.io/Repository-name-tradutor-ia";

// ============================================================
// OPENAI
// ============================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = OPENAI_API_KEY
  ? new OpenAI({
      apiKey: OPENAI_API_KEY,
    })
  : null;

// ============================================================
// STRIPE
// ============================================================

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

const stripe = STRIPE_SECRET_KEY
  ? new
