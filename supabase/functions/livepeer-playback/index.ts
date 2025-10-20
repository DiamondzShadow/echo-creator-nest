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
      console.error('❌ LIVEPEER_API_KEY is not configured in environment');
      throw new Error('LIVEPEER_API_KEY is not configured');
    }

    const { playbackId } = await req.json();

    if (!playbackId) {
      console.error('❌ No playbackId provided in request');
      return new Response(
        JSON.stringify({ error: 'playbackId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Fetching playback info for:', playbackId);
    console.log('📡 API Endpoint:', `https://livepeer.studio/api/playback/${playbackId}`);

    // Get playback info from Livepeer - includes WebRTC and HLS sources
    const response = await fetch(`https://livepeer.studio/api/playback/${playbackId}`, {
      headers: {
        'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
      },
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Livepeer API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        playbackId
      });
      
      // Provide more specific error messages
      if (response.status === 404) {
        throw new Error(`Stream not found. PlaybackId ${playbackId} does not exist or has expired.`);
      } else if (response.status === 403) {
        throw new Error(`Access denied. The stream might be private or geo-restricted.`);
      } else if (response.status === 401) {
        throw new Error(`Authentication failed. Please check API key configuration.`);
      } else {
        throw new Error(`Failed to fetch playback info: ${response.status} - ${errorText || response.statusText}`);
      }
    }

    const playbackInfo = await response.json();
    
    // Log playback info structure for debugging
    console.log('✅ Playback info retrieved:', {
      playbackId: playbackInfo.playbackId,
      type: playbackInfo.type,
      sourceCount: playbackInfo.source?.length || 0,
      sources: playbackInfo.source?.map((s: any) => ({
        hrn: s.hrn,
        type: s.type,
        url: s.url?.substring(0, 50) + '...'
      })) || [],
      meta: {
        live: playbackInfo.meta?.live,
        playbackPolicy: playbackInfo.meta?.playbackPolicy
      }
    });
    
    // Check if stream has valid sources
    if (!playbackInfo.source || playbackInfo.source.length === 0) {
      console.warn('⚠️ No playback sources available yet for:', playbackId);
      console.log('📝 This might mean the stream hasn\'t started or is still processing');
    }
    
    return new Response(
      JSON.stringify(playbackInfo),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('💥 Playback info error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
