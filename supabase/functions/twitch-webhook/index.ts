import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const twitchClientSecret = Deno.env.get('TWITCH_CLIENT_SECRET');
    if (!twitchClientSecret) {
      throw new Error('TWITCH_CLIENT_SECRET not configured');
    }

    // Get headers
    const messageId = req.headers.get('Twitch-Eventsub-Message-Id');
    const timestamp = req.headers.get('Twitch-Eventsub-Message-Timestamp');
    const signature = req.headers.get('Twitch-Eventsub-Message-Signature');
    const messageType = req.headers.get('Twitch-Eventsub-Message-Type');

    console.log('Received webhook:', { messageType, messageId });

    const body = await req.text();
    const data = JSON.parse(body);

    // Verify signature using Deno's built-in crypto
    if (!messageId || !timestamp) {
      console.error('Missing required headers');
      return new Response(JSON.stringify({ error: 'Missing required headers' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const hmacMessage = messageId + timestamp + body;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(twitchClientSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature_bytes = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(hmacMessage)
    );
    const hashArray = Array.from(new Uint8Array(signature_bytes));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const expectedSignature = 'sha256=' + hashHex;

    if (signature !== expectedSignature) {
      console.error('Invalid signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle webhook verification challenge
    if (messageType === 'webhook_callback_verification') {
      console.log('Webhook verification challenge received');
      console.log('Challenge value:', data.challenge);
      
      // Return ONLY the challenge string with minimal headers
      // Twitch requires exact format: 200 status, text/plain, raw challenge
      return new Response(data.challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Handle revocation
    if (messageType === 'revocation') {
      console.log('Webhook revoked:', data);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle notification
    if (messageType === 'notification') {
      const event = data.subscription.type;
      const eventData = data.event;

      console.log('Event type:', event);
      console.log('Event data:', eventData);

      if (event === 'stream.online') {
        // Find the user with this Twitch user ID
        const { data: twitchConnection, error: connectionError } = await supabaseClient
          .from('twitch_connections')
          .select('user_id, twitch_username, access_token')
          .eq('twitch_user_id', eventData.broadcaster_user_id)
          .single();

        if (connectionError) {
          console.error('Error finding user:', connectionError);
          return new Response(JSON.stringify({ error: 'User not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('Found user:', twitchConnection);

        // Get stream info from Twitch API
        const clientId = Deno.env.get('TWITCH_CLIENT_ID');
        const streamResponse = await fetch(
          `https://api.twitch.tv/helix/streams?user_id=${eventData.broadcaster_user_id}`,
          {
            headers: {
              'Client-ID': clientId!,
              'Authorization': `Bearer ${twitchConnection.access_token || ''}`,
            },
          }
        );

        const streamData = await streamResponse.json();
        const stream = streamData.data?.[0];

        // Create live stream entry
        const { data: liveStream, error: insertError } = await supabaseClient
          .from('live_streams')
          .insert({
            user_id: twitchConnection.user_id,
            title: stream?.title || `${twitchConnection.twitch_username} is live on Twitch`,
            description: `Streaming on Twitch: ${stream?.game_name || 'Live'}`,
            is_live: true,
            started_at: new Date().toISOString(),
            viewer_count: stream?.viewer_count || 0,
            thumbnail_url: stream?.thumbnail_url?.replace('{width}', '1920').replace('{height}', '1080'),
            livepeer_stream_id: `twitch_${eventData.broadcaster_user_id}_${Date.now()}`,
            livepeer_playback_id: `twitch_${eventData.broadcaster_user_id}`,
            twitch_username: twitchConnection.twitch_username,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating stream:', insertError);
          throw insertError;
        }

        console.log('Created live stream:', liveStream);

        // Get the broadcaster's profile info
        const { data: broadcasterProfile } = await supabaseClient
          .from('profiles')
          .select('display_name, username')
          .eq('id', twitchConnection.user_id)
          .single();

        const broadcasterName = broadcasterProfile?.display_name || broadcasterProfile?.username || twitchConnection.twitch_username;

        // Get all followers of this user
        const { data: followers } = await supabaseClient
          .from('followers')
          .select('follower_id')
          .eq('following_id', twitchConnection.user_id);

        // Create notifications for all followers
        if (followers && followers.length > 0) {
          const notifications = followers.map(follower => ({
            user_id: follower.follower_id,
            type: 'stream_live',
            title: `${broadcasterName} is live!`,
            message: stream?.title || `${broadcasterName} is streaming on Twitch`,
            link: `/watch/${liveStream.id}`,
            metadata: {
              stream_id: liveStream.id,
              broadcaster_id: twitchConnection.user_id,
              twitch_username: twitchConnection.twitch_username,
              game_name: stream?.game_name,
            }
          }));

          const { error: notificationError } = await supabaseClient
            .from('notifications')
            .insert(notifications);

          if (notificationError) {
            console.error('Error creating notifications:', notificationError);
          } else {
            console.log(`Created ${notifications.length} notifications for followers`);
          }
        }

      } else if (event === 'stream.offline') {
        // Find and update the stream
        const { data: twitchConnection } = await supabaseClient
          .from('twitch_connections')
          .select('user_id')
          .eq('twitch_user_id', eventData.broadcaster_user_id)
          .single();

        if (twitchConnection) {
          const { error: updateError } = await supabaseClient
            .from('live_streams')
            .update({
              is_live: false,
              ended_at: new Date().toISOString(),
            })
            .eq('user_id', twitchConnection.user_id)
            .eq('is_live', true)
            .like('livepeer_stream_id', 'twitch_%');

          if (updateError) {
            console.error('Error updating stream:', updateError);
          } else {
            console.log('Stream ended');
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in twitch-webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
