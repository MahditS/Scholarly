// background.js - Handles requests from the UI, runs the model, then sends back a response

import { pipeline   } from '@huggingface/transformers';
class PipelineSingleton {
    static task = 'summarization';
    static model = 'Xenova/distilbart-cnn-6-6';
    static instance = null;

    static async getInstance(progress_callback = null) {
        this.instance ??= pipeline(this.task, this.model, { progress_callback });

        return this.instance;
    }

}

let isReady = false;


const classify = async (text) => {

    if (PipelineSingleton.task !== 'summarization' || PipelineSingleton.model !== 'Xenova/distilbart-cnn-6-6') {
    PipelineSingleton.task = 'summarization';
    PipelineSingleton.model = 'Xenova/distilbart-cnn-6-6';
    PipelineSingleton.instance = null;
}


    let model = await PipelineSingleton.getInstance((data) => 
        {
        });


    // Actually run the model on the input text
    let result = await model(text, {min_length : 40, max_length : 50});
    
    return result;
};

const qgeneration = async (text) => {

    if (PipelineSingleton.task !== 'text2text-generation' || PipelineSingleton.model !== 'Xenova/flan-t5-base') {
    PipelineSingleton.task = 'text2text-generation';
    PipelineSingleton.model = 'Xenova/flan-t5-base';
    PipelineSingleton.instance = null;
}

    function buildPrompt(context) {
  return `
Generate ONE clear factual question that can be answered *verbatim* from the context.
Context:
"""${context.trim()}"""
Question:
`;
}

const prompt = buildPrompt(text);
const qaModel = await pipeline(
  'text2text-generation',
  'Xenova/flan-t5-base'
);
const [{ generated_text }] = await qaModel(prompt, {
  max_new_tokens: 40,
  temperature: 0.5,   // lower = safer, less nonsense
  top_p: 0.9,
  do_sample: true     // turn off (false) if you want deterministic output
});

  return generated_text;
};

const qgenerationLong = async (text) => {

    if (PipelineSingleton.task !== 'text2text-generation' || PipelineSingleton.model !== 'Xenova/t5-base') {
    PipelineSingleton.task = 'text2text-generation';
    PipelineSingleton.model = 'Xenova/t5-base';
    PipelineSingleton.instance = null;
}


    let model = await PipelineSingleton.getInstance((data) => 
        {
        });


 let result = await model(text, {
        max_new_tokens: 200, 
        do_sample: true,
        temperature: 0.075,
    });    
    return result;
};

const qanswering = async (question, context) => {
    if (PipelineSingleton.task !== 'question-answering' || PipelineSingleton.model !== 'Xenova/distilbert-base-uncased-distilled-squad') {
        PipelineSingleton.task = 'question-answering';
        PipelineSingleton.model = 'Xenova/distilbert-base-uncased-distilled-squad';
        PipelineSingleton.instance = null;
    }

    const answerer = await pipeline('question-answering', 'Xenova/distilbert-base-uncased-distilled-squad');
    const output = await answerer({question, context});

    return output;
};



const classifyLong = async (text) => {
    // console.log("Classifying Long");
    if (PipelineSingleton.task !== 'summarization' || PipelineSingleton.model !== 'Xenova/distilbart-cnn-6-6') {
    PipelineSingleton.task = 'summarization';
    PipelineSingleton.model = 'Xenova/distilbart-cnn-6-6';
    PipelineSingleton.instance = null;
}


    let model = await PipelineSingleton.getInstance((data) => 
        {
        });


    // Actually run the model on the input text
    let result = await model(text, {min_length : 100, max_length : 200});
    
    return result;
};

chrome.runtime.onInstalled.addListener(function () {
    // Register a context menu item that will only show up for selection text.
    chrome.contextMenus.create({
        id: 'classify-selection',
        title: 'Classify "%s"',
        contexts: ['selection'],
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    // Ignore context menu clicks that are not for classifications (or when there is no input)
    if (info.menuItemId !== 'classify-selection' || !info.selectionText) return;

    // Perform classification on the selected text
    let result = await classify(info.selectionText);

    // Do something with the result
    chrome.scripting.executeScript({
        target: { tabId: tab.id },    // Run in the tab that the user clicked in
        args: [result],               // The arguments to pass to the function
        function: (result) => {       // The function to run
            // NOTE: This function is run in the context of the web page, meaning that `document` is available.
            // console.log('result', result)
            // console.log('document', document)
        },
    });
});

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // console.log('sender', sender)

      if (message.action === 'processing-complete') {
        isReady = true;
        // console.log("Background: processing complete.");
        return;
    }

    if (message.action === 'check-status') {
        sendResponse({ status: isReady ? 'ready' : 'busy' });
        return true;
    }
    
    if (message.action == 'classify') 
    {
    (async function () {
        let result = await classify(message.text);

        sendResponse(result);
    })();

     return true;
    }

    if (message.action == 'classify-long') 
    {
    (async function () {
        let result = await classifyLong(message.text);

        sendResponse(result);
    })();

     return true;
    }

    if (message.action == 'q-generate') 
    {
    (async function () {
        // console.log("Generating");
        let question = await qgeneration(message.text);
        console.log(question);
        // console.log(answerPrompt);
        console.log(message.text);

        let answer = await qgenerationLong(`question: ${question} context: ${message.text}`);
        let result = {question: question,answer: answer[0].generated_text};
        
        sendResponse(result);
    })();

     return true;
    }

    if (message.action == 'q-answer') {
    (async function () {
        try {
            const [question, context] = message.text.split('^');
            const answer = await qgenerationLong(`question: ${question} context: ${context}`);
            sendResponse(answer);
        } catch (e) {
            console.error("Error in q-answer:", e);
            sendResponse({ error: e.message || "Unknown error" });
        }
    })();

    return true;
}


   
});

