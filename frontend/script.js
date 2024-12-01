const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const clearButton = document.getElementById('clear-button');
const insertCodeButton = document.getElementById('insert-code-button');
const insertBulletedListButton = document.getElementById('insert-bulleted-list-button');
const insertNumberedListButton = document.getElementById('insert-numbered-list-button');

const socket = io("http://" + window.location.host + ":8000");

// Display a message in the chat box
function displayMessage(message, rawMessage = "", isUser = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = isUser ? 'user-message' : 'bot-message';

    // Process message: Parse Markdown, format code, and handle file references
    message = processMessage(isUser ? rawMessage : message);

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
    clearButton.disabled = true;
    sendButton.classList.add('disabled');
    clearButton.classList.add('disabled');
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

// Send a prompt to the server
function sendPrompt(prompt = messageInput.textContent.trim(), rawPrompt = messageInput.innerHTML) {
    if (!prompt) return;
    socket.emit("chat", { text: prompt });
    messageInput.placeholder = "Thinking...";
    displayMessage(prompt, rawPrompt); // Show the user's message
    clearMessageInput();
    startProcessing(); // Start the glow effect while processing
    disableSendButton();
}

function clearMessageInput() {
    messageInput.innerHTML = '';
    messageInput.focus();
}

// Handle streamed bot response
let currentBotMessageDiv = null;
let accumulatedResponse = "";

socket.on("response", (data) => {
    stopProcessing();
    accumulatedResponse += data.message;
    messageInput.placeholder = "Answering...";
    if (!currentBotMessageDiv) {
        currentBotMessageDiv = displayMessage('', "", false);
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

function insertAtCaret(editableDiv, html) {
    let range, sel;

    // Ensure editableDiv is focused
    const isCursorInsideMessageInput = editableDiv.contains(window.getSelection()?.anchorNode);

    if (window.getSelection && document.createRange) {
        sel = window.getSelection();

        // Set cursor to end of editableDiv if it's not already inside
        if (!isCursorInsideMessageInput) {
            range = document.createRange();
            range.selectNodeContents(editableDiv);
            range.collapse(false); // Place cursor at end
            sel.removeAllRanges();
            sel.addRange(range);
        } else if (sel.rangeCount > 0) {
            range = sel.getRangeAt(0);
        }

        if (range) {
            range.deleteContents(); // Clear any selected text
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const frag = document.createDocumentFragment();
            let node, lastNode;

            while ((node = tempDiv.firstChild)) {
                lastNode = frag.appendChild(node);
            }

            range.insertNode(frag); // Insert the fragment

            if (lastNode) {
                range = range.cloneRange();
                range.setStartAfter(lastNode);
                range.collapse(true); // Place cursor after inserted content
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }
}

function isCursorAtEndOfCodeBlock(range, codeBlock) {
    const codeBlockTextLength = codeBlock.textContent.length;
    const cursorPosition = range.endOffset + getOffsetInParent(range.startContainer, codeBlock);

    return cursorPosition === codeBlockTextLength;
}

function getOffsetInParent(node, parent) {
    let offset = 0;
    let currentNode = node;

    while (currentNode && currentNode !== parent) {
        if (currentNode.previousSibling) {
            offset += currentNode.previousSibling.textContent.length;
        }
        currentNode = currentNode.parentNode;
    }
    return offset;
}

function moveCursorOutOfCodeBlock(codeBlock) {
    const parentElement = codeBlock.parentElement;
    const messageInput = parentElement.closest("#message-input");
    const newRange = document.createRange();
    const selection = window.getSelection();

    if (!codeBlock.nextSibling) {
        // If there is no next sibling, create a new empty paragraph
        const emptyParagraph = document.createElement("p");
        emptyParagraph.innerHTML = "<br>"; // Ensure it is visible
        messageInput.appendChild(emptyParagraph);
        newRange.setStart(emptyParagraph, 0);
    } else {
        // Move the cursor to the start of the next sibling
        newRange.setStart(codeBlock.nextSibling, 0);
    }

    newRange.collapse(true); // Collapse the range to the start
    selection.removeAllRanges();
    selection.addRange(newRange);
}

// function detectLanguageAndApplyHighlighting(codeBlock) {
//     const rawCode = codeBlock.textContent; // Get the code from the block
//     const detected = hljs.highlightAuto(rawCode); // Automatically detect language
    
//     // Apply the detected language and highlighted HTML
//     codeBlock.className = `language-${detected.language}`;
//     codeBlock.innerHTML = detected.value;

//     console.log(`Detected language: ${detected.language}`); // For debugging
// }

// Attach event listeners
let timeout;
sendButton.addEventListener('click', () => sendPrompt());

clearButton.addEventListener('click', () => clearMessageInput());

insertCodeButton.addEventListener('click', insertCodeBlock);

insertBulletedListButton.addEventListener('click', insertBulletedList);

insertNumberedListButton.addEventListener('click', insertNumberedList);

messageInput.addEventListener('keydown', (e) => {
    if (e.key === "ArrowDown") {
        const selection = window.getSelection();
        if (!selection.rangeCount) return; // No selection, exit

        const range = selection.getRangeAt(0);

        // Ensure we're working with an element
        const containerElement =
            range.startContainer.nodeType === Node.ELEMENT_NODE
                ? range.startContainer
                : range.startContainer.parentElement;

        if (containerElement) {
            const codeBlock = containerElement.closest("pre");

            if (codeBlock) {
                // Check if the cursor is at the end of the code block
                if (isCursorAtEndOfCodeBlock(range, codeBlock)) {
                    e.preventDefault(); // Prevent default down arrow behavior
                    moveCursorOutOfCodeBlock(codeBlock);
                }
            }
        }
    }
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.shiftKey) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const containerElement =
            range.startContainer.nodeType === Node.ELEMENT_NODE
                ? range.startContainer
                : range.startContainer.parentElement;

        const listItem = containerElement.closest('li');
        const list = listItem ? listItem.closest('ul, ol') : null;

        if (listItem && list) {
            // If the list item is empty, break out of the list or create a new list item
            if (listItem.textContent.trim() === '') {
                e.preventDefault(); // Prevent the default behavior

                const newRange = document.createRange();
                const selection = window.getSelection();

                // If the list only has one item, break the list by turning it into a paragraph
                if (list.children.length === 1) {
                    list.remove(); // Remove the whole list
                } else {
                    // Otherwise, just remove the empty list item and insert a new one
                    listItem.remove();
                }
                const newItem = document.createElement('p');
                newItem.innerHTML = "<br>"; // Create a new paragraph element
                list.after(newItem);
                newRange.setStart(newItem, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
            } else {
                // If the list item is not empty, create a new list item below
                e.preventDefault(); // Prevent default behavior
                const newListItem = document.createElement("li");
                newListItem.innerHTML = "<br>";
                list.appendChild(newListItem);

                const newRange = document.createRange();
                const selection = window.getSelection();
                newRange.setStart(newListItem, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
        }
    } else if (e.key === 'Enter') {
        // Handle sending the prompt on Enter (without Shift)
        sendPrompt();
    }
});

// Handle the paste event to sanitize input
messageInput.addEventListener("paste", (event) => {
    event.preventDefault();

    // Get the plain text from the clipboard
    const clipboardData = (event.clipboardData || window.clipboardData).getData("text/plain");

    // Sanitize the text to preserve white spaces but strip any HTML tags
    const sanitizedText = clipboardData.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Insert the sanitized text at the caret position
    insertAtCaret(messageInput, sanitizedText);

    // Reapply Prism.js highlighting
    Prism.highlightAllUnder(messageInput);
});