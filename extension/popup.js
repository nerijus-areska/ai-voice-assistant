document.getElementById('startBtn').addEventListener('click', () => {
    console.log("Triggering mic auth")
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
            const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            recognition.lang = 'en-US';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.start();

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.action.setIcon({ path: 'icon_active.png', tabId: tabs[0].id });
            });

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { "action": "processUserQuestion", "userQuestion": transcript });
                    chrome.action.setIcon({ path: 'icon_progress.png', tabId: tabs[0].id });
                });
                console.log('Transcript:', transcript);
            };

            recognition.onspeechend = () => {
                recognition.stop();
            };

            recognition.onerror = (event) => {
                if (event.error === 'no-speech') {
                    console.error('No speech detected. Please try again.');
                } else {
                    console.error('Speech recognition error:', event.error);
                }
            };
        })
        .catch((error) => {
            console.error('Microphone access error:', error);
        });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'resetIcon') {
        chrome.action.setIcon({ path: 'icon.png', tabId: sender.tab.id });
        sendResponse({ status: 'iconReset' });
    }
});