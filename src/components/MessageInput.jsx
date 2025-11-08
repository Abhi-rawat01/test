import { useState } from 'react';
import { Mic, Paperclip, Send, Smile } from 'lucide-react';

const MessageInput = ({ onSend, disabled }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setMessage('');
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-panel mx-6 mb-6 flex items-end gap-3 rounded-3xl px-4 py-3"
    >
      <button type="button" className="chat-input-button">
        <Smile size={18} />
      </button>
      <button type="button" className="chat-input-button">
        <Paperclip size={18} />
      </button>
      <div className="flex-1">
        <textarea
          rows={1}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message"
          className="max-h-36 w-full resize-none rounded-2xl bg-chat-dark px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-chat-accent/40"
        />
      </div>
      <button
        type="submit"
        disabled={disabled || !message.trim()}
        className="chat-input-button bg-chat-accent text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
      >
        <Send size={18} />
      </button>
      <button type="button" className="chat-input-button">
        <Mic size={18} />
      </button>
    </form>
  );
};

export default MessageInput;
