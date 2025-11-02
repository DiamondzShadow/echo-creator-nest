import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge function to end a live stream
 * Designed to be called via navigator.sendBeacon() for reliable cleanup on tab close
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { streamId, endAll } = await req.json();

    console.log('End stream request:', { streamId, endAll, userId: user.id });

    if (endAll) {
      // End all live streams for this user
      const { data: endedStreams, error } = await supabase
        .from('live_streams')
        .update({
          is_live: false,
          ended_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('is_live', true)
        .select();

      if (error) {
        console.error('Error ending streams:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`✅ Ended ${endedStreams?.length || 0} streams for user ${user.id}`);

      // Terminate all LiveKit rooms
      const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY');
      const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET');
      const LIVEKIT_URL = 'https://diamondzchain-ep9nznbn.livekit.cloud';

      if (LIVEKIT_API_KEY && LIVEKIT_API_SECRET && endedStreams) {
        for (const stream of endedStreams) {
          if (stream.livepeer_playback_id?.startsWith('stream-')) {
            try {
              console.log(`🔒 Terminating LiveKit room: ${stream.livepeer_playback_id}`);

              const encoder = new TextEncoder();
              const now = Math.floor(Date.now() / 1000);
              
              const base64url = (bytes: Uint8Array): string => {
                let binary = '';
                for (let i = 0; i < bytes.length; i++) {
                  binary += String.fromCharCode(bytes[i]);
                }
                return btoa(binary)
                  .replace(/\+/g, '-')
                  .replace(/\//g, '_')
                  .replace(/=/g, '');
              };

              const header = { alg: 'HS256', typ: 'JWT' };
              const payload = {
                iss: LIVEKIT_API_KEY,
                exp: now + 3600,
                nbf: now - 60,
                sub: user.id,
                video: {
                  roomAdmin: true,
                  room: stream.livepeer_playback_id,
                }
              };

              const headerB64 = base64url(encoder.encode(JSON.stringify(header)));
              const payloadB64 = base64url(encoder.encode(JSON.stringify(payload)));
              const signatureInput = `${headerB64}.${payloadB64}`;

              const keyData = encoder.encode(LIVEKIT_API_SECRET);
              const key = await crypto.subtle.importKey(
                'raw',
                keyData,
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
              );
              const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signatureInput));
              const signatureB64 = base64url(new Uint8Array(signature));
              const jwtToken = `${signatureInput}.${signatureB64}`;

              const response = await fetch(`${LIVEKIT_URL}/twirp/livekit.RoomService/DeleteRoom`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${jwtToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  room: stream.livepeer_playback_id,
                }),
              });

              if (response.ok) {
                console.log(`✅ LiveKit room terminated: ${stream.livepeer_playback_id}`);
              } else {
                const errorText = await response.text();
                console.error(`⚠️ Failed to terminate room: ${errorText}`);
              }
            } catch (roomError) {
              console.error('Error terminating room:', roomError);
            }
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          endedCount: endedStreams?.length || 0,
          streams: endedStreams,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!streamId) {
      return new Response(
        JSON.stringify({ error: 'streamId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns this stream
    const { data: stream, error: streamError } = await supabase
      .from('live_streams')
      .select('user_id, livepeer_playback_id')
      .eq('id', streamId)
      .single();

    if (streamError || !stream) {
      return new Response(
        JSON.stringify({ error: 'Stream not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (stream.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // End the stream in database
    const { error: updateError } = await supabase
      .from('live_streams')
      .update({
        is_live: false,
        ended_at: new Date().toISOString(),
      })
      .eq('id', streamId);

    if (updateError) {
      console.error('Error ending stream:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Stream ended in database: ${streamId}`);

    // Terminate the LiveKit room to close all connections
    if (stream.livepeer_playback_id?.startsWith('stream-')) {
      try {
        const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY');
        const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET');
        const LIVEKIT_URL = 'https://diamondzchain-ep9nznbn.livekit.cloud';

        if (LIVEKIT_API_KEY && LIVEKIT_API_SECRET) {
          console.log(`🔒 Terminating LiveKit room: ${stream.livepeer_playback_id}`);

          // Create JWT token for LiveKit API
          const encoder = new TextEncoder();
          const now = Math.floor(Date.now() / 1000);
          
          const base64url = (bytes: Uint8Array): string => {
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary)
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=/g, '');
          };

          const header = { alg: 'HS256', typ: 'JWT' };
          const payload = {
            iss: LIVEKIT_API_KEY,
            exp: now + 3600,
            nbf: now - 60,
            sub: user.id,
            video: {
              roomAdmin: true,
              room: stream.livepeer_playback_id,
            }
          };

          const headerB64 = base64url(encoder.encode(JSON.stringify(header)));
          const payloadB64 = base64url(encoder.encode(JSON.stringify(payload)));
          const signatureInput = `${headerB64}.${payloadB64}`;

          const keyData = encoder.encode(LIVEKIT_API_SECRET);
          const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
          );
          const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signatureInput));
          const signatureB64 = base64url(new Uint8Array(signature));
          const jwtToken = `${signatureInput}.${signatureB64}`;

          // Call LiveKit API to delete/terminate the room
          const response = await fetch(`${LIVEKIT_URL}/twirp/livekit.RoomService/DeleteRoom`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${jwtToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              room: stream.livepeer_playback_id,
            }),
          });

          if (response.ok) {
            console.log(`✅ LiveKit room terminated successfully: ${stream.livepeer_playback_id}`);
          } else {
            const errorText = await response.text();
            console.error(`⚠️ Failed to terminate LiveKit room: ${errorText}`);
          }
        }
      } catch (roomError) {
        console.error('Error terminating LiveKit room:', roomError);
        // Don't fail the entire request if room termination fails
      }
    }

    console.log(`✅ Stream cleanup complete: ${streamId}`);

    return new Response(
      JSON.stringify({ success: true, streamId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('End stream error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
