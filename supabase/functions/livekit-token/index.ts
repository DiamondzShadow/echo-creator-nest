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

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: authHeader ? {
          headers: { Authorization: authHeader },
        } : undefined,
      }
    );

    // Try to get authenticated user (optional for viewers)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Parse request body
    const { roomName, action, streamId, enableRecording, saveToStorj } = await req.json();

    // Get LiveKit credentials from environment
    const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY');
    const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET');

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      throw new Error('LiveKit credentials not configured');
    }

    if (action === 'create_token') {
      // User must be authenticated to create broadcaster token
      if (!user) {
        throw new Error('Unauthorized: You must be logged in to broadcast');
      }

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

      // Create LiveKit access token for host/publisher with stable identity per room
      const hostIdentity = `host-${roomName}-${user.id}`;
      const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: hostIdentity,
        name: user.email || 'Host',
        metadata: JSON.stringify({
          userId: user.id,
          streamId: streamId,
          role: 'host',
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

      const token = await at.toJwt();

      // Store recording preferences in database
      if (enableRecording && streamId) {
        try {
          const recordingConfig = {
            enabled: enableRecording,
            saveToStorj: saveToStorj || false,
          };
          
          await supabase
            .from('live_streams')
            .update({
              description: streamId 
                ? `Recording: ${enableRecording ? 'enabled' : 'disabled'}${saveToStorj ? ' (Storj)' : ''}`
                : null,
            })
            .eq('id', streamId);
          
          console.log('Recording settings stored:', recordingConfig);
        } catch (updateError) {
          console.error('Failed to update recording settings:', updateError);
        }
      }

      return new Response(
        JSON.stringify({
          token,
          roomName,
          identity: user.id,
          recordingEnabled: enableRecording,
          saveToStorj: saveToStorj,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else if (action === 'create_viewer_token') {
      // Create viewer token (subscribe-only) with unique identity to avoid kicking host or other viewers
      // Viewers can be anonymous or authenticated
      const userId = user?.id || `anonymous-${crypto.randomUUID().slice(0,12)}`;
      const viewerIdentity = `viewer-${roomName}-${userId}-${crypto.randomUUID().slice(0,8)}`;
      const viewerName = user?.email || `Viewer-${crypto.randomUUID().slice(0,4)}`;
      
      const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: viewerIdentity,
        name: viewerName,
        // Set token to expire in 24 hours (86400 seconds)
        ttl: '24h',
        metadata: JSON.stringify({
          userId: userId,
          role: 'viewer',
          authenticated: !!user,
        }),
      });

      // Grant viewer permissions (subscribe only, but MUST have canSubscribe: true)
      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: false,
        canPublishData: false,
        canSubscribe: true, // CRITICAL: Viewers must be able to subscribe
      });

      const token = await at.toJwt();

      return new Response(
        JSON.stringify({
          token,
          roomName,
          identity: userId,
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
