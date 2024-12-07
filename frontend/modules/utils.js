function generateGUID() {
    return crypto.randomUUID();
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

export {
    generateGUID,
    insertAtCaret,
    isCursorAtEndOfCodeBlock,
    getOffsetInParent,
    moveCursorOutOfCodeBlock
}