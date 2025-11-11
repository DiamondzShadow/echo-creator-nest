-- Create table for tracking Twitch EventSub subscriptions
CREATE TABLE IF NOT EXISTS public.twitch_eventsub_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  twitch_user_id TEXT NOT NULL,
  subscription_id TEXT NOT NULL,
  subscription_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'enabled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique subscription per user and type
  UNIQUE(twitch_user_id, subscription_type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_twitch_eventsub_user_id ON public.twitch_eventsub_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_twitch_eventsub_twitch_user_id ON public.twitch_eventsub_subscriptions(twitch_user_id);

-- Enable Row Level Security
ALTER TABLE public.twitch_eventsub_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own EventSub subscriptions"
  ON public.twitch_eventsub_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own EventSub subscriptions"
  ON public.twitch_eventsub_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own EventSub subscriptions"
  ON public.twitch_eventsub_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own EventSub subscriptions"
  ON public.twitch_eventsub_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Allow edge functions to manage subscriptions with service role
CREATE POLICY "Service role can manage all EventSub subscriptions"
  ON public.twitch_eventsub_subscriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);