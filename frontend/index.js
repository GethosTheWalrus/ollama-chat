import { UIElements } from './modules/ui-elements.js';
import { ChatLogic } from './modules/chat-logic.js';
import { UIInteractions } from './modules/ui-interactions.js';
import { SocketHandlers } from './modules/socket-handlers.js';

const socket = io("http://" + window.location.host + ":8000");
SocketHandlers(socket);

UIElements.sendButton.addEventListener('click', () => ChatLogic.sendPrompt(socket));
UIElements.clearButton.addEventListener('click', () => UIInteractions.clearMessageInput());