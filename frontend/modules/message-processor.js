import {
    chatBox
} from './dom-elements.js'

import {
    generateGUID
} from './utils.js'

// Display a message in the chat box
function displayMessage(message, rawMessage = "", isUser = true, dateString = null) {
    const messageDiv = document.createElement('div');
    const messageTime = document.createElement('div');
    
    messageDiv.className = isUser ? 'user-message' : 'bot-message';
    messageTime.className = 'message-time';
    messageTime.style.textAlign = isUser ? 'right' : 'left';

    // Process message: Parse Markdown, format code, and handle file references
    message = processMessage(isUser ? rawMessage : message);

    messageDiv.innerHTML = message;
    messageTime.innerHTML = dateString ? dateString : new Date().toLocaleTimeString();

    chatBox.appendChild(messageTime);
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
        // message = formatBlockCode(message); // Handle block-level code
        message = formatInlineCode(message); // Handle inline code
        message = processFileReferences(message); // Handle file references
        // message = formatNewlines(message); // Handle newlines
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

function formatNewlines(message) {
    return message.replace(/(?:\r\n|\r|\n)/g, "<br>");
}

// Handle block-level code formatting
function formatBlockCode(message) {
    const blockCodeRegex = /```(\w+)?\n([\s\S]+?)\n```/g;
    return message.replace(blockCodeRegex, (match, lang, code) => {
        const languageClass = lang ? `language-${lang}` : 'language-text';
        const codeBlockId = generateGUID();
        return `<button class="copy-code-button">Copy Code</button><pre class="${languageClass}"><code data-code-id="${codeBlockId}">${code}</code></pre>`;
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

export { 
    displayMessage, 
    processMessage, 
    parseMarkdown, 
    formatNewlines, 
    formatBlockCode, 
    formatInlineCode, 
    processFileReferences 
};