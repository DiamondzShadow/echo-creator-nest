import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create Supabase client with the auth token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { 
        headers: { 
          Authorization: authHeader 
        } 
      }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: `Authentication failed: ${authError.message}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!user) {
      console.error('No user found from token');
      return new Response(
        JSON.stringify({ error: 'No user found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('User authenticated:', user.id);

    const LIVEPEER_API_KEY = Deno.env.get('LIVEPEER_API_KEY');
    if (!LIVEPEER_API_KEY) {
      throw new Error('LIVEPEER_API_KEY is not configured');
    }

    const STORJ_ACCESS_KEY_ID = Deno.env.get('STORJ_ACCESS_KEY_ID');
    const STORJ_SECRET_ACCESS_KEY = Deno.env.get('STORJ_SECRET_ACCESS_KEY');
    const STORJ_BUCKET = Deno.env.get('STORJ_BUCKET') || 'livepeer-videos';
    const STORJ_ENDPOINT = Deno.env.get('STORJ_ENDPOINT') || 'https://gateway.storjshare.io';

    const { action, streamId, isInstant } = await req.json();

    if (action === 'create') {
      // Build stream configuration
      const streamConfig: any = {
        name: `Stream ${Date.now()}`,
        // Optimized profiles for low latency WebRTC playback
        profiles: [
          {
            name: '1080p',
            bitrate: 6000000,
            fps: 30,
            width: 1920,
            height: 1080,
            gop: '2.0',
          },
          {
            name: '720p',
            bitrate: 3000000,
            fps: 30,
            width: 1280,
            height: 720,
            gop: '2.0',
          },
          {
            name: '480p',
            bitrate: 1500000,
            fps: 30,
            width: 854,
            height: 480,
            gop: '2.0',
          },
          {
            name: '360p',
            bitrate: 800000,
            fps: 30,
            width: 640,
            height: 360,
            gop: '2.0',
          },
        ],
        record: true,
      };

      // If this is an instant stream and Storj is configured, record to Storj
      if (isInstant && STORJ_ACCESS_KEY_ID && STORJ_SECRET_ACCESS_KEY) {
        streamConfig.recordingSpec = {
          profiles: [
            {
              name: 'source',
              bitrate: 6000000,
              fps: 0,
              width: 0,
              height: 0,
            }
          ]
        };
        streamConfig.storage = {
          type: 's3',
          endpoint: STORJ_ENDPOINT,
          credentials: {
            accessKeyId: STORJ_ACCESS_KEY_ID,
            secretAccessKey: STORJ_SECRET_ACCESS_KEY,
          },
          bucket: STORJ_BUCKET,
        };
      }

      // Create a new stream
      const response = await fetch('https://livepeer.studio/api/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(streamConfig),
      });

      const stream = await response.json();
      console.log('Created stream:', stream);

      return new Response(
        JSON.stringify({ 
          streamId: stream.id,
          streamKey: stream.streamKey,
          playbackId: stream.playbackId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'delete' && streamId) {
      // Verify user owns the stream before deleting
      const { data: streamData, error: streamError } = await supabase
        .from('live_streams')
        .select('user_id, livepeer_stream_id')
        .eq('livepeer_stream_id', streamId)
        .single();

      if (streamError || !streamData) {
        return new Response(
          JSON.stringify({ error: 'Stream not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (streamData.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: You do not own this stream' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete stream from Livepeer
      await fetch(`https://livepeer.studio/api/stream/${streamId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
        },
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'get' && streamId) {
      // Verify user owns the stream before getting details
      const { data: streamData, error: streamError } = await supabase
        .from('live_streams')
        .select('user_id, livepeer_stream_id')
        .eq('livepeer_stream_id', streamId)
        .single();

      if (streamError || !streamData) {
        return new Response(
          JSON.stringify({ error: 'Stream not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (streamData.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: You do not own this stream' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get stream info from Livepeer
      const response = await fetch(`https://livepeer.studio/api/stream/${streamId}`, {
        headers: {
          'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
        },
      });

      const stream = await response.json();
      return new Response(
        JSON.stringify(stream),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Livepeer error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});