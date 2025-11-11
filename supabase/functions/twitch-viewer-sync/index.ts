import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const clientId = Deno.env.get('TWITCH_CLIENT_ID');
    if (!clientId) {
      throw new Error('TWITCH_CLIENT_ID not configured');
    }

    console.log('Starting Twitch viewer count sync...');

    // Get all active Twitch streams (identified by livepeer_playback_id starting with 'twitch_')
    const { data: activeStreams, error: streamsError } = await supabaseClient
      .from('live_streams')
      .select('id, user_id, livepeer_playback_id, viewer_count')
      .eq('is_live', true)
      .like('livepeer_playback_id', 'twitch_%');

    if (streamsError) {
      console.error('Error fetching active streams:', streamsError);
      throw streamsError;
    }

    if (!activeStreams || activeStreams.length === 0) {
      console.log('No active Twitch streams found');
      return new Response(
        JSON.stringify({ success: true, message: 'No active streams to sync' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${activeStreams.length} active Twitch streams`);

    let updatedCount = 0;
    let errorCount = 0;

    // Process each stream
    for (const stream of activeStreams) {
      try {
        // Extract twitch_user_id from livepeer_playback_id (format: twitch_<twitch_user_id>)
        const twitchUserId = stream.livepeer_playback_id.replace('twitch_', '');
        
        // Get the access token for this user
        const { data: connection, error: connectionError } = await supabaseClient
          .from('twitch_connections')
          .select('access_token')
          .eq('twitch_user_id', twitchUserId)
          .single();

        if (connectionError || !connection) {
          console.error(`No Twitch connection found for user ${stream.user_id}`);
          errorCount++;
          continue;
        }

        // Fetch current stream info from Twitch API
        const streamResponse = await fetch(
          `https://api.twitch.tv/helix/streams?user_id=${twitchUserId}`,
          {
            headers: {
              'Client-ID': clientId,
              'Authorization': `Bearer ${connection.access_token}`,
            },
          }
        );

        if (!streamResponse.ok) {
          console.error(`Failed to fetch stream info for ${twitchUserId}: ${streamResponse.status}`);
          errorCount++;
          continue;
        }

        const streamData = await streamResponse.json();
        const twitchStream = streamData.data?.[0];

        if (!twitchStream) {
          // Stream is offline, mark as ended
          console.log(`Stream ${stream.id} is now offline, marking as ended`);
          await supabaseClient
            .from('live_streams')
            .update({
              is_live: false,
              ended_at: new Date().toISOString(),
            })
            .eq('id', stream.id);
          updatedCount++;
        } else {
          // Update viewer count
          const newViewerCount = twitchStream.viewer_count || 0;
          
          if (newViewerCount !== stream.viewer_count) {
            console.log(`Updating stream ${stream.id}: ${stream.viewer_count} -> ${newViewerCount} viewers`);
            await supabaseClient
              .from('live_streams')
              .update({
                viewer_count: newViewerCount,
                updated_at: new Date().toISOString(),
              })
              .eq('id', stream.id);
            updatedCount++;
          }
        }

        // Rate limit protection: small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing stream ${stream.id}:`, error);
        errorCount++;
      }
    }

    const result = {
      success: true,
      total_streams: activeStreams.length,
      updated: updatedCount,
      errors: errorCount,
      timestamp: new Date().toISOString(),
    };

    console.log('Sync complete:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in twitch-viewer-sync:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
