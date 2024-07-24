# Reddit AI Extension

## Overview

This project is a Chrome extension that integrates with AI to allow asking questions about the webpage (right now Reddit comments page is the only supported webpage)
The extension is fully voice controlled (Speech-to-text and Text-to-Speech), and uses OPENAI API fo AI related tasks

## Setup

### Backend

1. Navigate to the `backend` directory:
```bash
cd backend
```
2.	Install the required dependencies:
```bash
pip install -r requirements.txt
```
3. Add `OPENAI_API_KEY` environment variable using your API key
4.	Run the Flask server:
```bash
python app.py
```

### Extension

Load the extension in Chrome:

1. Go to chrome://extensions/.
2. Enable “Developer mode”.
3. Click “Load unpacked” and select the extension directory.
4. (Optional) If extension fails to receive microphone permission:
	- Right click on the extension
	- Go to "View Web Permissions"
	- Search for Microphone, select "Allow"

### Usage
	1.	Click the extension icon to open the popup.
	2.	Click the “Go AI” button to start the speech-to-text process.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.txt) file for details.