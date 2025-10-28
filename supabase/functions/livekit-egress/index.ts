import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Start LiveKit Egress (Recording) to Storj
 * 
 * This function starts a LiveKit room composite recording
 * and saves it directly to Storj via S3-compatible API
 */
serve(async (req) => {
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
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { roomName, streamId } = await req.json();
    
    if (!roomName) {
      throw new Error('Room name is required');
    }

    console.log(`Starting egress for room: ${roomName}`);

    // Get LiveKit credentials
    const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY');
    const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET');
    const LIVEKIT_URL = 'https://diamondzchain-ep9nznbn.livekit.cloud';

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      throw new Error('LiveKit credentials not configured');
    }

    // Get Storj credentials (optional - gracefully handle if missing)
    const STORJ_ACCESS_KEY_ID = Deno.env.get('STORJ_ACCESS_KEY_ID');
    const STORJ_SECRET_ACCESS_KEY = Deno.env.get('STORJ_SECRET_ACCESS_KEY');
    const STORJ_BUCKET = Deno.env.get('STORJ_BUCKET') || 'livepeer-videos';
    const STORJ_ENDPOINT = Deno.env.get('STORJ_ENDPOINT') || 'https://gateway.storjshare.io';

    // If Storj credentials are not configured, return helpful error instead of crashing
    if (!STORJ_ACCESS_KEY_ID || !STORJ_SECRET_ACCESS_KEY) {
      console.warn('⚠️ Storj credentials not configured - recording disabled');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Recording requires Storj storage to be configured. Please contact admin to set up STORJ_ACCESS_KEY_ID and STORJ_SECRET_ACCESS_KEY.',
          code: 'STORJ_NOT_CONFIGURED',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate output filename
    const timestamp = Date.now();
    const filename = `livekit-recordings/${user.id}/${roomName}_${timestamp}.mp4`;

    // Create egress request using LiveKit REST API
    // Documentation: https://docs.livekit.io/home/egress/overview/
    const egressRequest = {
      room_name: roomName,
      file: {
        filepath: filename,
        output: {
          case: 's3',
          value: {
            access_key: STORJ_ACCESS_KEY_ID,
            secret: STORJ_SECRET_ACCESS_KEY,
            region: 'us-east-1',
            endpoint: STORJ_ENDPOINT,
            bucket: STORJ_BUCKET,
          }
        }
      },
      options: {
        preset: 'H264_720P_30'
      }
    };

    // Create JWT token for LiveKit API authentication
    // LiveKit requires a JWT with specific claims
    const encoder = new TextEncoder();
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: LIVEKIT_API_KEY,
      exp: now + 3600, // 1 hour expiration
      nbf: now - 60,   // Not before 1 min ago
      sub: user.id,    // Subject (user ID)
    };

    // Helper to base64url encode
    const base64url = (data: string) => {
      return btoa(data)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    };

    const headerB64 = base64url(JSON.stringify(header));
    const payloadB64 = base64url(JSON.stringify(payload));
    const signatureInput = `${headerB64}.${payloadB64}`;

    // Sign with HMAC-SHA256
    const keyData = encoder.encode(LIVEKIT_API_SECRET);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signatureInput));
    const signatureB64 = base64url(String.fromCharCode(...new Uint8Array(signature)));
    const jwtToken = `${signatureInput}.${signatureB64}`;

    console.log('Sending egress request to LiveKit...');
    
    // Start room composite egress
    const egressResponse = await fetch(`${LIVEKIT_URL}/twirp/livekit.Egress/StartRoomCompositeEgress`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(egressRequest),
    });

    if (!egressResponse.ok) {
      const errorText = await egressResponse.text();
      console.error('LiveKit egress error:', errorText);
      throw new Error(`Failed to start egress: ${egressResponse.statusText}`);
    }

    const egressData = await egressResponse.json();
    console.log('Egress started:', egressData);

    // Update stream record with egress info
    if (streamId) {
      await supabase
        .from('live_streams')
        .update({
          description: `Recording to Storj: ${filename}`,
        })
        .eq('id', streamId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        egressId: egressData.egress_id,
        filename,
        message: 'Recording started successfully',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('LiveKit egress error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
