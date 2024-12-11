import {
    chatBox,
    messageInput,
    sendButton,
    clearButton,
    insertCodeButton,
    insertBulletedListButton,
    insertNumberedListButton,
    commandPane
} from './modules/dom-elements.js'

import { 
    sendPrompt, 
    clearMessageInput, 
    disableSendButton, 
    enableSendButton, 
    startProcessing, 
    stopProcessing,
    insertCodeBlock,
    insertBulletedList,
    insertNumberedList
} from './modules/chat-menu.js'

import { 
    socket 
} from './modules/socket-handler.js';

import {
    processMessage,
    displayMessage
} from './modules/message-processor.js';

import {
    insertAtCaret,
    isCursorAtEndOfCodeBlock,
    moveCursorOutOfCodeBlock,
    setCookie,
    getCookie,
    generateGUID
} from './modules/utils.js';

const commands = [
    { name: "weather", description: "Get current weather (city)" },
    { name: "time", description: "Get the current time" },
    { name: "quote", description: "Fetch a random quote" },
];

let lastCursorPos = null;
let currentBotMessageDiv = null;
let accumulatedResponse = "";
let historyLoaded = false;

socket.on("connect", () => {
    disableSendButton();
    let chatSessionId = getCookie("chatSession");
    if (!chatSessionId) {
        chatSessionId = generateGUID();
        setCookie("chatSession", chatSessionId, 30);
    }
    socket.emit("history", { chatSession: chatSessionId });
    enableSendButton();
});

socket.on("history", (data) => {
    if (historyLoaded) return;
    disableSendButton();
    let lastMessage = null;
    for (var k in data.history) {
        let message = data.history[k];
        const d = new Date(message.timestamp);
        const prettyDate = d.toLocaleString("en-US");
        lastMessage = message;
        displayMessage(message.content, message.html, message.role == "user" ? true : false, prettyDate);
    }
    if (lastMessage) {
        const d = new Date(lastMessage.timestamp);
        const prettyDate = d.toLocaleString("en-US");
        let lastDateDivider = document.createElement('div');
        lastDateDivider.className = "date-divider";
        lastDateDivider.innerHTML = prettyDate;
        chatBox.appendChild(lastDateDivider);
    }
    chatBox.scrollTop = chatBox.scrollHeight;
    enableSendButton();
    historyLoaded = true;
});

socket.on("response", (data) => {
    accumulatedResponse += data.message;
    messageInput.setAttribute("data-placeholder", "Answering...");
    if (!currentBotMessageDiv) {
        currentBotMessageDiv = displayMessage('', "", false);
    }
    currentBotMessageDiv.innerHTML = processMessage(accumulatedResponse);
    Prism.highlightAllUnder(currentBotMessageDiv); // Apply syntax highlighting
    chatBox.scrollTop = chatBox.scrollHeight;
});

socket.on("response_end", () => {
    currentBotMessageDiv = null;
    accumulatedResponse = "";
    stopProcessing();
});

socket.on("error", (error) => {
    console.error("Socket error:", error);
    stopProcessing(); // Stop the glow effect in case of error
});

function updateCommandPane(filterText) {
    const filteredCommands = commands.filter(cmd =>
        cmd.name.toLowerCase().includes(filterText.toLowerCase()) ||
        cmd.description.toLowerCase().includes(filterText.toLowerCase())
    );
    commandPane.innerHTML = filteredCommands.length
        ? filteredCommands
            .map(cmd => `<div class="command-item" data-command="${cmd.name}">@${cmd.name} - ${cmd.description}</div>`)
            .join('')
        : '<div class="command-item disabled">No commands found</div>';
    commandPane.style.display = filteredCommands.length ? 'block' : 'none';
}

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
        e.preventDefault();
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

messageInput.addEventListener("keyup", (e) => {
    const text = messageInput.textContent;
    const cursorPos = window.getSelection().anchorOffset;
    lastCursorPos = cursorPos;

    if (text[cursorPos - 1] === "@") {
        commandPane.style.display = "block"; // Show the suggestion pane
        updateCommandPane(""); // Show all commands initially
    } else if (text.includes("@")) {
        const atIndex = text.lastIndexOf("@");
        const filterText = text.slice(atIndex + 1, cursorPos).trim();
        updateCommandPane(filterText); // Filter commands based on user input
    } else {
        commandPane.style.display = "none"; // Hide the suggestion pane
    }
});

