require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const OpenAI = require("openai");

const app = express();

const PORT = process.env.PORT || 3000;

/*
|--------------------------------------------------------------------------
| OPENAI
|--------------------------------------------------------------------------
*/

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;


/*
|--------------------------------------------------------------------------
| MIDDLEWARE
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));


/*
|--------------------------------------------------------------------------
| PASTAS
|--------------------------------------------------------------------------
*/

const uploadsDir = path.join(__dirname, "uploads");
const outputsDir = path.join(__dirname, "outputs");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, {
    recursive: true,
  });
}

if (!fs.existsSync(outputsDir)) {
  fs.mkdirSync(outputsDir, {
    recursive: true,
  });
}


/*
|--------------------------------------------------------------------------
| ARQUIVOS ESTÁTICOS
|--------------------------------------------------------------------------
*/

app.use(
  "/uploads",
  express.static(uploadsDir)
);

app.use(
  "/outputs",
  express.static(outputsDir)
);


/*
|--------------------------------------------------------------------------
| MULTER
|--------------------------------------------------------------------------
*/

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },

  filename: function (req, file, cb) {
    const extension =
      path.extname(file.originalname) || ".bin";

    const filename =
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .substring(2, 10) +
      extension;

    cb(null, filename);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 500 * 1024 * 1024,
  },
});


/*
|--------------------------------------------------------------------------
| ROTA PRINCIPAL
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.json({
    name: "Keep Tradutor Universal",
    status: "online",
    message: "Backend funcionando no Render",
    version: "1.0.0",
  });
});


/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
*/

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    status: "online",
    service: "Keep Tradutor Universal",
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    ffmpegAvailable: true,
    time: new Date().toISOString(),
  });
});


/*
|--------------------------------------------------------------------------
| TESTE DO BACKEND
|--------------------------------------------------------------------------
*/

app.get("/api/test", (req, res) => {
  res.json({
    ok: true,
    message: "Endpoint funcionando corretamente.",
  });
});


/*
|--------------------------------------------------------------------------
| TRADUÇÃO DE VÍDEO MP4
|--------------------------------------------------------------------------
*/

app.post(
  "/api/translate-video",
  upload.single("video"),
  async (req, res) => {

    let inputFile = null;
    let audioFile = null;

    try {

      if (!req.file) {

        return res.status(400).json({
          ok: false,
          error: "Nenhum vídeo foi enviado.",
        });

      }

      inputFile = req.file.path;

      const sourceLanguage =
        req.body.sourceLanguage || "auto";

      const targetLanguage =
        req.body.targetLanguage || "pt-BR";

      const shouldDubbing =
        req.body.dubbing === "true";

      const shouldTranscription =
        req.body.transcription !== "false";


      /*
      |--------------------------------------------------------------------------
      | EXTRAIR ÁUDIO
      |--------------------------------------------------------------------------
      */

      audioFile = path.join(
        outputsDir,
        `${Date.now()}-audio.mp3`
      );


      await extractAudio(
        inputFile,
        audioFile
      );


      /*
      |--------------------------------------------------------------------------
      | SEM OPENAI
      |--------------------------------------------------------------------------
      */

      if (!openai) {

        return res.json({
          ok: true,

          message:
            "Vídeo recebido e áudio extraído. Configure OPENAI_API_KEY no Render para ativar transcrição, tradução e voz.",

          translation:
            "Backend funcionando. Configure sua chave da OpenAI para ativar a IA.",

          audioUrl:
            `/outputs/${path.basename(audioFile)}`,

          sourceLanguage,
          targetLanguage,
          dubbing: shouldDubbing,
          transcription: shouldTranscription,
        });

      }


      /*
      |--------------------------------------------------------------------------
      | TRANSCRIÇÃO
      |--------------------------------------------------------------------------
      */

      let transcriptionText = "";

      if (shouldTranscription) {

        const transcriptionResponse =
          await openai.audio.transcriptions.create({

            file: fs.createReadStream(
              audioFile
            ),

            model: "gpt-4o-mini-transcribe",

            ...(sourceLanguage !== "auto"
              ? {
                  language:
                    normalizeLanguage(
                      sourceLanguage
                    ),
                }
              : {}),
          });


        transcriptionText =
          transcriptionResponse.text || "";

      }


      /*
      |--------------------------------------------------------------------------
      | TRADUÇÃO
      |--------------------------------------------------------------------------
      */

      let translatedText =
        transcriptionText;


      if (
        transcriptionText &&
        targetLanguage
      ) {

        const translationResponse =
          await openai.responses.create({

            model: "gpt-4o-mini",

            input: `
Traduza o texto abaixo para ${languageName(
              targetLanguage
            )}.

Mantenha o significado natural,
o contexto e o tom da fala.

Não explique a tradução.
Retorne somente o texto traduzido.

Texto:
${transcriptionText}
`,
          });


        translatedText =
          translationResponse.output_text ||
          transcriptionText;

      }


      /*
      |--------------------------------------------------------------------------
      | VOZ
      |--------------------------------------------------------------------------
      */

      let generatedAudioUrl =
        null;


      if (
        shouldDubbing &&
        translatedText
      ) {

        const speechFile =
          path.join(
            outputsDir,
            `${Date.now()}-dubbed.mp3`
          );


        const speechResponse =
          await openai.audio.speech.create({

            model: "gpt-4o-mini-tts",

            voice: "alloy",

            input:
              translatedText,

            response_format:
              "mp3",
          });


        const buffer =
          Buffer.from(
            await speechResponse.arrayBuffer()
          );


        fs.writeFileSync(
          speechFile,
          buffer
        );


        generatedAudioUrl =
          `/outputs/${path.basename(
            speechFile
          )}`;

      }


      /*
      |--------------------------------------------------------------------------
      | RESPOSTA
      |--------------------------------------------------------------------------
      */

      return res.json({

        ok: true,

        message:
          "Vídeo processado com sucesso.",

        transcription:
          transcriptionText,

        translation:
          translatedText,

        audioUrl:
          generatedAudioUrl,

        sourceLanguage,
        targetLanguage,

        dubbing:
          shouldDubbing,

        transcriptionEnabled:
          shouldTranscription,
      });


    } catch (error) {

      console.error(
        "ERRO /api/translate-video:",
        error
      );


      return res.status(500).json({

        ok: false,

        error:
          error.message ||
          "Erro ao processar vídeo.",

      });

    } finally {

      /*
      |--------------------------------------------------------------------------
      | LIMPAR VÍDEO ENVIADO
      |--------------------------------------------------------------------------
      */

      if (
        inputFile &&
        fs.existsSync(inputFile)
      ) {

        try {
          fs.unlinkSync(inputFile);
        } catch {}

      }

    }

  }
);


