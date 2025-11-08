import { useEffect, useMemo, useRef } from 'react';
import { MoreVertical, Phone, Search, Video } from 'lucide-react';

const formatLongDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString([], {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric'
  });
};

const ChatWindow = ({ conversation, messages, currentUser, loading }) => {
  const scrollRef = useRef(null);

  const participant = useMemo(() => {
    if (!conversation) return null;
    return conversation.participantProfile || null;
  }, [conversation]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, conversation]);

  if (!conversation) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-chat-darkest to-chat-darker">
        <div className="max-w-md space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-chat-dark">
            <Video className="text-chat-accent" />
          </div>
          <h2 className="text-2xl font-semibold text-white">Select a conversation</h2>
          <p className="text-sm text-slate-400">
            Choose a chat from the sidebar to start messaging. New messages will appear here in realtime as soon as they arrive.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col bg-gradient-to-br from-chat-darkest to-chat-darker">
      <header className="glass-panel flex items-center justify-between gap-4 px-6 py-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-chat-dark text-lg font-semibold text-slate-200">
              {participant?.avatar_url ? (
                <img
                  src={participant.avatar_url}
                  alt={participant?.username || 'Contact avatar'}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                participant?.username?.[0]?.toUpperCase() || '#'
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-chat-dark/80 bg-emerald-500 animate-pulse-soft" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              {participant?.username || 'Unknown contact'}
            </h3>
            <p className="text-sm text-emerald-400">Online now</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <button type="button" className="chat-icon-button">
            <Search size={18} />
          </button>
          <button type="button" className="chat-icon-button">
            <Phone size={18} />
          </button>
          <button type="button" className="chat-icon-button">
            <Video size={18} />
          </button>
          <button type="button" className="chat-icon-button">
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto px-6 py-10">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="mt-20 flex flex-col items-center justify-center gap-3 text-center text-sm text-slate-400">
            <p className="rounded-full border border-chat-muted/60 bg-chat-dark/60 px-4 py-2 text-xs uppercase tracking-wide text-slate-400">
              Start of your conversation
            </p>
            <p>Send a message to begin chatting with {participant?.username || 'this contact'}.</p>
          </div>
        ) : (
          messages.map((message) => {
            const isSender = message.sender_id === currentUser?.id;
            return (
              <div key={message.id} className="flex flex-col gap-1">
                <div className={`chat-bubble ${isSender ? 'chat-bubble-sent' : 'chat-bubble-received'} animate-slide-up`}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </p>
                </div>
                <span className={`chat-timestamp ${isSender ? 'text-right' : 'text-left'}`}>
                  {formatLongDate(message.created_at)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default ChatWindow;
