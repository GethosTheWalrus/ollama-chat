import socketio
import ollama
import asyncio
import redis
import json
import os

# Initialize Socket.IO server
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
app = socketio.ASGIApp(sio)

client = ollama.Client(
    host=os.getenv("OLLAMA_URL", "http://host.docker.internal:11434"),
)

redis_client = redis.StrictRedis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=os.getenv("REDIS_PORT", 6379),
    decode_responses=True
)


# Define a function to generate responses using Ollama
def askOllama(history, prompt):
    # Stream a response from Ollama
    stream = client.chat(
        model="llama3.2:latest",
        messages=[
            {
                "role": "user",
                "content": f"""Refer to this converation history,
                               but do not directly mention it: {history}
                               Respond to this prompt: {prompt}.
                               Adhere to the following rules:
                               1. This reply will be displayed in a browser.
                               2. Respond with markdown formatting.
                               3. Make sure there is no extra space around any
                               code snippets.
                               4. Do not include any chains
                               of equal signs or dashes for separating
                               sections of text.""",
            },
        ],
        stream=True
    )
    for chunk in stream:
        yield chunk["message"]["content"]


# Define a function to get conversation history from Redis
def get_conversation_history(sid):
    history = redis_client.get(f"chat_history:{sid}")
    if history:
        return json.loads(history)
    return []


# Define a function to update conversation history in Redis
def update_conversation_history(sid, role, content):
    history = get_conversation_history(sid)
    history.append({"role": role, "content": content})
    redis_client.set(f"chat_history:{sid}", json.dumps(history))


# Socket.IO event listener for the "chat" event
@sio.event
async def chat(sid, data):
    prompt = data.get("text", "")
    print(f"Received prompt from client {sid}: {prompt}")

    async def send_chunks():
        # Retrieve conversation history to include context in the prompt
        conversation_history = get_conversation_history(sid)
        conversation = ""
        for message in conversation_history:
            conversation += f"{message['role']}: {message['content']}\n"

        # Generate and emit responses as they stream
        for chunk in askOllama(conversation, prompt):
            await sio.emit("response", {"message": chunk}, to=sid)
            await asyncio.sleep(0)  # Allow other async tasks to run

        # Signal the end of the response
        await sio.emit("response_end", {"message": "End of response"}, to=sid)

        # Update conversation history with the user input
        # and the generated response
        update_conversation_history(sid, "user", prompt)
        update_conversation_history(sid, "bot", chunk)

    await send_chunks()


# Socket.IO connection event
@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    await sio.emit("message", {"message": "Welcome!"}, to=sid)


# Socket.IO disconnection event
@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")


# Main entry point
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
