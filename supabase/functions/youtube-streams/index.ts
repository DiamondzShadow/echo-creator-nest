import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get YouTube connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'youtube')
      .single();

    if (connectionError || !connection) {
      return new Response(JSON.stringify({ error: 'YouTube not connected' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if token is expired and refresh if needed
    let accessToken = connection.access_token;
    const expiresAt = new Date(connection.token_expires_at);
    
    if (expiresAt < new Date()) {
      // Token expired, refresh it
      const YOUTUBE_CLIENT_ID = Deno.env.get('YOUTUBE_CLIENT_ID');
      const YOUTUBE_CLIENT_SECRET = Deno.env.get('YOUTUBE_CLIENT_SECRET');

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: YOUTUBE_CLIENT_ID!,
          client_secret: YOUTUBE_CLIENT_SECRET!,
          refresh_token: connection.refresh_token!,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        return new Response(JSON.stringify({ error: 'Failed to refresh token, please reconnect' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tokens = await refreshResponse.json();
      accessToken = tokens.access_token;

      // Update stored token
      await supabase.from('platform_connections').update({
        access_token: accessToken,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      }).eq('id', connection.id);
    }

    // Fetch live broadcasts using mine=true (broadcastStatus and mine are incompatible)
    const broadcastsResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status,contentDetails&mine=true',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!broadcastsResponse.ok) {
      const error = await broadcastsResponse.text();
      console.error('Failed to fetch broadcasts:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch YouTube streams' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const broadcasts = await broadcastsResponse.json();
    
    // Filter for active/live broadcasts only
    const activeItems = (broadcasts.items || []).filter((item: any) => 
      item.status.lifeCycleStatus === 'live' || item.status.lifeCycleStatus === 'liveStarting'
    );
    
    // Fetch RTMP URLs for each broadcast
    const streamsWithRtmp = await Promise.all(
      activeItems.map(async (item: any) => {
        let rtmpUrl = null;
        
        // Get the bound stream ID from the broadcast
        const boundStreamId = item.contentDetails?.boundStreamId;
        
        if (boundStreamId) {
          try {
            // Fetch the stream details which contain the RTMP ingestion info
            const streamResponse = await fetch(
              `https://www.googleapis.com/youtube/v3/liveStreams?part=cdn,snippet&id=${boundStreamId}`,
              {
                headers: { Authorization: `Bearer ${accessToken}` },
              }
            );
            
            if (streamResponse.ok) {
              const streamData = await streamResponse.json();
              const stream = streamData.items?.[0];
              
              console.log('Stream CDN data:', JSON.stringify(stream?.cdn, null, 2));
              
              if (stream?.cdn?.ingestionInfo) {
                const ingestionInfo = stream.cdn.ingestionInfo;
                
                // Check for traditional RTMP first
                if (ingestionInfo.ingestionAddress && ingestionInfo.streamName) {
                  // Only use RTMP URLs, not WebRTC
                  if (ingestionInfo.ingestionAddress.startsWith('rtmp://')) {
                    rtmpUrl = `${ingestionInfo.ingestionAddress}/${ingestionInfo.streamName}`;
                  } else {
                    console.log('Stream uses WebRTC, no RTMP URL available');
                  }
                }
              }
            }
          } catch (error) {
            console.error(`Failed to fetch RTMP for stream ${boundStreamId}:`, error);
          }
        }
        
        return {
          id: item.id,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
          status: item.status.lifeCycleStatus,
          scheduledStartTime: item.snippet.scheduledStartTime,
          actualStartTime: item.snippet.actualStartTime,
          watchUrl: `https://www.youtube.com/watch?v=${item.id}`,
          liveUrl: `https://youtube.com/live/${item.id}`,
          rtmpUrl: rtmpUrl,
        };
      })
    );
    
    const streams = streamsWithRtmp;

    return new Response(JSON.stringify({ streams }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('YouTube streams error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