/*
|--------------------------------------------------------------------------
| TRADUÇÃO DE ÁUDIO
|--------------------------------------------------------------------------
*/

app.post(
  "/api/translate-audio",
  upload.single("audio"),
  async (req, res) => {

    let inputFile = null;

    try {

      if (!req.file) {

        return res.status(400).json({
          ok: false,
          error: "Nenhum áudio foi enviado.",
        });

      }


      inputFile =
        req.file.path;


      const sourceLanguage =
        req.body.sourceLanguage ||
        "auto";

      const targetLanguage =
        req.body.targetLanguage ||
        "pt-BR";

      const shouldDubbing =
        req.body.dubbing !== "false";


      /*
      |--------------------------------------------------------------------------
      | SEM OPENAI
      |--------------------------------------------------------------------------
      */

      if (!openai) {

        return res.json({

          ok: true,

          message:
            "Áudio recebido. Configure OPENAI_API_KEY no Render para ativar a IA.",

          translation:
            "Configure OPENAI_API_KEY no Render.",

          audioUrl:
            null,

        });

      }


      /*
      |--------------------------------------------------------------------------
      | TRANSCRIÇÃO
      |--------------------------------------------------------------------------
      */

      const transcriptionResponse =
        await openai.audio.transcriptions.create({

          file: fs.createReadStream(
            inputFile
          ),

          model:
            "gpt-4o-mini-transcribe",

          ...(sourceLanguage !== "auto"
            ? {
                language:
                  normalizeLanguage(
                    sourceLanguage
                  ),
              }
            : {}),
        });


      const transcriptionText =
        transcriptionResponse.text ||
        "";


      /*
      |--------------------------------------------------------------------------
      | TRADUÇÃO
      |--------------------------------------------------------------------------
      */

      let translatedText =
        transcriptionText;


      if (transcriptionText) {

        const response =
          await openai.responses.create({

            model:
              "gpt-4o-mini",

            input: `
Traduza o texto abaixo para ${languageName(
              targetLanguage
            )}.

Retorne somente a tradução.

Texto:
${transcriptionText}
`,
          });


        translatedText =
          response.output_text ||
          transcriptionText;

      }


      /*
      |--------------------------------------------------------------------------
      | DUBLAGEM
      |--------------------------------------------------------------------------
      */

      let audioUrl =
        null;


      if (
        shouldDubbing &&
        translatedText
      ) {

        const outputFile =
          path.join(
            outputsDir,
            `${Date.now()}-translation.mp3`
          );


        const speech =
          await openai.audio.speech.create({

            model:
              "gpt-4o-mini-tts",

            voice:
              "alloy",

            input:
              translatedText,

            response_format:
              "mp3",
          });


        const buffer =
          Buffer.from(
            await speech.arrayBuffer()
          );


        fs.writeFileSync(
          outputFile,
          buffer
        );


        audioUrl =
          `/outputs/${path.basename(
            outputFile
          )}`;

      }


      return res.json({

        ok: true,

        transcription:
          transcriptionText,

        translation:
          translatedText,

        audioUrl,

        sourceLanguage,
        targetLanguage,

      });


    } catch (error) {

      console.error(
        "ERRO /api/translate-audio:",
        error
      );


      return res.status(500).json({

        ok: false,

        error:
          error.message ||
          "Erro ao processar áudio.",

      });

    } finally {

      if (
        inputFile &&
        fs.existsSync(inputFile)
      ) {

        try {
          fs.unlinkSync(inputFile);
        } catch {}

      }

    }

  }
);


