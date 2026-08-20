require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");

const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

/* =====================================
   CONFIGURAÇÃO
===================================== */

app.use(cors({
    origin: "*"
}));

app.use(express.json({
    limit: "10mb"
}));

/* =====================================
   PASTAS
===================================== */

const uploadsDir =
    path.join(__dirname, "uploads");

const outputDir =
    path.join(__dirname, "output");

const audioDir =
    path.join(__dirname, "audio");

[
    uploadsDir,
    outputDir,
    audioDir
].forEach((dir) => {

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
            recursive: true
        });
    }

});

/* =====================================
   SERVIR ARQUIVOS
===================================== */

app.use(
    "/videos",
    express.static(outputDir)
);

app.use(
    "/uploads",
    express.static(uploadsDir)
);

/* =====================================
   UPLOAD
===================================== */

const storage =
    multer.diskStorage({

        destination:
            function (req, file, cb) {

                cb(
                    null,
                    uploadsDir
                );

            },

        filename:
            function (req, file, cb) {

                const extension =
                    path.extname(
                        file.originalname
                    );

                const filename =
                    `video-${Date.now()}${extension}`;

                cb(
                    null,
                    filename
                );

            }

    });

const upload =
    multer({

        storage: storage,

        limits: {

            fileSize:
                500 * 1024 * 1024

        }

    });

/* =====================================
   STATUS
===================================== */

app.get("/", (req, res) => {

    res.json({

        success: true,

        app:
            "Tradutor IA",

        status:
            "online"

    });

});

app.get("/api/status", (req, res) => {

    res.json({

        success: true,

        online: true

    });

});

/* =====================================
   COPIAR VÍDEO PARA OUTPUT
===================================== */

function prepareVideo(videoPath) {

    return new Promise(
        (resolve, reject) => {

            const outputName =
                `video-processado-${Date.now()}.mp4`;

            const outputPath =
                path.join(
                    outputDir,
                    outputName
                );

            ffmpeg(videoPath)

                .videoCodec("libx264")

                .audioCodec("aac")

                .outputOptions([
                    "-movflags",
                    "+faststart"
                ])

                .on("start", (command) => {

                    console.log(
                        "FFmpeg:",
                        command
                    );

                })

                .on("progress", (progress) => {

                    console.log(
                        "Processando:",
                        progress.percent
                    );

                })

                .on("end", () => {

                    console.log(
                        "Vídeo processado:",
                        outputName
                    );

                    resolve(outputName);

                })

                .on("error", (error) => {

                    console.error(
                        "Erro FFmpeg:",
                        error
                    );

                    reject(error);

                })

                .save(outputPath);

        }
    );

}

/* =====================================
   UPLOAD DO VÍDEO
===================================== */

app.post(
    "/api/upload",
    upload.single("video"),
    async (req, res) => {

        try {

            if (!req.file) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Nenhum vídeo foi enviado."

                });

            }

            console.log(
                "Vídeo recebido:",
                req.file.filename
            );

            const outputName =
                await prepareVideo(
                    req.file.path
                );

            const outputUrl =
                `${req.protocol}://${req.get("host")}/videos/${outputName}`;

            res.json({

                success: true,

                status:
                    "video-processado",

                message:
                    "Vídeo processado com sucesso.",

                original:
                    req.file.filename,

                outputUrl:
                    outputUrl,

                idiomaOrigem:
                    req.body.idiomaOrigem ||
                    "auto",

                idiomaDestino:
                    req.body.idiomaDestino ||
                    "pt-BR"

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                error:
                    "Não foi possível processar o vídeo.",

                details:
                    error.message

            });

        }

    }
);

/* =====================================
   LINK
===================================== */

app.post(
    "/api/dub-from-url",
    async (req, res) => {

        const {
            url,
            idiomaOrigem,
            idiomaDestino
        } = req.body;

        if (!url) {

            return res.status(400).json({

                success: false,

                error:
                    "Informe o link do vídeo."

            });

        }

        try {

            const parsed =
                new URL(url);

            console.log(
                "URL recebida:",
                parsed.href
            );

            /*
             * Por enquanto o backend
             * valida e recebe a URL.
             *
             * O download automático de
             * redes sociais será conectado
             * somente às fontes que permitirem
             * esse acesso.
             */

            res.json({

                success: true,

                status:
                    "link-recebido",

                message:
                    "Link recebido. A fonte precisa permitir acesso ao vídeo.",

                url:
                    parsed.href,

                idiomaOrigem:
                    idiomaOrigem ||
                    "auto",

                idiomaDestino:
                    idiomaDestino ||
                    "pt-BR"

            });

        } catch (error) {

            res.status(400).json({

                success: false,

                error:
                    "URL inválida."

            });

        }

    }
);

/* =====================================
   ERROS
===================================== */

app.use(
    (error, req, res, next) => {

        console.error(error);

        res.status(500).json({

            success: false,

            error:
                error.message ||
                "Erro interno do servidor."

        });

    }
);

/* =====================================
   INICIAR
===================================== */

app.listen(
    PORT,
    () => {

        console.log(
            `Tradutor IA rodando na porta ${PORT}`
        );

    }
);
