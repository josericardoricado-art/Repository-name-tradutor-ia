require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");

const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;


/* ================================
   CONFIGURAÇÃO
================================ */

app.use(cors({
    origin: "*"
}));

app.use(express.json({
    limit: "10mb"
}));


/* ================================
   PASTAS
================================ */

const uploadsDir =
    path.join(__dirname, "uploads");

const audioDir =
    path.join(__dirname, "audio");

const outputDir =
    path.join(__dirname, "output");


[
    uploadsDir,
    audioDir,
    outputDir
].forEach(dir => {

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
            recursive: true
        });
    }

});


/* ================================
   UPLOAD
================================ */

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

                const ext =
                    path.extname(
                        file.originalname
                    );

                const filename =
                    `video-${Date.now()}${ext}`;

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


/* ================================
   TESTE DO SERVIDOR
================================ */

app.get("/", (req, res) => {

    res.json({

        success: true,

        app:
            "Tradutor IA",

        status:
            "online",

        message:
            "Backend funcionando!"

    });

});


app.get("/api/status", (req, res) => {

    res.json({

        success: true,

        online:
            true,

        service:
            "Tradutor IA"

    });

});


/* ================================
   EXTRAIR ÁUDIO
================================ */

function extractAudio(videoPath) {

    return new Promise(
        (resolve, reject) => {

            const audioName =
                `audio-${Date.now()}.wav`;

            const audioPath =
                path.join(
                    audioDir,
                    audioName
                );


            ffmpeg(videoPath)

                .noVideo()

                .audioCodec("pcm_s16le")

                .audioChannels(1)

                .audioFrequency(16000)

                .format("wav")

                .on("start", command => {

                    console.log(
                        "FFmpeg iniciado:"
                    );

                    console.log(command);

                })

                .on("progress", progress => {

                    console.log(
                        "Processando áudio:",
                        progress.percent
                    );

                })

                .on("end", () => {

                    console.log(
                        "Áudio extraído:"
                    );

                    console.log(audioPath);

                    resolve(audioPath);

                })

                .on("error", error => {

                    console.error(
                        "Erro FFmpeg:",
                        error
                    );

                    reject(error);

                })

                .save(audioPath);

        }
    );

}


/* ================================
   UPLOAD + EXTRAÇÃO
================================ */

app.post(
    "/api/upload",
    upload.single("video"),
    async (req, res) => {

        try {

            if (!req.file) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Nenhum vídeo foi enviado."

                });

            }


            const idiomaOrigem =
                req.body.idiomaOrigem ||
                "auto";

            const idiomaDestino =
                req.body.idiomaDestino ||
                "pt-BR";


            console.log("");
            console.log(
                "=============================="
            );

            console.log(
                "NOVO VÍDEO"
            );

            console.log(
                "Arquivo:",
                req.file.filename
            );

            console.log(
                "Origem:",
                idiomaOrigem
            );

            console.log(
                "Destino:",
                idiomaDestino
            );


            const videoPath =
                req.file.path;


            /*
             * PRIMEIRA ETAPA REAL:
             *
             * vídeo
             * ↓
             * áudio WAV
             */

            const audioPath =
                await extractAudio(
                    videoPath
                );


            console.log(
                "Áudio pronto:",
                audioPath
            );


            /*
             * Por enquanto retornamos
             * o áudio para confirmar
             * que o FFmpeg funcionou.
             */

            res.json({

                success:
                    true,

                message:
                    "Vídeo recebido e áudio extraído.",

                video:
                    req.file.filename,

                audio:
                    path.basename(
                        audioPath
                    ),

                idiomaOrigem:
                    idiomaOrigem,

                idiomaDestino:
                    idiomaDestino,

                status:
                    "audio-extraido"

            });


        } catch (error) {

            console.error(error);

            res.status(500).json({

                success:
                    false,

                error:
                    "Erro ao processar o vídeo.",

                details:
                    error.message

            });

        }

    }
);


/* ================================
   LINK
================================ */

app.post(
    "/api/dub-from-url",
    async (req, res) => {

        try {

            const {
                url,
                idiomaOrigem,
                idiomaDestino
            } = req.body;


            if (!url) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "O link do vídeo é obrigatório."

                });

            }


            let videoURL;

            try {

                videoURL =
                    new URL(url);

            } catch {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Link inválido."

                });

            }


            console.log(
                "Novo pedido por link:"
            );

            console.log(
                videoURL.href
            );


            /*
             * Nesta etapa não fazemos
             * download automático de redes
             * sociais.
             *
             * Primeiro vamos testar o
             * processamento de arquivos
             * enviados pelo usuário.
             */

            res.json({

                success:
                    true,

                status:
                    "link-recebido",

                message:
                    "Link recebido. A fonte precisa permitir acesso ao vídeo.",

                url:
                    videoURL.href,

                idiomaOrigem:
                    idiomaOrigem ||
                    "auto",

                idiomaDestino:
                    idiomaDestino ||
                    "pt-BR"

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success:
                    false,

                error:
                    "Erro ao processar o link."

            });

        }

    }
);


/* ================================
   ERROS
================================ */

app.use(
    (error, req, res, next) => {

        console.error(error);

        res.status(400).json({

            success:
                false,

            error:
                error.message ||
                "Erro desconhecido."

        });

    }
);


/* ================================
   SERVIDOR
================================ */

app.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "================================"
        );

        console.log(
            "       TRADUTOR IA"
        );

        console.log(
            "================================"
        );

        console.log(
            `Servidor na porta ${PORT}`
        );

        console.log("");

    }
);
