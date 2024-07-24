let sessionId = "";

function getPostAndComments() {
    var post = document.querySelector("div[data-post-click-location]").textContent.trim()
    var comments = document.querySelector("shreddit-comment-tree").querySelectorAll(':scope > shreddit-comment');
    var commentTexts = [];
    for (var i = 0; i < 5 && i < comments.length; i++) {
        commentTexts.push(comments[i].querySelector('div[slot="comment"]').innerText)
    }
    return {
        post: post,
        comments: commentTexts
    };
}

class StreamAudioPlayer {
    constructor(audioStreamReader) {
        this.audioStreamReader = audioStreamReader;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.mediaSource = new MediaSource();
        this.sourceBuffer = null;
        this.queue = [];

        this.initMediaSource();
    }

    initMediaSource() {
        this.mediaSource.addEventListener('sourceopen', () => {
            const mime = 'audio/mpeg';
            this.sourceBuffer = this.mediaSource.addSourceBuffer(mime);
            this.sourceBuffer.addEventListener('updateend', () => this.processQueue());
            this.fetchAudioChunks();
        });

        const sourceNode = this.audioContext.createMediaElementSource(this.createMediaElement());
        sourceNode.connect(this.audioContext.destination);
    }

    createMediaElement() {
        const mediaElement = new Audio();
        mediaElement.src = URL.createObjectURL(this.mediaSource);
        mediaElement.play();
        mediaElement.addEventListener('ended', () => {
            chrome.runtime.sendMessage({ action: 'resetIcon' });
        });
        return mediaElement;
    }

    async fetchAudioChunks() {
        const processChunk = async ({ done, value }) => {
            if (done) {
                this.mediaSource.endOfStream();
                return;
            }

            if (value) {
                this.queue.push(value);
                this.processQueue();
            }

            this.audioStreamReader.read().then(processChunk);
        };

        this.audioStreamReader.read().then(processChunk);
    }

    processQueue() {
        if (this.queue.length > 0 && !this.sourceBuffer.updating) {
            const chunk = this.queue.shift();
            this.sourceBuffer.appendBuffer(chunk);
        }
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "processUserQuestion") {
        var postAndComments = getPostAndComments();
        fetch('http://localhost:5002/process',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': sessionId,
                },
                body: JSON.stringify({
                    "user_question": request.userQuestion,
                    "post": postAndComments.post,
                    "comments": postAndComments.comments
                })
            }
        ).then(response => {
            sessionId = response.headers.get('X-Session-Id');
            new StreamAudioPlayer(response.body.getReader());
            sendResponse({ status: 'success' });
        }).catch(error => {
            console.error('Error:', error);
            sendResponse({ status: 'error', message: error.toString() });
        });;
    }
});
