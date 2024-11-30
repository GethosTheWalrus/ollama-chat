const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');

const socket = io("http://" + window.location.host + ":8000");

// Display a message in the chat box
function displayMessage(message, isUser = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = isUser ? 'user-message' : 'bot-message';

    // Process message: Parse Markdown, format code, and handle file references
    message = processMessage(message);

    messageDiv.innerHTML = message;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Apply Prism.js syntax highlighting to new elements
    Prism.highlightAllUnder(messageDiv);

    return messageDiv; // Return the message element for real-time updates
}

// Process the message content with Markdown parsing and formatting
function processMessage(message) {
    try {
        message = parseMarkdown(message); // Parse Markdown
        message = formatBlockCode(message); // Handle block-level code
        message = formatInlineCode(message); // Handle inline code
        message = processFileReferences(message); // Handle file references
    } catch (error) {
        console.error("Error processing message:", error);
    }
    return message;
}

// Parse Markdown using Marked
function parseMarkdown(message) {
    try {
        return marked.parse(message);
    } catch (error) {
        console.error("Markdown parsing failed:", error);
        return message; // Return raw text on failure
    }
}

// Handle block-level code formatting
function formatBlockCode(message) {
    const blockCodeRegex = /```(\w+)?\n([\s\S]+?)\n```/g;
    return message.replace(blockCodeRegex, (match, lang, code) => {
        const languageClass = lang ? `language-${lang}` : 'language-text';
        return `<pre class="${languageClass}"><code>${code}</code></pre>`;
    });
}

// Handle inline code formatting
function formatInlineCode(message) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = message;
    tempDiv.querySelectorAll('code').forEach((codeElement) => {
        if (codeElement.parentElement.tagName.toLowerCase() !== 'pre') {
            codeElement.classList.add('inline-code');
        }
    });
    return tempDiv.innerHTML;
}

// Handle file references to avoid them being treated as inline code
function processFileReferences(message) {
    const fileRefRegex = /(\.\w+)(?=\s|$)/g;
    return message.replace(fileRefRegex, '<span class="file-reference">$1</span>');
}

// Disable send button and input
function disableSendButton() {
    sendButton.disabled = true;
    sendButton.classList.add('disabled');
    messageInput.disabled = true;
}

// Enable send button and input
function enableSendButton() {
    sendButton.disabled = false;
    sendButton.classList.remove('disabled');
    messageInput.disabled = false;
    messageInput.placeholder = "Type your message...";
}

// Function to add the rainbow glow animation to the input field
function startProcessing() {
    messageInput.classList.add("processing"); // Add the glow effect
    sendButton.disabled = true; // Disable the send button while processing
}

// Function to stop the rainbow glow animation and re-enable the send button
function stopProcessing() {
    messageInput.classList.remove("processing"); // Remove the glow effect
    sendButton.disabled = false; // Re-enable the send button after processing
}

// Send a prompt to the server
function sendPrompt(prompt = messageInput.value.trim()) {
    if (!prompt) return;
    socket.emit("chat", { text: prompt });
    messageInput.placeholder = "Thinking...";
    displayMessage(prompt); // Show the user's message
    messageInput.value = '';
    startProcessing(); // Start the glow effect while processing
    disableSendButton();
}

// Handle streamed bot response
let currentBotMessageDiv = null;
let accumulatedResponse = "";

socket.on("response", (data) => {
    stopProcessing();
    accumulatedResponse += data.message;
    messageInput.placeholder = "Answering...";
    if (!currentBotMessageDiv) {
        currentBotMessageDiv = displayMessage('', false);
    }
    currentBotMessageDiv.innerHTML = processMessage(accumulatedResponse);
    Prism.highlightAllUnder(currentBotMessageDiv); // Apply syntax highlighting
    chatBox.scrollTop = chatBox.scrollHeight;
});

// Handle the end of the response
socket.on("response_end", () => {
    currentBotMessageDiv = null;
    accumulatedResponse = "";
    enableSendButton();
});

// Handle errors
socket.on("error", (error) => {
    console.error("Socket error:", error);
    messageInput.placeholder = "Chat with Ollama...";
    stopProcessing(); // Stop the glow effect in case of error
});

// Attach event listeners
sendButton.addEventListener('click', () => sendPrompt());
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendPrompt();
});
