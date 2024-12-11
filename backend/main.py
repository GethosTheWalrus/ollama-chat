import socketio
import ollama
import asyncio
import redis
import json
import os
import datetime

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
def askOllama(history, prompt, model, chatSession):
    # Stream a response from Ollama
    stream = client.chat(
        model=model,
        messages=[
            {
                "role": "user",
                "content": f"""Refer to this converation history,
                               but do not directly mention it: {history}
                               Respond to this prompt: {prompt}.""",
            },
        ],
        stream=True
    )

    final_content = ""
    for chunk in stream:
        final_content += chunk["message"]["content"]
        yield chunk["message"]["content"]

    # Update conversation history with the generated response
    update_conversation_history(chatSession, "bot", final_content)


# Define a function to get conversation history from Redis
def get_conversation_history(chatSession, buffer_size=0):
    history = redis_client.get(f"chat_history:{chatSession}")

    if history:
        parsed_history = json.loads(history)
        if buffer_size != 0 and len(parsed_history) > buffer_size:
            history = parsed_history[-buffer_size:]
        return parsed_history
    
    return []


# Define a function to update conversation history in Redis
def update_conversation_history(chatSession, role, content, html=""):
    history = get_conversation_history(chatSession)
    history.append({
        "role": role,
        "content": content,
        "html": html,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    })
    redis_client.set(f"chat_history:{chatSession}", json.dumps(history))


# Socket.IO event listener for the "chat" event
@sio.event
async def chat(sid, data):
    prompt = data.get("text", "")
    html = data.get("html", prompt)
    model = data.get("model", "llama3.2:latest")
    chatSession = data.get("chatSession", "not-found")

    # Update conversation history with the user's prompt
    update_conversation_history(chatSession, "user", prompt, html)

    if chatSession == "not-found":
        await sio.emit(
            "message",
            {"response": "Chat session cookie not found"},
            to=sid
        )
        return

    async def send_chunks():
        # Retrieve conversation history to include context in the prompt
        conversation_history = get_conversation_history(chatSession, 25)
        conversation = ""
        for message in conversation_history:
            conversation += f"{message['role']}: {message['content']}\n"

        # Generate and emit responses as they stream
        for chunk in askOllama(conversation, prompt, model, chatSession):
            await sio.emit("response", {"message": chunk}, to=sid)
            await asyncio.sleep(0)  # Allow other async tasks to run

        # Signal the end of the response
        await sio.emit("response_end", {"message": "End of response"}, to=sid)

    await send_chunks()


@sio.event
async def history(sid, data):
    chatSession = data.get("chatSession", "not-found")
    if chatSession == "not-found":
        await sio.emit(
            "message",
            {"response": "Chat session cookie not found"},
            to=sid
        )
        return

    conversation_history = get_conversation_history(chatSession)
    await sio.emit("history", {"history": conversation_history}, to=sid)


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
