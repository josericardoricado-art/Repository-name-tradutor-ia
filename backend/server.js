require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const OpenAI = require("openai");

const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

/* =====================================
   OPENAI
===================================== */

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

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

const audioDir =
    path.join(__dirname, "audio");

const outputDir =
    path.join(__dirname, "output");

[
    uploadsDir,
    audioDir,
    outputDir
].forEach((dir) => {

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
            recursive: true
        });
    }

});

/* =====================================
   ARQUIVOS PÚBLICOS
===================================== */

app.use(
    "/videos",
    express.static(outputDir)
);

/* =====================================
   UPLOAD
===================================== */

const storage =
    multer.diskStorage({

        destination: function (
            req,
            file,
            cb
        ) {

            cb(
                null,
                uploadsDir
            );

        },

        filename: function (
            req,
            file,
            cb
        ) {

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
   TESTE
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

        online: true,

        openai:
            !!process.env.OPENAI_API_KEY

    });

});

/* =====================================
   EXTRAIR ÁUDIO
===================================== */

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

                .audioCodec(
                    "pcm_s16le"
                )

                .audioChannels(1)

                .audioFrequency(16000)

                .format("wav")

                .on("start", (command) => {

                    console.log(
                        "FFmpeg iniciou:"
                    );

                    console.log(
                        command
                    );

                })

                .on("progress", (progress) => {

                    if (
                        progress.percent
                    ) {

                        console.log(
                            `Áudio: ${progress.percent.toFixed(1)}%`
                        );

                    }

                })

                .on("end", () => {

                    console.log(
                        "Áudio extraído:"
                    );

                    console.log(
                        audioPath
                    );

                    resolve(
                        audioPath
                    );

                })

                .on("error", (error) => {

                    console.error(
                        "Erro ao extrair áudio:",
                        error
                    );

                    reject(
                        error
                    );

                })

                .save(audioPath);

        }
    );

}

/* =====================================
   TRANSCRIÇÃO
===================================== */

async function transcribeAudio(
    audioPath
) {

    console.log(
        "Iniciando transcrição..."
    );

    const transcription =
        await openai
            .audio
            .transcriptions
            .create({

                file:
                    fs.createReadStream(
                        audioPath
                    ),

                model:
                    "gpt-4o-mini-transcribe",

                response_format:
                    "text"

            });

    console.log(
        "Transcrição concluída."
    );

    return transcription;
}

/* =====================================
   TRADUÇÃO
===================================== */

async function translateText(
    text,
    targetLanguage
) {

    console.log(
        "Iniciando tradução..."
    );

    const languageNames = {

        "pt-BR":
            "português do Brasil",

        "en":
            "inglês",

        "es":
            "espanhol",

        "fr":
            "francês",

        "de":
            "alemão",

        "it":
            "italiano",

        "ja":
            "japonês",

        "ko":
            "coreano",

        "zh":
            "chinês"

    };

    const target =
        languageNames[
            targetLanguage
        ] ||
        targetLanguage;


    const response =
        await openai.responses.create({

            model:
                "gpt-5-mini",

            instructions:
                `Você é um tradutor profissional.
Traduza o texto para ${target}.
Preserve o significado, o tom e o contexto.
Não explique a tradução.
Retorne somente o texto traduzido.`,

            input:
                text

        });


    console.log(
        "Tradução concluída."
    );

    return response.output_text;
}

/* =====================================
   UPLOAD + TRANSCRIÇÃO + TRADUÇÃO
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


            if (
                !process.env.OPENAI_API_KEY
            ) {

                return res.status(500).json({

                    success: false,

                    error:
                        "OPENAI_API_KEY não configurada no servidor."

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
                "================================"
            );

            console.log(
                "NOVO PROCESSAMENTO"
            );

            console.log(
                "Vídeo:",
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


            /* =========================
               1. EXTRAIR ÁUDIO
            ========================= */

            const audioPath =
                await extractAudio(
                    req.file.path
                );


            /* =========================
               2. TRANSCRIÇÃO
            ========================= */

            const transcription =
                await transcribeAudio(
                    audioPath
                );


            if (
                !transcription ||
                !transcription.trim()
            ) {

                throw new Error(
                    "Não foi possível encontrar fala no vídeo."
                );

            }


            /* =========================
               3. TRADUÇÃO
            ========================= */

            const translation =
                await translateText(
                    transcription,
                    idiomaDestino
                );


            /* =========================
               4. RESPOSTA
            ========================= */

            res.json({

                success: true,

                status:
                    "traducao-concluida",

                message:
                    "Vídeo transcrito e traduzido com sucesso.",

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

                transcription:
                    transcription,

                translation:
                    translation

            });


        } catch (error) {

            console.error(
                "ERRO:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    "Erro ao processar o vídeo.",

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

        try {

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


            let parsed;

            try {

                parsed =
                    new URL(url);

            } catch {

                return res.status(400).json({

                    success: false,

                    error:
                        "Link inválido."

                });

            }


            /*
             * Nesta etapa o endpoint
             * recebe e valida a URL.
             *
             * O processamento automático
             * depende de a fonte permitir
             * acesso ao vídeo.
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

            console.error(
                error
            );

            res.status(500).json({

                success: false,

                error:
                    "Erro ao processar o link."

            });

        }

    }
);

/* =====================================
   ERROS
===================================== */

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            error
        );

        res.status(500).json({

            success: false,

            error:
                error.message ||
                "Erro interno do servidor."

        });

    }
);

/* =====================================
   SERVIDOR
===================================== */

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

        console.log(
            "OpenAI:",
            process.env.OPENAI_API_KEY
                ? "CONFIGURADA"
                : "NÃO CONFIGURADA"
        );

    }
);
