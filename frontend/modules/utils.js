function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
        c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
        }
    }
    return "";
}

function uuidv4() {
    if (window.crypto && window.crypto.getRandomValues) {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
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
    uuidv4,
    insertAtCaret,
    isCursorAtEndOfCodeBlock,
    getOffsetInParent,
    moveCursorOutOfCodeBlock,
    setCookie,
    getCookie
}