import {
    messageInput,
    sendButton,
    clearButton,
    modelSelect,
    insertCodeButton,
    insertBulletedListButton,
    insertNumberedListButton
} from './dom-elements.js'

import {
    displayMessage
} from './message-processor.js';

import { 
    socket 
} from './socket-handler.js';

import {
    insertAtCaret,
    getCookie
} from './utils.js';

// Send a prompt to the server
function sendPrompt(model = modelSelect.value, prompt = messageInput.textContent.trim(), rawPrompt = messageInput.innerHTML) {
    if (!prompt || sendButton.disabled) return;
    socket.emit("chat", { text: prompt, html: rawPrompt, model: model, chatSession: getCookie("chatSession") });
    messageInput.setAttribute("data-placeholder", "Thinking...");
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
    disableButtons();
}

// Enable send button and input
function enableSendButton() {
    enableButtons();
    messageInput.setAttribute("data-placeholder", "Chat with Ollama...");
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

function enableButtons() {
    sendButton.disabled = false;
    clearButton.disabled = false;
    insertCodeButton.disabled = false;
    insertBulletedListButton.disabled = false;
    insertNumberedListButton.disabled = false;
    sendButton.classList.remove('disabled');
    clearButton.classList.remove('disabled');
    messageInput.classList.remove('disabled');
    insertCodeButton.classList.remove('disabled');
    insertBulletedListButton.classList.remove('disabled');
    insertNumberedListButton.classList.remove('disabled');
}

function disableButtons() {
    sendButton.disabled = true;
    clearButton.disabled = true;
    insertCodeButton.disabled = true;
    insertBulletedListButton.disabled = true;
    insertNumberedListButton.disabled = true;
    sendButton.classList.add('disabled');
    clearButton.classList.add('disabled');
    messageInput.classList.add('disabled');
    insertCodeButton.classList.add('disabled');
    insertBulletedListButton.classList.add('disabled');
    insertNumberedListButton.classList.add('disabled');
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