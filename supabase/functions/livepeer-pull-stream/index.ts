import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LIVEPEER_API_KEY = Deno.env.get('LIVEPEER_API_KEY');
    if (!LIVEPEER_API_KEY) {
      throw new Error('LIVEPEER_API_KEY is not configured');
    }

    const { action, streamId, pullUrl, pullUrlHeaders } = await req.json();

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
      // Delete pull stream
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
