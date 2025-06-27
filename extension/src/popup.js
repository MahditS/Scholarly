const questionInput = document.getElementById('text');
const contextInput = document.getElementById('text2');
const submitButton = document.getElementById('sub');
const outputElement = document.getElementById('output');
document.querySelectorAll('.content, .content2').forEach(el => el.remove());



if (!questionInput || !contextInput || !submitButton || !outputElement) {
    console.error("Missing required DOM elements");
} else {
    submitButton.addEventListener('click', () => {
        const question = questionInput.value.trim();
        const context = contextInput.value.trim();

        chrome.storage.local.get(['isReady'], (result) => {
            const isReady = result.isReady;

            if (isReady) {
                const message = {
                    action: 'q-answer',
                    text: `${question} ^ ${context}`,
                };

                chrome.runtime.sendMessage(message, (response) => {
                    outputElement.innerText = response[0].generated_text;
                });
            } else {
                alert("Please wait until the summary and practice questions have been generated!");
            }
        });
    });
}
