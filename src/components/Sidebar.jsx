import { useMemo, useState } from 'react';
import {
  LogOut,
  MessageSquareText,
  Plus,
  Search,
  Users
} from 'lucide-react';

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const isSameYear = date.getFullYear() === today.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString([], {
    month: isSameYear ? 'short' : 'numeric',
    day: 'numeric'
  });
};

const Sidebar = ({
  user,
  conversations,
  activeConversationId,
  onSelectConversation,
  onStartConversation,
  onSignOut,
  loading
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredConversations = useMemo(() => {
    if (!searchTerm) return conversations;
    const lower = searchTerm.toLowerCase();
    return conversations.filter((conversation) =>
      (conversation.participantProfile?.username || 'Unknown User').toLowerCase().includes(lower)
    );
  }, [searchTerm, conversations]);

  return (
    <aside className="flex h-full w-full flex-col bg-chat-darker/90">
      <div className="glass-panel flex items-center gap-3 px-6 py-5 shadow-lg">
        <div className="relative">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-chat-accent to-emerald-500 text-lg font-semibold uppercase">
            {user?.user_metadata?.username?.[0] || user?.email?.[0] || '?' }
          </div>
          <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-chat-darker bg-emerald-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm uppercase tracking-wider text-slate-400">Logged in as</p>
          <p className="text-lg font-semibold text-white">
            {user?.user_metadata?.username || user?.email?.split('@')[0] || 'Guest'}
          </p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="chat-icon-button"
        >
          <LogOut size={20} />
        </button>
      </div>

      <div className="px-6 py-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="search"
            placeholder="Search chats"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-full bg-chat-dark py-3 pl-11 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-chat-accent/50"
          />
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onStartConversation}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-chat-dark px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-chat-muted hover:text-white"
          >
            <Plus size={16} />
            New chat
          </button>
          <button
            type="button"
            className="chat-input-button"
          >
            <Users size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-6">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Loading conversations...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700/60 bg-chat-dark/40 p-6 text-center text-sm text-slate-400">
            <MessageSquareText size={28} className="text-chat-accent" />
            <p>No conversations yet. Start a new chat to begin messaging.</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const participant = conversation.participantProfile;
            const initials = participant?.username?.[0]?.toUpperCase() || '#';
            const lastMessage = conversation.lastMessage?.content || 'Tap to start chatting';
            const timestamp = formatTimestamp(conversation.lastMessage?.created_at);
            const isActive = activeConversationId === conversation.id;

            return (
              <button
                key={conversation.id || conversation.participantId}
                type="button"
                onClick={() => onSelectConversation(conversation)}
                className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors duration-150 ${
                  isActive ? 'bg-chat-muted/80' : 'hover:bg-chat-dark'
                }`}
              >
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-chat-dark text-base font-semibold text-slate-200">
                    {participant?.avatar_url ? (
                      <img
                        src={participant.avatar_url}
                        alt={participant?.username || 'Contact avatar'}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-100">
                      {participant?.username || 'Unknown contact'}
                    </p>
                    <span className="shrink-0 text-xs text-slate-500">{timestamp}</span>
                  </div>
                  <p className="truncate text-sm text-slate-400 transition-colors group-hover:text-slate-300">
                    {lastMessage}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