/*
|--------------------------------------------------------------------------
| YOUTUBE
|--------------------------------------------------------------------------
*/

app.post(
  "/api/translate-youtube",
  async (req, res) => {

    try {

      const {
        url,
        videoId,
        sourceLanguage,
        targetLanguage,
        dubbing,
        transcription,
      } = req.body;


      if (!url && !videoId) {

        return res.status(400).json({

          ok: false,

          error:
            "Informe o link do YouTube.",

        });

      }


      /*
      |--------------------------------------------------------------------------
      | IMPORTANTE
      |--------------------------------------------------------------------------
      |
      | O navegador consegue mostrar o YouTube
      | através do iframe.
      |
      | Este endpoint recebe o link e confirma
      | que o backend recebeu a solicitação.
      |
      */

      return res.json({

        ok: true,

        readyForProcessing: false,

        message:
          "Link do YouTube recebido. O vídeo pode ser exibido pelo player incorporado. A captura/dublagem automática do áudio do YouTube precisa de um fluxo específico de processamento no servidor.",

        url:
          url || null,

        videoId:
          videoId || null,

        sourceLanguage:
          sourceLanguage || "auto",

        targetLanguage:
          targetLanguage || "pt-BR",

        dubbing:
          !!dubbing,

        transcription:
          transcription !== false,

      });


    } catch (error) {

      console.error(
        "ERRO /api/translate-youtube:",
        error
      );


      return res.status(500).json({

        ok: false,

        error:
          error.message ||
          "Erro ao processar YouTube.",

      });

    }

  }
);


/*
|--------------------------------------------------------------------------
| FFmpeg
|--------------------------------------------------------------------------
*/

function extractAudio(
  input,
  output
) {

  return new Promise(
    (resolve, reject) => {

      ffmpeg(input)

        .noVideo()

        .audioCodec("libmp3lame")

        .audioBitrate("128k")

        .audioChannels(1)

        .audioFrequency(16000)

        .output(output)

        .on(
          "start",
          command => {

            console.log(
              "FFmpeg:",
              command
            );

          }
        )

        .on(
          "progress",
          progress => {

            console.log(
              "FFmpeg:",
              progress.percent
            );

          }
        )

        .on(
          "end",
          () => {

            resolve();

          }
        )

        .on(
          "error",
          error => {

            reject(error);

          }
        )

        .run();

    }
  );

}


/*
|--------------------------------------------------------------------------
| IDIOMAS
|--------------------------------------------------------------------------
*/

function languageName(
  code
) {

  const languages = {

    "pt-BR":
      "português do Brasil",

    "pt":
      "português",

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
      "chinês",

  };


  return (
    languages[code] ||
    code
  );

}


function normalizeLanguage(
  code
) {

  if (!code) {
    return undefined;
  }


  return code
    .split("-")[0]
    .toLowerCase();

}


/*
|--------------------------------------------------------------------------
| 404
|--------------------------------------------------------------------------
*/

app.use(
  (req, res) => {

    res.status(404).json({

      ok: false,

      error:
        "Endpoint não encontrado.",

      path:
        req.originalUrl,

      method:
        req.method,

    });

  }
);


/*
|--------------------------------------------------------------------------
| ERROS
|--------------------------------------------------------------------------
*/

app.use(
  (
    error,
    req,
    res,
    next
  ) => {

    console.error(
      "ERRO:",
      error
    );


    res.status(500).json({

      ok: false,

      error:
        error.message ||
        "Erro interno do servidor.",

    });

  }
);


/*
|--------------------------------------------------------------------------
| INICIAR SERVIDOR
|--------------------------------------------------------------------------
*/

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      "======================================"
    );

    console.log(
      "Keep Tradutor Universal"
    );

    console.log(
      `Servidor rodando na porta ${PORT}`
    );

    console.log(
      `OpenAI configurada: ${
        !!process.env.OPENAI_API_KEY
      }`
    );

    console.log(
      "======================================"

    );

  }
);
