# 💬 WhatsApp-Style Chat App

A modern WhatsApp-inspired chat experience built with **React**, **Tailwind CSS**, and **Supabase**. Enjoy realtime messaging, authentication, and a sleek dark user interface optimised for both desktop and mobile.

---

## ✨ Features

- 🔐 **Supabase Auth** – Email/password authentication with persistent sessions
- ⚡ **Realtime Messaging** – Messages update instantly through Supabase realtime channels
- 🧑‍🤝‍🧑 **Conversation List** – See recent chats with last message preview and timestamps
- 💬 **Message Threads** – Styled message bubbles with smooth animations and auto-scroll
- 🎛️ **Rich Input Bar** – Emoji, attach, microphone, and send actions using Lucide icons
- 🌙 **Dark WhatsApp Theme** – Tailwind-powered styling with glassmorphism accents
- 📱 **Responsive Layout** – Mobile-first design that adapts across breakpoints

---

## 🗂️ Project Structure

```
src/
  components/
    Sidebar.jsx
    ChatWindow.jsx
    MessageInput.jsx
  context/
    SupabaseContext.jsx
  App.jsx
  main.jsx
  index.css
public/
  vite.svg
```

Configuration & tooling files:

- `.env.example` – Supabase environment variable template
- `package.json` – npm scripts and dependencies
- `postcss.config.js`, `tailwind.config.js`, `vite.config.js`

---

## 🧰 Tech Stack

- [React](https://react.dev/) with [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) for auth and realtime
- [lucide-react](https://lucide.dev/) icon set

---

## ⚙️ Getting Started

1. **Verify prerequisites**

   Ensure you're running Node.js 18.17 or later (this project was tested with Node.js 20.19.5). You can confirm with:

   ```bash
   node -v
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure Supabase**

   - Duplicate `.env.example` → `.env`
   - Populate the following values from your Supabase project dashboard:

     ```env
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

   The app runs at [http://localhost:5173](http://localhost:5173) by default.

---

## 🗄️ Supabase Schema Expectations

Create the following tables in your Supabase project (simplified schema):

- **profiles**: `user_id`, `username`, `avatar_url`
- **conversations**: `id`, `user1_id`, `user2_id`, `created_at`
- **messages**: `id`, `conversation_id`, `sender_id`, `receiver_id`, `content`, `created_at`, `updated_at`

The application listens for realtime changes on the `messages` table.

---

## 📝 Available Scripts

- `npm run dev` – Start Vite in development mode
- `npm run build` – Create a production build
- `npm run preview` – Preview the production build locally

---

## 🛠️ Development Notes

- Tailwind utility classes keep styling scoped and consistent
- Animations (`fade-in`, `slide-up`, `pulse-soft`) are defined in `tailwind.config.js`
- Supabase client and auth state are provided via `SupabaseContext`

---

## 📄 License

This project is provided as-is for demonstration and educational purposes.
