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
    console.log('🔵 Livepeer stream function called');

    const LIVEPEER_API_KEY = Deno.env.get('LIVEPEER_API_KEY');
    console.log('🔑 LIVEPEER_API_KEY exists:', !!LIVEPEER_API_KEY);
    
    if (!LIVEPEER_API_KEY) {
      console.error('❌ LIVEPEER_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'LIVEPEER_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const STORJ_ACCESS_KEY_ID = Deno.env.get('STORJ_ACCESS_KEY_ID');
    const STORJ_SECRET_ACCESS_KEY = Deno.env.get('STORJ_SECRET_ACCESS_KEY');
    const STORJ_BUCKET = Deno.env.get('STORJ_BUCKET') || 'livepeer-videos';
    const STORJ_ENDPOINT = Deno.env.get('STORJ_ENDPOINT') || 'https://gateway.storjshare.io';

    const { action, streamId, isInstant } = await req.json();
    console.log('📥 Request:', { action, streamId, isInstant });

    if (action === 'create') {
      console.log('🎥 Creating stream...');
      
      // Build stream configuration following Livepeer docs
      const streamConfig: any = {
        name: `Stream ${Date.now()}`,
        // Low latency profiles optimized for WebRTC (gop: 2.0 seconds)
        profiles: [
          {
            name: '1080p',
            bitrate: 6000000,
            fps: 30,
            width: 1920,
            height: 1080,
            gop: '2.0', // 2 second keyframe interval for low latency
            // Force Baseline profile to avoid B-frames for WebRTC compatibility
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
        record: true, // Enable recording
      };

      // Add Storj storage if configured
      if (isInstant && STORJ_ACCESS_KEY_ID && STORJ_SECRET_ACCESS_KEY) {
        console.log('📦 Adding Storj storage configuration');
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

      console.log('📡 Calling Livepeer API...');
      // Create stream via Livepeer API
      const response = await fetch('https://livepeer.studio/api/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(streamConfig),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Livepeer API error:', response.status, errorText);
        return new Response(
          JSON.stringify({ error: `Livepeer API error: ${response.status} - ${errorText}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const stream = await response.json();
      console.log('✅ Stream created:', { id: stream.id, playbackId: stream.playbackId });

      return new Response(
        JSON.stringify({ 
          streamId: stream.id,
          streamKey: stream.streamKey,
          playbackId: stream.playbackId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'delete' && streamId) {
      console.log('🗑️ Deleting stream:', streamId);
      
      // Delete stream from Livepeer
      const response = await fetch(`https://livepeer.studio/api/stream/${streamId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Delete error:', response.status, errorText);
      }

      console.log('✅ Stream deleted');
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'get' && streamId) {
      console.log('📖 Getting stream info:', streamId);
      
      // Get stream info from Livepeer
      const response = await fetch(`https://livepeer.studio/api/stream/${streamId}`, {
        headers: {
          'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Get error:', response.status, errorText);
        return new Response(
          JSON.stringify({ error: `Failed to get stream: ${response.status}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const stream = await response.json();
      console.log('✅ Stream info retrieved');
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