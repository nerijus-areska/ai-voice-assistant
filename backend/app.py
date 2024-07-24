import secrets
import os
from flask import Flask, request, Response, stream_with_context
from flask_cors import CORS
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from langchain_core.chat_history import (
    BaseChatMessageHistory,
    InMemoryChatMessageHistory,
)
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from openai import OpenAI

SESSION_ID_HEADER_NAME = "X-Session-Id"

app = Flask(__name__)
CORS(app, expose_headers=[SESSION_ID_HEADER_NAME])

OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is not set")
openai = OpenAI(api_key=OPENAI_API_KEY)
model = ChatOpenAI(model="gpt-4o-mini")

session_store = {}

prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are a helpful assistant, who helps to make sense of reddit comments.
            This is the post:
            {post}
            This is the list of comments:
            {comments}
            Answer all questions in a very concise manner. No more than one sentence""",
        ),
        MessagesPlaceholder(variable_name="messages"),
    ]
)


def get_session_history(session_id: str) -> BaseChatMessageHistory:
    if session_id not in session_store:
        session_store[session_id] = InMemoryChatMessageHistory()
    return session_store[session_id]


msg_history = RunnableWithMessageHistory(
    prompt | model,
    get_session_history,
    input_messages_key="messages",
)


def chatbot(config, post, comments, user_question):
    return msg_history.invoke(
        {
            "messages": [HumanMessage(content=user_question)],
            "post": post,
            "comments": comments,
        },
        config=config,
    ).content


@app.route("/process", methods=["POST"])
def tts():
    try:
        data = request.json
        session_id = request.headers.get(SESSION_ID_HEADER_NAME)
        post = data.get("post", "")
        comments = "\n\n".join(data.get("comments", []))
        user_question = data.get(
            "user_question", "Repeat after me: something went wrong, check your logs"
        )
        if "" == session_id:
            session_id = secrets.token_hex(4)

        print(
            f"Processing user question: {user_question}.\n Will be using session_id: {session_id}"
        )
        config = {"configurable": {"session_id": session_id}}

        chatbot_response = chatbot(config, post, comments, user_question)

        def generate_chunks():
            with openai.audio.speech.with_streaming_response.create(
                model="tts-1",
                voice="shimmer",
                response_format="mp3",
                input=chatbot_response,
            ) as response:
                for chunk in response.iter_bytes(chunk_size=8192):
                    yield chunk

        response = Response(
            stream_with_context(generate_chunks()), mimetype="audio/mpeg"
        )
        response.headers[SESSION_ID_HEADER_NAME] = session_id
        return response
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return Response("Internal Server Error", status=500)


if __name__ == "__main__":
    app.run(debug=True, port=5002)
