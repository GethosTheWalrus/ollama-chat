import socketio
import ollama
import asyncio

# Initialize Socket.IO server
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
app = socketio.ASGIApp(sio)

client = ollama.Client(
  host="http://host.docker.internal:11434",
)


# Define a function to generate responses using Ollama
def askOllama(prompt):
    # Stream a response from Ollama
    stream = client.chat(
        model="llama3.2:latest",
        messages=[
            {
                "role": "user",
                "content": f"""Respond to this prompt: {prompt}
                               Respond with markdown formatting
                               Make sure there is no extra space around any
                               code snippets""",
            },
        ],
        stream=True
    )
    for chunk in stream:
        yield chunk["message"]["content"]


# Socket.IO event listener for the "chat" event
@sio.event
async def chat(sid, data):
    prompt = data.get("text", "")
    print(f"Received prompt from client {sid}: {prompt}")

    async def send_chunks():
        # Generate and emit responses as they stream
        for chunk in askOllama(prompt):
            await sio.emit("response", {"message": chunk}, to=sid)
            await asyncio.sleep(0)  # Allow other async tasks to run

        # Signal the end of the response
        await sio.emit("response_end", {"message": "End of response"}, to=sid)

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