// Listen for the command selection
commandPane.addEventListener("click", (e) => {
    // Only proceed if the target is a command item
    if (e.target.classList.contains("command-item")) {
        const command = e.target.dataset.command;

        // If we have a stored cursor position, use it
        if (lastCursorPos !== null) {
            const messageText = messageInput.textContent;

            // Find the position of the last "@" symbol before the cursor
            const atIndex = messageText.lastIndexOf('@', lastCursorPos - 1);

            // If there is an @ symbol before the cursor
            if (atIndex !== -1) {
                // Create a span element with the class "at-command"
                const span = document.createElement("span");
                span.classList.add("at-command");
                span.textContent = command; // Span contains only the command name
                span.setAttribute("contenteditable", "false"); // Make span non-editable

                // Create a span for parentheses "(" and ")"
                const parenthesesWrapper = document.createElement("span");
                parenthesesWrapper.classList.add("at-param-wrapper");
                parenthesesWrapper.setAttribute("contenteditable", "false"); // Make wrapper non-editable
                parenthesesWrapper.classList.add("at-param");

                const openingParenthesis = document.createElement("span");
                openingParenthesis.textContent = "("; // Non-editable opening parenthesis
                openingParenthesis.setAttribute("contenteditable", "false");

                const closingParenthesis = document.createElement("span");
                closingParenthesis.textContent = ")"; // Non-editable closing parenthesis
                closingParenthesis.setAttribute("contenteditable", "false");

                // Create an editable span for the parameters inside the parentheses
                const paramSpan = document.createElement("span");
                paramSpan.setAttribute("contenteditable", "true"); // Make content inside parentheses editable
                paramSpan.textContent = ""; // Start with an empty value inside parentheses

                // Append elements in the correct order
                parenthesesWrapper.appendChild(openingParenthesis);
                parenthesesWrapper.appendChild(paramSpan);
                parenthesesWrapper.appendChild(closingParenthesis);

                // Get the current selection and range
                const range = document.createRange();
                const sel = window.getSelection();

                // Traverse through child nodes to find the correct text node
                let textNode = null;
                let offset = 0;

                for (let i = 0; i < messageInput.childNodes.length; i++) {
                    const node = messageInput.childNodes[i];
                    if (node.nodeType === Node.TEXT_NODE) {
                        const nodeLength = node.textContent.length;

                        // Check if the cursor position is within this text node
                        if (offset + nodeLength >= atIndex) {
                            textNode = node;
                            break;
                        }

                        offset += nodeLength;
                    }
                }

                // Ensure there is a valid text node
                if (!textNode) {
                    console.warn("Could not find the correct text node");
                    return;
                }

                // Ensure the cursor position is valid within the text node length
                if (lastCursorPos > textNode.textContent.length) {
                    console.warn('Cursor position is out of bounds');
                    return;
                }

                // Set the range to the position where the @ symbol was
                range.setStart(textNode, atIndex - offset);
                range.setEnd(textNode, lastCursorPos - offset);

                // Ensure the range is valid before performing the deletion and insertion
                if (range.startOffset < range.endOffset) {
                    try {
                        range.deleteContents(); // Delete the existing @ command text
                        range.insertNode(parenthesesWrapper); // Insert the parentheses wrapper span
                        range.insertNode(span); // Insert the new span with the command
                        
                        // Move the cursor inside the parameter span
                        range.setStart(paramSpan, paramSpan.textContent.length);
                        range.setEnd(paramSpan, paramSpan.textContent.length);
                        sel.removeAllRanges();
                        sel.addRange(range);

                        // Scroll the input into view
                        messageInput.scrollIntoView({ behavior: "smooth", block: "center" });

                        // Refocus the input field after handling the click
                        setTimeout(() => {
                            messageInput.focus(); // Ensure message input stays focused
                            lastCursorPos = null; // Reset the cursor position once it's used
                        }, 0);
                    } catch (error) {
                        console.error('Error with range operation:', error);
                    }
                } else {
                    console.warn('Start and end positions are not valid');
                }
            }
        }

        // Hide the command pane after selection
        commandPane.style.display = "none";
    } else {
        // If the input is not focused, log a message or handle the error
        console.warn('Message input is not focused or the selected element is not valid', lastCursorPos);
    }
});
