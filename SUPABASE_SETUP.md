# Supabase Database Schema Setup Guide

This guide provides step-by-step instructions to set up the required database schema for the WhatsApp-style chat application.

## Prerequisites

- A Supabase project created at https://supabase.com
- Access to the Supabase SQL Editor in your project dashboard
- Your Supabase project URL and anon key (found in Settings > API)

## Step 1: Create the Profiles Table

Copy and paste the following SQL into the Supabase SQL Editor and execute it:

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view all profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- RLS Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policy: Users can insert their own profile
CREATE POLICY "Users can create own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

## Step 2: Create the Conversations Table

Copy and paste the following SQL into the Supabase SQL Editor and execute it:

```sql
-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user1_id, user2_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_conversations_user1_id ON public.conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2_id ON public.conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON public.conversations(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view conversations they participate in
CREATE POLICY "Conversations are viewable by participants"
  ON public.conversations FOR SELECT
  USING (
    user1_id IN (SELECT user_id FROM public.profiles WHERE id = auth.uid()) OR
    user2_id IN (SELECT user_id FROM public.profiles WHERE id = auth.uid())
  );

-- RLS Policy: Users can create conversations
CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (
    user1_id IN (SELECT user_id FROM public.profiles WHERE id = auth.uid()) OR
    user2_id IN (SELECT user_id FROM public.profiles WHERE id = auth.uid())
  );

-- RLS Policy: Users can update conversations they participate in
CREATE POLICY "Users can update conversations they participate in"
  ON public.conversations FOR UPDATE
  USING (
    user1_id IN (SELECT user_id FROM public.profiles WHERE id = auth.uid()) OR
    user2_id IN (SELECT user_id FROM public.profiles WHERE id = auth.uid())
  );

-- RLS Policy: Users can delete conversations they participate in
CREATE POLICY "Users can delete conversations they participate in"
  ON public.conversations FOR DELETE
  USING (
    user1_id IN (SELECT user_id FROM public.profiles WHERE id = auth.uid()) OR
    user2_id IN (SELECT user_id FROM public.profiles WHERE id = auth.uid())
  );
```

## Step 3: Create the Messages Table

Copy and paste the following SQL into the Supabase SQL Editor and execute it:

```sql
-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view messages in conversations they participate in
CREATE POLICY "Messages are viewable by conversation participants"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_id
      AND (
        user1_id IN (SELECT user_id FROM public.profiles WHERE id = auth.uid()) OR
        user2_id IN (SELECT user_id FROM public.profiles WHERE id = auth.uid())
      )
    )
  );

-- RLS Policy: Users can insert messages they are sending
CREATE POLICY "Users can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id IN (SELECT user_id FROM public.profiles WHERE id = auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_id
      AND (
        user1_id = sender_id OR
        user2_id = sender_id
      )
    )
  );

-- RLS Policy: Users can update their own messages
CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  USING (
    sender_id IN (SELECT user_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    sender_id IN (SELECT user_id FROM public.profiles WHERE id = auth.uid())
  );

-- RLS Policy: Users can delete their own messages
CREATE POLICY "Users can delete their own messages"
  ON public.messages FOR DELETE
  USING (
    sender_id IN (SELECT user_id FROM public.profiles WHERE id = auth.uid())
  );
```

## Step 4: Enable Realtime Subscriptions

To enable realtime messaging, you need to enable realtime on the tables:

```sql
-- Enable realtime on profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Enable realtime on conversations table
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Enable realtime on messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
```

## Step 5: Create an Auth Trigger for Profile Creation

To automatically create a profile when a user signs up, create the following trigger:

```sql
-- Create a function that creates a profile when a user is created
CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'User' || SUBSTRING(NEW.id::text, 1, 8)),
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function after user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_profile_on_signup();
```

## Verification

After running all the SQL above, you can verify the schema was created correctly by checking:

1. Go to the "Tables" section in Supabase dashboard
2. Confirm you see three tables: `profiles`, `conversations`, and `messages`
3. Check each table has the expected columns and data types

## Environment Setup

Once your database schema is set up, add your Supabase credentials to the `.env` file:

```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Replace the values with your actual Supabase project URL and anon key from Settings > API.

## Troubleshooting

### Issue: "Table does not exist" errors
- Verify all SQL scripts were executed successfully in the Supabase SQL Editor
- Check the console in the browser for specific error messages
- Ensure Row Level Security policies are correctly applied

### Issue: Realtime messages not updating
- Verify the realtime publication includes the `messages` table
- Check browser console for subscription errors
- Ensure your Supabase project has realtime enabled

### Issue: Users cannot access profiles
- Verify Row Level Security policies are set correctly
- Check that the `username` is unique in the profiles table
- Ensure the auth trigger function executed without errors

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Quick Reset (Development Only)

If you need to drop and recreate the schema during development:

```sql
-- WARNING: This will delete all data!
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.create_profile_on_signup();
```

Then re-run the SQL scripts from Steps 1-5 above.
