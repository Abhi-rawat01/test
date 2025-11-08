import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import ChatWindow from './components/ChatWindow.jsx';
import MessageInput from './components/MessageInput.jsx';
import { useSupabase } from './context/SupabaseContext.jsx';

const App = () => {
  const { supabase, user, initializing, signIn, signUp, signOut } = useSupabase();
  const [authMode, setAuthMode] = useState('signin');
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const activeConversationRef = useRef(null);
  const activeConversationMetaRef = useRef({ id: null, participantId: null });

  const supabaseConfigured = Boolean(supabase);

  useEffect(() => {
    activeConversationRef.current = activeConversation?.id ?? null;
    const participantId = activeConversation
      ? activeConversation.participantId ||
        (activeConversation.user1_id === user?.id ? activeConversation.user2_id : activeConversation.user1_id)
      : null;
    activeConversationMetaRef.current = {
      id: activeConversation?.id ?? null,
      participantId
    };
  }, [activeConversation, user?.id]);

  const resetChatState = useCallback(() => {
    setConversations([]);
    setActiveConversation(null);
    setMessages([]);
  }, []);

  useEffect(() => {
    if (!user) {
      resetChatState();
    }
  }, [user, resetChatState]);

  const fetchConversations = useCallback(async () => {
    if (!supabase || !user) return;

    setLoadingConversations(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const conversationsData = data ?? [];
      const participantIds = Array.from(
        new Set(
          conversationsData
            .map((conversation) =>
              conversation.user1_id === user.id ? conversation.user2_id : conversation.user1_id
            )
            .filter(Boolean)
        )
      );

      const profilesMap = {};
      if (participantIds.length) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', participantIds);

        if (profilesError) throw profilesError;

        (profilesData ?? []).forEach((profile) => {
          profilesMap[profile.user_id] = profile;
        });
      }

      const conversationIds = conversationsData.map((conversation) => conversation.id).filter(Boolean);
      const lastMessageMap = {};

      if (conversationIds.length) {
        const { data: lastMessages, error: lastMessagesError } = await supabase
          .from('messages')
          .select('id, content, created_at, sender_id, receiver_id, conversation_id')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false });

        if (!lastMessagesError) {
          (lastMessages ?? []).forEach((message) => {
            if (!lastMessageMap[message.conversation_id]) {
              lastMessageMap[message.conversation_id] = message;
            }
          });
        }
      }

      const formatted = conversationsData.map((conversation) => {
        const participantId = conversation.user1_id === user.id ? conversation.user2_id : conversation.user1_id;
        return {
          ...conversation,
          participantId,
          participantProfile: profilesMap[participantId] ?? null,
          lastMessage: lastMessageMap[conversation.id] ?? null
        };
      });

      setConversations(formatted);

      if (formatted.length) {
        const currentMatch = formatted.find((item) => item.id === activeConversationRef.current);
        setActiveConversation(currentMatch || formatted[0]);
      } else {
        setActiveConversation(null);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error.message);
    } finally {
      setLoadingConversations(false);
    }
  }, [supabase, user]);

  const fetchMessages = useCallback(
    async (conversation) => {
      if (!supabase || !user || !conversation) return;

      setLoadingMessages(true);
      const participantId =
        conversation.participantId ||
        (conversation.user1_id === user.id ? conversation.user2_id : conversation.user1_id);

      try {
        let query = supabase
          .from('messages')
          .select('id, content, created_at, sender_id, receiver_id, conversation_id')
          .order('created_at', { ascending: true });

        let { data: messagesData, error } = await query.eq('conversation_id', conversation.id);

        if (error) {
          if (!error.message.includes('conversation_id')) {
            throw error;
          }

          // fallback for schemas without conversation_id
          ({ data: messagesData, error } = await supabase
            .from('messages')
            .select('id, content, created_at, sender_id, receiver_id')
            .or(
              `and(sender_id.eq.${user.id},receiver_id.eq.${participantId}),and(sender_id.eq.${participantId},receiver_id.eq.${user.id})`
            )
            .order('created_at', { ascending: true }));

          if (error) throw error;
        }

        setMessages(messagesData ?? []);
      } catch (error) {
        console.error('Failed to fetch messages:', error.message);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    },
    [supabase, user]
  );

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, fetchConversations]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation);
    } else {
      setMessages([]);
    }
  }, [activeConversation, fetchMessages]);

  useEffect(() => {
    if (!supabase || !user) return undefined;

    const channel = supabase
      .channel('public:messages-bridge')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new;
          const oldMessage = payload.old;
          const relevantMessage = newMessage ?? oldMessage;
          if (!relevantMessage) return;

          const involvedUsers = [relevantMessage.sender_id, relevantMessage.receiver_id];
          if (!involvedUsers.includes(user.id)) return;

          const isActiveConversation = (() => {
            const { id: activeId, participantId } = activeConversationMetaRef.current;
            if (relevantMessage.conversation_id && activeId) {
              return relevantMessage.conversation_id === activeId;
            }
            if (!participantId) return false;
            const matchesSenderReceiver =
              (relevantMessage.sender_id === user.id && relevantMessage.receiver_id === participantId) ||
              (relevantMessage.receiver_id === user.id && relevantMessage.sender_id === participantId);
            return matchesSenderReceiver;
          })();

          if (payload.eventType === 'INSERT') {
            if (isActiveConversation) {
              setMessages((prev) => {
                const exists = prev.some((message) => message.id === relevantMessage.id);
                if (exists) return prev;
                const updated = [...prev, relevantMessage];
                return updated.sort(
                  (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
              });
            }
            fetchConversations();
          }

          if (payload.eventType === 'UPDATE') {
            if (isActiveConversation) {
              setMessages((prev) =>
                prev.map((message) => (message.id === relevantMessage.id ? relevantMessage : message))
              );
            }
            fetchConversations();
          }

          if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((message) => message.id !== relevantMessage.id));
            fetchConversations();
          }
        }
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user, fetchConversations]);

  const handleSendMessage = useCallback(
    async (content) => {
      if (!supabase || !user || !activeConversation) return;

      const receiverId =
        activeConversation.participantId ||
        (activeConversation.user1_id === user.id ? activeConversation.user2_id : activeConversation.user1_id);

      setSending(true);
      try {
        const { error } = await supabase.from('messages').insert({
          content,
          sender_id: user.id,
          receiver_id: receiverId,
          conversation_id: activeConversation.id ?? null
        });
        if (error) throw error;
      } catch (error) {
        console.error('Failed to send message:', error.message);
      } finally {
        setSending(false);
      }
    },
    [supabase, user, activeConversation]
  );

  const handleStartConversation = useCallback(async () => {
    if (!supabase || !user) return;
    if (typeof window === 'undefined') return;

    const identifier = window.prompt('Enter the username of the person you would like to chat with');
    if (!identifier) return;

    try {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .ilike('username', identifier.trim());

      if (profileError) throw profileError;
      if (!profiles?.length) {
        if (typeof window !== 'undefined') {
          window.alert('No user found with that username.');
        }
        return;
      }

      const targetProfile = profiles[0];
      const targetId = targetProfile.user_id;

      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${targetId}),and(user1_id.eq.${targetId},user2_id.eq.${user.id})`)
        .limit(1)
        .maybeSingle();

      if (existing) {
        setActiveConversation({
          ...existing,
          participantId: existing.user1_id === user.id ? existing.user2_id : existing.user1_id,
          participantProfile: targetProfile
        });
        fetchConversations();
        return;
      }

      const { data: newConversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({ user1_id: user.id, user2_id: targetId })
        .select()
        .single();

      if (conversationError) throw conversationError;

      const conversationWithProfile = {
        ...newConversation,
        participantId: targetId,
        participantProfile: targetProfile
      };
      setConversations((prev) => [conversationWithProfile, ...prev]);
      setActiveConversation(conversationWithProfile);
      fetchConversations();
    } catch (error) {
      console.error('Failed to start conversation:', error.message);
    }
  }, [supabase, user, fetchConversations]);

  const handleAuthSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!supabaseConfigured) return;

      const formData = new FormData(event.currentTarget);
      const email = formData.get('email')?.toString().trim();
      const password = formData.get('password')?.toString().trim();
      const username = formData.get('username')?.toString().trim();

      if (!email || !password) {
        setAuthNotice('');
        setAuthError('Email and password are required');
        return;
      }

      setAuthNotice('');
      setAuthError('');
      setAuthLoading(true);

      try {
        if (authMode === 'signin') {
          const { error } = await signIn({ email, password });
          if (error) throw error;
        } else {
          const { error } = await signUp({
            email,
            password,
            options: {
              data: username ? { username } : undefined
            }
          });
          if (error) throw error;
          setAuthMode('signin');
          setAuthNotice('Confirmation email sent. Please verify before signing in.');
        }
      } catch (error) {
        setAuthNotice('');
        setAuthError(error.message);
      } finally {
        setAuthLoading(false);
      }
    },
    [authMode, signIn, signUp, supabaseConfigured]
  );

  const chatLayout = useMemo(
    () => (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-chat-darkest text-white md:grid md:grid-cols-[360px_minmax(0,1fr)]">
        <div className="border-b border-white/5 md:h-full md:border-b-0 md:border-r">
          <Sidebar
            user={user}
            conversations={conversations}
            activeConversationId={activeConversation?.id ?? null}
            onSelectConversation={setActiveConversation}
            onStartConversation={handleStartConversation}
            onSignOut={signOut}
            loading={loadingConversations}
          />
        </div>
        <div className="flex h-full flex-1 flex-col">
          <ChatWindow
            conversation={activeConversation}
            messages={messages}
            currentUser={user}
            loading={loadingMessages}
          />
          {activeConversation ? (
            <MessageInput onSend={handleSendMessage} disabled={sending} />
          ) : (
            <div className="px-6 pb-6 text-center text-sm text-slate-500">
              Select or start a conversation to send a message.
            </div>
          )}
        </div>
      </div>
    ),
    [
      user,
      conversations,
      activeConversation,
      loadingConversations,
      messages,
      loadingMessages,
      handleStartConversation,
      signOut,
      handleSendMessage,
      sending
    ]
  );

  if (!supabaseConfigured) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-chat-darkest p-6 text-center text-slate-300">
        <div className="max-w-md space-y-3">
          <h1 className="text-3xl font-semibold text-white">Configure Supabase</h1>
          <p className="text-sm text-slate-400">
            Add your Supabase credentials to the <span className="font-semibold text-chat-accent">.env</span> file using the template provided in{' '}
            <span className="font-semibold text-chat-accent">.env.example</span> to enable authentication and realtime messaging.
          </p>
        </div>
      </div>
    );
  }

  if (initializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-chat-darkest text-slate-300">
        Initialising chat experience...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-chat-darkest via-chat-darker to-chat-dark">
        <div className="glass-panel w-full max-w-md space-y-8 rounded-3xl px-10 py-12 shadow-2xl">
          <header className="space-y-2 text-center">
            <h1 className="text-3xl font-semibold text-white">Welcome back</h1>
            <p className="text-sm text-slate-400">Sign in to continue chatting, or create an account to get started.</p>
          </header>
          <form onSubmit={handleAuthSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-400" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-2xl bg-chat-dark px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-chat-accent/60"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-400" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-2xl bg-chat-dark px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-chat-accent/60"
              />
            </div>
            {authMode === 'signup' && (
              <div className="space-y-2">
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-400" htmlFor="username">
                  Display name
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  className="w-full rounded-2xl bg-chat-dark px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-chat-accent/60"
                  placeholder="Choose how others see you"
                />
              </div>
            )}
            {authError && <p className="rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-300">{authError}</p>}
            {authNotice && <p className="rounded-xl bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">{authNotice}</p>}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-full bg-chat-accent py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              {authMode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <div className="text-center text-sm text-slate-400">
            {authMode === 'signin' ? (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setAuthError('');
                  setAuthNotice('');
                }}
                className="font-medium text-chat-accent transition hover:text-emerald-400"
              >
                Need an account? Sign up
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setAuthError('');
                  setAuthNotice('');
                }}
                className="font-medium text-chat-accent transition hover:text-emerald-400"
              >
                Already have an account? Sign in
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <div className="flex h-screen flex-col">{chatLayout}</div>;
};

export default App;
