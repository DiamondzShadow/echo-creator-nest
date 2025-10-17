import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AccessToken } from 'https://esm.sh/livekit-server-sdk@2.6.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { roomName, action, streamId } = await req.json();

    // Get LiveKit credentials from environment
    const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY');
    const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET');

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      throw new Error('LiveKit credentials not configured');
    }

    if (action === 'create_token') {
      // Verify user owns this stream
      if (streamId) {
        const { data: streamData, error: streamError } = await supabase
          .from('live_streams')
          .select('user_id')
          .eq('id', streamId)
          .single();

        if (streamError || !streamData) {
          throw new Error('Stream not found');
        }

        if (streamData.user_id !== user.id) {
          throw new Error('Forbidden: You do not own this stream');
        }
      }

      // Create LiveKit access token
      const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: user.id,
        name: user.email || 'Anonymous',
        metadata: JSON.stringify({
          userId: user.id,
          streamId: streamId,
        }),
      });

      // Grant permissions
      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canPublishData: true,
        canSubscribe: true,
      });

      const token = at.toJwt();

      return new Response(
        JSON.stringify({
          token,
          roomName,
          identity: user.id,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else if (action === 'create_viewer_token') {
      // Create viewer token (subscribe-only)
      const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: user.id,
        name: user.email || 'Viewer',
        metadata: JSON.stringify({
          userId: user.id,
          role: 'viewer',
        }),
      });

      // Grant viewer permissions (subscribe only)
      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: false,
        canPublishData: false,
        canSubscribe: true,
      });

      const token = at.toJwt();

      return new Response(
        JSON.stringify({
          token,
          roomName,
          identity: user.id,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      throw new Error('Invalid action');
    }
  } catch (error: unknown) {
    console.error('LiveKit token error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
