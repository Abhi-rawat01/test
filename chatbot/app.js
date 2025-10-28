document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'chatbot:history:v1';
  const chatWindow = document.getElementById('chatWindow');
  const chatForm = document.getElementById('chatForm');
  const chatMessageInput = document.getElementById('chatMessage');
  const clearButton = document.getElementById('clearButton');

  const intents = [
    {
      keywords: ['hi', 'hello', 'hey', 'greetings', 'hola'],
      response:
        "Hi there! I'm your friendly support bot. Ask me about our hours, pricing, contact info, or say help to see everything I know.",
    },
    {
      keywords: ['help', 'options', 'commands', 'menu'],
      response:
        'Here are a few ideas: hours, pricing, contact, joke, thanks, reset, or ask about what I can do.',
    },
    {
      keywords: ['hours', 'open', 'opening hours', 'time', 'schedule'],
      response: 'We’re open Monday through Friday, 9:00 AM to 5:00 PM.',
    },
    {
      keywords: ['pricing', 'price', 'cost', 'fees', 'plans'],
      response:
        'Our pricing is flexible—plans start at $29/month. Let me know what you need and we’ll tailor something for you.',
    },
    {
      keywords: ['contact', 'email', 'support', 'reach', 'phone'],
      response: 'You can email us any time at support@example.com. We’d love to hear from you!'
    },
    {
      keywords: ['joke', 'funny', 'laugh'],
      response: "Here’s one: Why did the developer go broke? Because they used up all their cache!",
    },
    {
      keywords: ['thanks', 'thank you', 'thankyou', 'thx', 'appreciate'],
      response: "You’re very welcome! Happy to help.",
    },
    {
      keywords: ['reset', 'clear'],
      response: 'All set! Your chat history is cleared. What would you like to talk about next?',
      action: 'reset',
    },
    {
      keywords: ['goodbye', 'bye', 'see you'],
      response: 'Talk to you soon! If you need anything else, just say hi.',
    },
    {
      keywords: ['who are you', 'your name', 'about you', 'what can you do'],
      response:
        "I'm a simple rule-based assistant here to share quick info. Try asking about our hours, pricing, or contact details.",
    },
  ];

  let history = loadHistory();
  history.forEach(renderMessage);
  requestAnimationFrame(scrollMessagesToBottom);

  if (history.length === 0) {
    addMessage('bot', "Hi! I’m here to help. Ask me about our hours, pricing, or say help for more ideas.");
  }

  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const rawMessage = chatMessageInput.value;
    const trimmedMessage = rawMessage.trim();

    if (!trimmedMessage) {
      return;
    }

    chatMessageInput.value = '';
    addMessage('user', trimmedMessage);

    const normalizedInput = normalize(trimmedMessage);
    const detectedIntent = findIntent(normalizedInput);

    const typingIndicator = showTypingIndicator();

    setTimeout(() => {
      removeTypingIndicator(typingIndicator);

      if (detectedIntent) {
        if (detectedIntent.action === 'reset') {
          clearChat({ followUp: detectedIntent.response });
        } else {
          addMessage('bot', detectedIntent.response);
        }
      } else {
        addMessage(
          'bot',
          "I’m still learning! Try asking about our hours, pricing, contact info, or say help for suggestions."
        );
      }
    }, randomDelay());

    chatMessageInput.focus();
  });

  clearButton.addEventListener('click', () => {
    clearChat({ followUp: 'Chat cleared. I’m ready whenever you are!' });
    chatMessageInput.focus();
  });

  function normalize(value) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  function findIntent(normalizedInput) {
    const words = normalizedInput.split(' ').filter(Boolean);

    return intents.find((intent) =>
      intent.keywords.some((keyword) => {
        const normalizedKeyword = normalize(keyword);
        if (normalizedKeyword.includes(' ')) {
          return normalizedInput.includes(normalizedKeyword);
        }
        return words.includes(normalizedKeyword);
      })
    );
  }

  function addMessage(sender, text, { timestamp } = {}) {
    const message = {
      sender,
      text,
      timestamp: timestamp || new Date().toISOString(),
    };

    history.push(message);
    renderMessage(message);
    saveHistory();

    scrollMessagesToBottom();
    return message;
  }

  function renderMessage({ sender, text, timestamp }) {
    const messageElement = document.createElement('article');
    messageElement.classList.add('message', `message--${sender}`);

    const bubble = document.createElement('div');
    bubble.className = 'message__bubble';
    bubble.textContent = text;
    messageElement.appendChild(bubble);

    const metaText = buildMetaLabel(sender, timestamp);
    if (metaText) {
      const meta = document.createElement('span');
      meta.className = 'message__meta';
      meta.textContent = metaText;
      messageElement.appendChild(meta);
    }

    chatWindow.appendChild(messageElement);
  }

  function buildMetaLabel(sender, timestamp) {
    const roleLabel = sender === 'user' ? 'You' : 'Bot';
    const timeLabel = formatTimestamp(timestamp);
    if (!timeLabel) {
      return roleLabel;
    }
    return `${roleLabel} • ${timeLabel}`;
  }

  function formatTimestamp(value) {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'message message--bot message--typing';
    const bubble = document.createElement('div');
    bubble.className = 'message__bubble';
    bubble.textContent = 'Bot is typing…';
    indicator.appendChild(bubble);
    chatWindow.appendChild(indicator);
    scrollMessagesToBottom();
    return indicator;
  }

  function removeTypingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }

  function randomDelay() {
    return 400 + Math.floor(Math.random() * 400);
  }

  function scrollMessagesToBottom() {
    if (typeof chatWindow.scrollTo === 'function') {
      chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
    } else {
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
  }

  function clearChat({ followUp } = {}) {
    history = [];
    chatWindow.innerHTML = '';
    removeFromStorage();

    if (followUp) {
      addMessage('bot', followUp);
    }
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch (error) {
      console.warn('Could not load saved history', error);
      return [];
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.warn('Could not save chat history', error);
    }
  }

  function removeFromStorage() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Could not clear chat history', error);
    }
  }
});
