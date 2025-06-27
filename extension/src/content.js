
    import { NoRepeatNGramLogitsProcessor } from "@huggingface/transformers";
import { Readability } from "@mozilla/readability";

if (!window.location.href.includes(chrome.runtime.getURL('popup.html'))) {
  


    const button = document.createElement('button');
    button.textContent = '📂 Summary';
    button.className = 'collapsible';
    button.style.cssText = `
      background-color: #f1f1f1;
      color: #333;
      cursor: pointer;
      padding: 10px;
      width: 100%;
      border: none;
      text-align: left;
      font-size: 16px;
      margin-bottom: 5px;
    `;
  
    const button2 = document.createElement('button');
    button2.textContent = '❓ Practice Questions (generated questions and answers may be inaccurate or nonsensical. Reload the page for new questions)';
    button2.className = 'collapsible';
    button2.style.cssText = `
      background-color: #f1f1f1;
      color: #333;
      cursor: pointer;
      padding: 10px;
      width: 100%;
      border: none;
      text-align: left;
      font-size: 16px;
      margin-bottom: 5px;
    `;

 
  
    
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';
    contentDiv.style.cssText = `
      display: block;
      padding: 0 18px;
      background-color: white;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.2s ease-out;
    `;

    const contentDiv2 = document.createElement('div');
    contentDiv2.className = 'content2';
    contentDiv2.style.cssText = `
      display: block;
      padding: 0 18px;
      background-color: white;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.2s ease-out;
    `;


    const spinner = document.createElement('div');
spinner.style.cssText = `
  border: 4px solid #f3f3f3; /* Light grey */
  border-top: 4px solid #3498db; /* Blue */
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
  margin: 10px auto;
  display: none; /* hidden by default */
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;
document.head.appendChild(styleSheet);

contentDiv.appendChild(spinner);

    const clone = document.cloneNode(true);
    const reader = new Readability(clone);
    const article = reader.parse();

    const sentences = article.textContent.match(/[^.!?]+[.!?]+/g) || [article.textContent];

    const chunks = [];
    const chunks2 = [];

    let currentChunk = '';
    let currentChunk2 = '';

    const maxChunkLength = Math.ceil(article.textContent.length / 4);
    const maxChunkLength2 = Math.ceil(article.textContent.length / 10);


    for(const sentence of sentences)
    {
      // console.log(sentence);
      if((currentChunk + sentence).length > maxChunkLength)
      {
        // console.log("Pushing Current Chunk   " + currentChunk);
        chunks.push(currentChunk.trim());

        currentChunk = '';
        if(sentence.length > maxChunkLength) 
          { 
            // console.log("Sentence too long, pushing sentence as a chunk   " + sentence);
            chunks.push(sentence.trim());
          }
      }
      else
      {
        currentChunk += sentence;
        // console.log("Adding sentence to current chunk:    " + currentChunk);
      }
    }

    // console.log(article.textContent);

    if(currentChunk)
    {
      if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
      }
    }



    async function summarizeAndAppend(part) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'classify', text: part }, (response) => {
      const summary = response?.[0]?.summary_text || 'No summary';
      // console.log(summary);
      const p = document.createElement('p');
      p.textContent = summary;
      p.style.marginBottom = '1em'; 
      contentDiv.appendChild(p);

       if (isOpen) {
        contentDiv.style.maxHeight = contentDiv.scrollHeight + "px";
      }

      resolve();
    });
  });
}

async function qgen(part) {
  // console.log("Generating");
  if (!document.getElementById('qa-style')) {
    const style = document.createElement('style');
    style.id = 'qa-style';
    style.textContent = `
      .qa-block {
        position: relative;
        margin: 10px 0;
        padding: 10px;
        border: 1px solid #ccc;
        width: fit-content;
        cursor: pointer;
        background-color: #f9f9f9;
        border-radius: 4px;
      }

      .qa-question {
        font-weight: bold;
      }

      .qa-answer {
        display: none;
        margin-top: 6px;
        color: #007700;
      }

      .qa-block:hover .qa-answer {
        display: block;
      }
    `;
    document.head.appendChild(style);
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'q-generate', text: part }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Runtime error:", chrome.runtime.lastError.message);
        return resolve();
      }

      const question = response?.question || 'No question generated';
      const answer = response?.answer || 'No answer available';

      const qadiv = document.createElement('div');
      qadiv.className = 'qa-block';

      const questionDiv = document.createElement('div');
      questionDiv.className = 'qa-question';
      questionDiv.textContent = question;

      const answerDiv = document.createElement('div');
      answerDiv.className = 'qa-answer';
      answerDiv.textContent = answer;

      qadiv.appendChild(questionDiv);
      qadiv.appendChild(answerDiv);

      contentDiv2.appendChild(qadiv);

      // console.log("Generated Q&A:");
      // console.log("Q:", question);
      // console.log("A:", answer);

       if (isOpenQuestoins) {
        contentDiv2.style.maxHeight = contentDiv2.scrollHeight + "px";
      }

      resolve();
    });
  });
}



   async function summarizeAndReplace(part) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'classify-long', text: part }, (response) => {
      const summary = response?.[0]?.summary_text || 'No summary';
      // console.log(summary);
      contentDiv.innerHTML = `<p>${summary}</p>`

       if (isOpen) {
        contentDiv.style.maxHeight = contentDiv.scrollHeight + "px";
      }

      resolve();
    });
  });
}

async function summarizeInOrder() {
  spinner.style.display = "block";
    chrome.storage.local.set({ isReady: false });

  for (let j = 0; j < chunks.length; j++) {
    try {
      await summarizeAndAppend(chunks[j]);
    } catch (err) {
      console.warn("Summary append failed for chunk", j, err);
    }
  }

  try {
    await summarizeAndReplace(article.textContent); // final full summary
  } catch (err) {
    console.warn("Full summary failed", err);
  }

  let questionCount = 0;
  let i = 0;

  while (i < chunks.length) {
    const part = chunks[i];
    try {
      await qgen(part);
      i++;
    } catch (err) {
      console.warn("Q generation failed for chunk", i, err);
    }
    
  }

  chrome.storage.local.set({ isReady: true });
  spinner.style.display = "none";
}

summarizeInOrder();

function showDefinitionTooltip(word, definitions) {
  let tooltip = document.getElementById('definition-tooltip');
  
  if(tooltip)
    {
      tooltip.style.display = 'block';
    }

  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'definition-tooltip';
    tooltip.style.position = 'fixed';
    tooltip.style.background = 'rgb(174, 255, 181)'; 
    tooltip.style.color = 'rgb(62, 83, 62)';     
    tooltip.style.border = '1px solid rgb(151, 253, 110)';
    tooltip.style.padding = '10px';
    tooltip.style.zIndex = 9999;
    tooltip.style.boxShadow = '0px 2px 6px rgba(0,0,0,0.15)';
    document.body.appendChild(tooltip);
  }

  var defs = [];

  for(var def of definitions)
    {
      defs.push(def.definition);
    }

  // tooltip.textContent = `${word}: ${defs.join(' ')}`;
  tooltip.innerHTML = `<strong>${word}:</strong><br>` + 
  defs.map(def => `&nbsp;&nbsp;&nbsp;&nbsp;• ${def}`).join('<br>');

  const range = window.getSelection().getRangeAt(0);
  const rect = range.getBoundingClientRect();

  tooltip.style.top = `${window.screenTop + 10}px`;
  tooltip.style.left = `${window.screenLeft + 10}px`;
}


  document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  const text = selection.toString().trim();

  if (text && text.split(/\s+/).length === 1) 
    { 
      fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${text}`)
      .then(response => response.json())
      .then(data => 
        {
          showDefinitionTooltip(text, data[0].meanings[0].definitions);
        })
      .catch(err => 
        {
          console.warn("Bad");
        })
  }
  else
  {
      let tooltip = document.getElementById('definition-tooltip');
      tooltip.style.display = 'none';
  }
});

  let isOpen = false;
  let isOpenQuestoins = false;


  button.addEventListener("click", function () {
    isOpen = !isOpen;

    if (isOpen) {
      contentDiv.style.maxHeight = contentDiv.scrollHeight + "px";
      button.style.backgroundColor = "#ccc";
    } else {
      contentDiv.style.maxHeight = "0";
      button.style.backgroundColor = "#f1f1f1";
    }
  });

   button2.addEventListener("click", function () {
    isOpenQuestoins = !isOpenQuestoins;

    if (isOpenQuestoins) {
      contentDiv2.style.maxHeight = contentDiv2.scrollHeight + "px";
      button2.style.backgroundColor = "#ccc";
    } else {
      contentDiv2.style.maxHeight = "0";
      button2.style.backgroundColor = "#f1f1f1";
    }
  });

  
    const firstParagraph = document.querySelector('p');
    const firstHeading = document.querySelector('h1');
    const firstH2 = document.querySelector('h2');

    var first = null;
    if(firstParagraph)
    {
      first = firstParagraph
    }
    if(firstH2)
    {
      first = firstH2;
    }
    if(firstHeading)
    {
      first = firstHeading;
    }
    

    switch (first) {
      case firstParagraph:
        firstParagraph.parentNode.insertBefore(button, firstParagraph);
        firstParagraph.parentNode.insertBefore(button2, firstParagraph);

        firstParagraph.parentNode.insertBefore(contentDiv, firstParagraph);
        firstParagraph.parentNode.insertBefore(contentDiv2, firstParagraph);

        break;
      case firstHeading:
        firstHeading.parentNode.insertBefore(button, firstHeading);
        firstHeading.parentNode.insertBefore(button2, firstHeading);
        firstHeading.parentNode.insertBefore(contentDiv, firstHeading);
        firstHeading.parentNode.insertBefore(contentDiv2, firstHeading);

        break;
      case firstH2:
        firstH2.parentNode.insertBefore(button, firstH2);
        firstH2.parentNode.insertBefore(button2, firstH2);

        firstH2.parentNode.insertBefore(contentDiv, firstH2);
        firstH2.parentNode.insertBefore(contentDiv2, firstH2);

        break;
      case null:
        document.body.insertBefore(button, document.body.firstChild);
        document.body.insertBefore(button2, document.body.firstChild);

        document.body.insertBefore(contentDiv, document.body.firstChild);
        document.body.insertBefore(contentDiv2, document.body.firstChild);

      default:
        break;
    }
  }
  
