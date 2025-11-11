-- Create table for tracking Twitch EventSub subscriptions
CREATE TABLE IF NOT EXISTS public.twitch_eventsub_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  twitch_user_id TEXT NOT NULL,
  subscription_id TEXT NOT NULL,
  subscription_type TEXT NOT NULL, -- 'stream.online' or 'stream.offline'
  status TEXT NOT NULL DEFAULT 'enabled', -- 'enabled', 'webhook_callback_verification_pending', 'notification_failures_exceeded', 'authorization_revoked', 'moderator_removed', 'user_removed', 'version_removed'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(twitch_user_id, subscription_type)
);

-- Enable RLS
ALTER TABLE public.twitch_eventsub_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view their own Twitch subscriptions"
  ON public.twitch_eventsub_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all subscriptions (for edge functions)
CREATE POLICY "Service role can manage subscriptions"
  ON public.twitch_eventsub_subscriptions
  FOR ALL
  USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_twitch_eventsub_subscriptions_updated_at
  BEFORE UPDATE ON public.twitch_eventsub_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
