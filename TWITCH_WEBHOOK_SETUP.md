# Twitch Stream Webhook Setup

This guide explains how to set up automatic Twitch stream synchronization so that when users go live on Twitch, their streams automatically appear in the CrabbyTV platform.

## How It Works

When a user connects their Twitch account and goes live on Twitch, the webhook:
1. Receives a notification from Twitch EventSub
2. Creates an entry in the `live_streams` table
3. Syncs stream title, description, thumbnail, and viewer count
4. Updates the stream status when the stream ends

## Webhook URL

Your webhook endpoint is:
```
https://woucixqbnzmvlvnaaelb.supabase.co/functions/v1/twitch-webhook
```

## Setup Instructions

### 1. Register Your Application with Twitch

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console)
2. Click "Register Your Application"
3. Fill in the required information:
   - **Name**: CrabbyTV (or your app name)
   - **OAuth Redirect URLs**: `https://crabbytv.com/auth/twitch/callback`
   - **Category**: Website Integration
4. Save your **Client ID** and **Client Secret**

### 2. Set Up EventSub Webhooks

You need to subscribe to two events for each user:
- `stream.online` - Triggered when a user starts streaming
- `stream.offline` - Triggered when a user stops streaming

#### Using Twitch CLI (Recommended for Testing)

```bash
# Install Twitch CLI
brew install twitchdev/twitch/twitch-cli

# Configure with your credentials
twitch configure

# Subscribe to stream.online event
twitch api post eventsub/subscriptions \
  -b '{
    "type": "stream.online",
    "version": "1",
    "condition": {
      "broadcaster_user_id": "USER_TWITCH_ID"
    },
    "transport": {
      "method": "webhook",
      "callback": "https://woucixqbnzmvlvnaaelb.supabase.co/functions/v1/twitch-webhook",
      "secret": "YOUR_TWITCH_CLIENT_SECRET"
    }
  }'

# Subscribe to stream.offline event
twitch api post eventsub/subscriptions \
  -b '{
    "type": "stream.offline",
    "version": "1",
    "condition": {
      "broadcaster_user_id": "USER_TWITCH_ID"
    },
    "transport": {
      "method": "webhook",
      "callback": "https://woucixqbnzmvlvnaaelb.supabase.co/functions/v1/twitch-webhook",
      "secret": "YOUR_TWITCH_CLIENT_SECRET"
    }
  }'
```

#### Using REST API Directly

```bash
# Create subscription for stream.online
curl -X POST 'https://api.twitch.tv/helix/eventsub/subscriptions' \
  -H 'Authorization: Bearer YOUR_APP_ACCESS_TOKEN' \
  -H 'Client-ID: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "stream.online",
    "version": "1",
    "condition": {
      "broadcaster_user_id": "USER_TWITCH_ID"
    },
    "transport": {
      "method": "webhook",
      "callback": "https://woucixqbnzmvlvnaaelb.supabase.co/functions/v1/twitch-webhook",
      "secret": "YOUR_TWITCH_CLIENT_SECRET"
    }
  }'

# Create subscription for stream.offline
curl -X POST 'https://api.twitch.tv/helix/eventsub/subscriptions' \
  -H 'Authorization: Bearer YOUR_APP_ACCESS_TOKEN' \
  -H 'Client-ID: YOUR_CLIENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "stream.offline",
    "version": "1",
    "condition": {
      "broadcaster_user_id": "USER_TWITCH_ID"
    },
    "transport": {
      "method": "webhook",
      "callback": "https://woucixqbnzmvlvnaaelb.supabase.co/functions/v1/twitch-webhook",
      "secret": "YOUR_TWITCH_CLIENT_SECRET"
    }
  }'
```

### 3. Automatic Subscription (Recommended)

For production, you should automatically create webhook subscriptions when users connect their Twitch account. You can do this by:

1. Updating the `twitch-oauth` edge function to create subscriptions after successful OAuth
2. Using the Twitch API to create subscriptions programmatically
3. Storing subscription IDs in the database for management

## Webhook Verification

When you first set up a webhook, Twitch will send a verification challenge. The webhook endpoint automatically handles this by:
1. Validating the signature using your `TWITCH_CLIENT_SECRET`
2. Responding with the challenge token to verify the endpoint

## Testing

To test the webhook:

1. Connect a Twitch account through the OAuth flow
2. Start a stream on Twitch
3. Check the `live_streams` table - a new entry should be created
4. Stop the stream on Twitch
5. Check the `live_streams` table - the entry should be marked as ended

## Monitoring

Check the edge function logs to monitor webhook events:

```bash
supabase functions logs twitch-webhook --project-ref woucixqbnzmvlvnaaelb
```

## Security

The webhook verifies all incoming requests using HMAC-SHA256 signature validation with your `TWITCH_CLIENT_SECRET`. This ensures that only authentic requests from Twitch are processed.

## Troubleshooting

### Webhook Not Receiving Events

1. Verify your webhook URL is publicly accessible
2. Check that `TWITCH_CLIENT_SECRET` is correctly set in Supabase secrets
3. Ensure the subscription was created successfully
4. Check edge function logs for errors

### Stream Not Appearing

1. Verify the user has connected their Twitch account
2. Check that the `twitch_connections` table has the user's Twitch user ID
3. Verify the webhook subscription is active for that user's Twitch ID
4. Check edge function logs for any errors during stream creation

### Signature Verification Failures

1. Ensure `TWITCH_CLIENT_SECRET` matches the secret used when creating the subscription
2. Check that the webhook is using the correct HMAC-SHA256 algorithm
3. Verify the message timestamp is within acceptable range (10 minutes)

## Database Schema

The webhook creates entries in the `live_streams` table with:
- `user_id`: The CrabbyTV user ID (from `twitch_connections`)
- `title`: Stream title from Twitch
- `description`: Stream category/game
- `is_live`: true when stream starts, false when it ends
- `started_at`: Stream start timestamp
- `ended_at`: Stream end timestamp
- `viewer_count`: Current viewer count
- `thumbnail_url`: Stream thumbnail
- `livepeer_stream_id`: Unique identifier starting with `twitch_`
- `livepeer_playback_id`: Twitch-specific playback identifier

## Next Steps

1. Set up webhook subscriptions for all users with Twitch connections
2. Implement automatic subscription creation in the OAuth flow
3. Add periodic viewer count updates (optional)
4. Consider adding webhook re-validation logic for expired subscriptions
