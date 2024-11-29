const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');

const socket = io("http://localhost:8000");

// Display a message in the chat box
function displayMessage(message, isUser = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = isUser ? 'user-message' : 'bot-message';

    // Parse Markdown content
    message = parseMarkdown(message);

    // Process block-level code first
    message = formatBlockCode(message);

    // Then process inline code
    message = formatInlineCode(message);

    // Handle file references
    message = processFileReferences(message);

    messageDiv.innerHTML = message;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Apply Prism.js syntax highlighting to all code blocks
    Prism.highlightAllUnder(messageDiv);

    return messageDiv; // Return the message element for real-time updates
}

// Parse Markdown content using Marked
function parseMarkdown(message) {
    try {
        // Use Marked to parse Markdown into HTML
        return marked.parse(message);
    } catch (error) {
        console.error("Error parsing Markdown:", error);
        return message; // Fallback to returning the raw message if parsing fails
    }
}

// Function to escape HTML characters to prevent XSS attacks
function escapeHtml(str) {
    return str.replace(/[&<>"'`]/g, (match) => {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '`': '&#96;',
        }[match];
    });
}

// Function to format block-level code
function formatBlockCode(message) {
    const blockCodeRegex = /```(\w+)?\n([\s\S]+?)\n```/g;

    return message.replace(blockCodeRegex, (match, lang, code) => {
        // Escape the code to prevent XSS vulnerabilities
        const escapedCode = escapeHtml(code);

        // Use the specified language for syntax highlighting or default to plain text
        const languageClass = lang ? `language-${lang}` : 'language-text';

        return `<pre class="${languageClass}"><code>${escapedCode}</code></pre>`;
    });
}

// Function to format inline code
function formatInlineCode(message) {
    // Use the existing Markdown-parsed `<code>` elements
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = message;

    tempDiv.querySelectorAll('code').forEach((codeElement) => {
        // Skip block-level code elements (inside <pre>)
        if (codeElement.parentElement.tagName.toLowerCase() === 'pre') return;

        // Add the `inline-code` class to inline code
        codeElement.classList.add('inline-code');
    });

    return tempDiv.innerHTML;
}

// Pre-process message to prevent filenames and file extensions from being treated as inline code
function processFileReferences(message) {
    const fileRefRegex = /(\.\w+)(?=\s|$)/g;
    return message.replace(fileRefRegex, '<span class="file-reference">$1</span>');
}

// Listen for the welcome message
socket.on("message", (data) => {
    console.log("Server:", data.message);
});

// Track the current bot message being constructed
let currentBotMessageDiv = null;
let accumulatedResponse = "";

// Send a prompt to the server
function sendPrompt(prompt = messageInput.value.trim()) {
    if (!prompt) return;
    socket.emit("chat", { text: prompt });
    displayMessage(prompt); // Display the user's message
    messageInput.value = '';
}

// Listen for streamed response chunks
socket.on("response", (data) => {
    console.log("Response chunk:", data.message);

    accumulatedResponse += data.message;

    if (!currentBotMessageDiv) {
        currentBotMessageDiv = displayMessage('', false);
    }

    // Update the message div with the accumulated response
    currentBotMessageDiv.innerHTML = accumulatedResponse;

    // Parse Markdown first
    currentBotMessageDiv.innerHTML = parseMarkdown(currentBotMessageDiv.innerHTML);

    // Process block-level code and then inline code
    currentBotMessageDiv.innerHTML = formatBlockCode(currentBotMessageDiv.innerHTML);
    currentBotMessageDiv.innerHTML = formatInlineCode(currentBotMessageDiv.innerHTML);

    // Apply Prism.js syntax highlighting
    Prism.highlightAllUnder(currentBotMessageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
});

// Listen for the end of the response
socket.on("response_end", () => {
    console.log("Response completed.");
    currentBotMessageDiv = null;
    accumulatedResponse = "";
});

// Attach event listeners
sendButton.addEventListener('click', sendPrompt);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendPrompt();
});
