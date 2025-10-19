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
    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const token = authHeader.replace('Bearer ', '');

    // Get authenticated user using service role verification
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth verification failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LIVEPEER_API_KEY = Deno.env.get('LIVEPEER_API_KEY');
    if (!LIVEPEER_API_KEY) {
      throw new Error('LIVEPEER_API_KEY is not configured');
    }

    const { action, streamId, pullUrl, pullUrlHeaders } = await req.json();

    // Basic server-side validation for input security
    if (action === 'create') {
      if (typeof pullUrl !== 'string' || pullUrl.length > 2000) {
        return new Response(
          JSON.stringify({ error: 'Invalid pullUrl: must be a string under 2000 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const lower = pullUrl.toLowerCase();
      const allowed = lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('rtmp://') || lower.startsWith('rtmps://');
      if (!allowed) {
        return new Response(
          JSON.stringify({ error: 'Invalid URL scheme: use http(s) or rtmp(s)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (lower.includes('studio.youtube.com')) {
        return new Response(
          JSON.stringify({ error: 'YouTube Studio URLs are not supported. Use https://www.youtube.com/watch?v=VIDEO_ID or https://youtube.com/live/ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'create') {
      // Create a new pull stream
      // pullUrl can be:
      // - YouTube Live HLS URL
      // - RTMP URL from any platform
      // - Any HLS/RTMP stream URL
      const response = await fetch('https://livepeer.studio/api/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Pull Stream ${Date.now()}`,
          pull: {
            source: pullUrl,
            headers: pullUrlHeaders || {}, // Optional headers for authentication
          },
          // Optimized profiles for low latency WebRTC playback
          profiles: [
            {
              name: '1080p',
              bitrate: 6000000,
              fps: 30,
              width: 1920,
              height: 1080,
              gop: '2.0',
              profile: 'H264Baseline',
            },
            {
              name: '720p',
              bitrate: 3000000,
              fps: 30,
              width: 1280,
              height: 720,
              gop: '2.0',
              profile: 'H264Baseline',
            },
            {
              name: '480p',
              bitrate: 1500000,
              fps: 30,
              width: 854,
              height: 480,
              gop: '2.0',
              profile: 'H264Baseline',
            },
            {
              name: '360p',
              bitrate: 800000,
              fps: 30,
              width: 640,
              height: 360,
              gop: '2.0',
              profile: 'H264Baseline',
            },
          ],
          // Enable recording
          record: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Livepeer API error:', errorText);
        throw new Error(`Failed to create pull stream: ${errorText}`);
      }

      const stream = await response.json();
      console.log('Created pull stream:', stream);

      return new Response(
        JSON.stringify({ 
          streamId: stream.id,
          streamKey: stream.streamKey,
          playbackId: stream.playbackId,
          pullUrl: pullUrl,
        }),
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

      // Get stream info including pull status
      const response = await fetch(`https://livepeer.studio/api/stream/${streamId}`, {
        headers: {
          'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get stream info');
      }

      const stream = await response.json();
      return new Response(
        JSON.stringify(stream),
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

      // Delete pull stream from Livepeer
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
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Livepeer pull stream error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
