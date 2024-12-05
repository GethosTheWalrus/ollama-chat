import {
    messageInput,
    sendButton,
    clearButton,
    modelSelect
} from './dom-elements.js'

import {
    displayMessage
} from './message-processor.js';

import { 
    socket 
} from './socket-handler.js';

import {
    insertAtCaret
} from './utils.js';

// Send a prompt to the server
function sendPrompt(model = modelSelect.value, prompt = messageInput.textContent.trim(), rawPrompt = messageInput.innerHTML) {
    if (!prompt) return;
    socket.emit("chat", { text: prompt, model: model });
    messageInput.placeholder = "Thinking...";
    displayMessage(prompt, rawPrompt); // Show the user's message
    startProcessing(); // Start the glow effect while processing
    disableSendButton();
    clearMessageInput();
}

function clearMessageInput() {
    messageInput.innerHTML = '';
    messageInput.focus();
}

// Disable send button and input
function disableSendButton() {
    sendButton.disabled = true;
    clearButton.disabled = true;
    sendButton.classList.add('disabled');
    clearButton.classList.add('disabled');
    messageInput.classList.add('disabled');
    messageInput.placeholder = "Thinking...";
    messageInput.disabled = true;
}

// Enable send button and input
function enableSendButton() {
    sendButton.disabled = false;
    clearButton.disabled = false;
    sendButton.classList.remove('disabled');
    clearButton.classList.remove('disabled');
    messageInput.disabled = false;
    messageInput.placeholder = "Chat with Ollama...";
}

// Function to add the rainbow glow animation to the input field
function startProcessing() {
    messageInput.classList.add("processing"); // Add the glow effect
    // sendButton.disabled = true; // Disable the send button while processing
    disableSendButton();
}

// Function to stop the rainbow glow animation and re-enable the send button
function stopProcessing() {
    messageInput.classList.remove("processing"); // Remove the glow effect
    // sendButton.disabled = false; // Re-enable the send button after processing
    enableSendButton();
}

function insertCodeBlock() {
    // Ensure messageInput is focused
    messageInput.focus();

    const codeBlockTemplate = `<pre class="language-text"><code>// your code here...</code></pre>`;
    insertAtCaret(messageInput, codeBlockTemplate);

    // Reapply syntax highlighting
    Prism.highlightAllUnder(messageInput);

    // Refocus after insertion to allow further typing
    messageInput.focus();
}

// Insert Bulleted List
function insertBulletedList() {
    messageInput.focus();
    const listTemplate = `<ul><li></li></ul>`;
    insertAtCaret(messageInput, listTemplate);
}

// Insert Numbered List
function insertNumberedList() {
    messageInput.focus();
    const listTemplate = `<ol><li></li></ol>`;
    insertAtCaret(messageInput, listTemplate);
}

export { 
    sendPrompt, 
    clearMessageInput, 
    disableSendButton, 
    enableSendButton, 
    startProcessing, 
    stopProcessing ,
    insertCodeBlock,
    insertBulletedList,
    insertNumberedList
};