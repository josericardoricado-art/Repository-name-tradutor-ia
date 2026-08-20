const videoUrl = document.getElementById("videoUrl");
const previewUrlButton = document.getElementById("previewUrlButton");
const videoPreview = document.getElementById("videoPreview");
const dubVideoButton = document.getElementById("dubVideoButton");
const dubStatus = document.getElementById("dubStatus");

const sourceLanguage =
    document.getElementById("sourceLanguage");

const targetLanguage =
    document.getElementById("targetLanguage");

previewUrlButton.addEventListener("click", () => {

    const url = videoUrl.value.trim();

    if (!url) {
        videoPreview.innerHTML =
            "<p>⚠️ Cole um link primeiro.</p>";
        return;
    }

    videoPreview.innerHTML = `
        <div class="preview-message">
            <span>🔗</span>
            <p>Link recebido.</p>
            <small>
                O backend verificará se essa fonte permite
                acesso ao vídeo.
            </small>
        </div>
    `;
});


dubVideoButton.addEventListener("click", async () => {

    const url = videoUrl.value.trim();

    if (!url) {
        dubStatus.innerHTML =
            "⚠️ Cole o link do vídeo primeiro.";
        return;
    }

    dubStatus.innerHTML =
        "⏳ Enviando vídeo para o processamento...";

    dubVideoButton.disabled = true;

    try {

        /*
         * IMPORTANTE:
         * Trocaremos esta URL pela URL real
         * do seu backend quando ele estiver
         * publicado.
         */

        const BACKEND_URL =
            "https://SEU-BACKEND.onrender.com";

        const response = await fetch(
            `${BACKEND_URL}/api/dub-from-url`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    url: url,
                    idiomaOrigem:
                        sourceLanguage.value,
                    idiomaDestino:
                        targetLanguage.value
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error ||
                "Não foi possível processar o vídeo."
            );
        }

        dubStatus.innerHTML = `
            ✅ Vídeo enviado!
            <br>
            Status: ${data.status || "processando"}
        `;

    } catch (error) {

        console.error(error);

        dubStatus.innerHTML = `
            ❌ ${error.message}
        `;

    } finally {

        dubVideoButton.disabled = false;

    }

});
