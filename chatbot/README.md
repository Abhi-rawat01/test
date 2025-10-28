# Support Chatbot

A lightweight, predefined rule-based chatbot built with vanilla JavaScript. It runs entirely in the browser—no build tools or backend required.

## Getting started

1. Open the `chatbot` folder.
2. Either double-click `index.html` or serve the folder with any static file server.
3. Start chatting in the browser window.

The conversation history is saved locally in your browser using `localStorage`. Use the **Clear chat** button or type "reset"/"clear" to wipe the history and start fresh.

## Features

- Responsive chat layout that works on desktop and mobile.
- Keyboard-friendly: press **Enter** to send messages.
- Accessible message region with `aria-live="polite"` updates, focus-visible states, and labeled controls.
- Predefined intents with friendly responses and a helpful fallback message when the bot is unsure.
- Optional typing indicator adds a short, human-like delay before the bot replies.
- Conversation history persists across page reloads until you clear it.

## Example phrases to try

- `hi`
- `help`
- `what are your hours`
- `tell me about pricing`
- `contact`
- `tell me a joke`
- `thank you`
- `reset`
- `who are you`
- `bye`
