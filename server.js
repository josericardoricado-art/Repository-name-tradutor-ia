require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: "*"
}));

app.use(express.json());

const uploadsDir = path.join(__dirname, "uploads");
const outputDir = path.join(__dirname, "output");

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },

    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const name = `video-${Date.now()}${ext}`;

        cb(null, name);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024
    },
    fileFilter: function (req, file, cb) {

        const allowed = [
            "video/mp4",
            "video/webm",
            "video/quicktime",
            "video/x-msvideo",
            "video/x-matroska"
        ];

        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Formato de vídeo não suportado."));
        }
    }
});


app.get("/", (req, res) => {
    res.json({
        status: "online",
        app: "Tradutor IA",
        message: "Backend funcionando!"
    });
});


app.get("/api/status", (req, res) => {
    res.json({
        online: true,
        service: "Tradutor IA",
        version: "1.0.0"
    });
});


app.post("/api/upload", upload.single("video"), async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "Nenhum vídeo foi enviado."
            });
        }

        const idiomaOrigem = req.body.idiomaOrigem || "auto";
        const idiomaDestino = req.body.idiomaDestino || "pt-BR";

        console.log("Vídeo recebido:");
        console.log(req.file.filename);

        console.log("Idioma de origem:", idiomaOrigem);
        console.log("Idioma de destino:", idiomaDestino);

        /*
         * PRÓXIMA ETAPA:
         *
         * 1. Extrair áudio com FFmpeg
         * 2. Transcrever o áudio
         * 3. Traduzir o texto
         * 4. Gerar voz IA
         * 5. Substituir o áudio original
         * 6. Gerar o vídeo final
         */

        res.json({
            success: true,
            message: "Vídeo recebido com sucesso.",
            video: req.file.filename,
            idiomaOrigem,
            idiomaDestino,
            status: "aguardando-processamento"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            error: "Erro ao processar o vídeo."
        });
    }
});


app.use((error, req, res, next) => {

    console.error(error);

    res.status(400).json({
        success: false,
        error: error.message || "Erro desconhecido."
    });
});


app.listen(PORT, () => {

    console.log("");
    console.log("=================================");
    console.log("       TRADUTOR IA BACKEND");
    console.log("=================================");
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log("");
});
