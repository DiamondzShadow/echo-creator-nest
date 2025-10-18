import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * LiveKit Webhook Handler
 * 
 * Handles webhooks from LiveKit for:
 * - Room events (created, ended)
 * - Egress events (recording started, completed, failed)
 * - Participant events (joined, left)
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const webhookData = await req.json();
    console.log('LiveKit webhook received:', JSON.stringify(webhookData, null, 2));

    const { event, room, egress, egressInfo } = webhookData;

    // Handle room events
    if (event === 'room_started') {
      console.log(`Room started: ${room?.name}`);
      
      // Update stream status
      if (room?.name) {
        const { error } = await supabase
          .from('live_streams')
          .update({
            is_live: true,
            started_at: new Date().toISOString(),
          })
          .eq('livepeer_playback_id', room.name);

        if (error) {
          console.error('Error updating stream status:', error);
        }
      }
    }

    if (event === 'room_finished') {
      console.log(`Room finished: ${room?.name}`);
      
      // Update stream status
      if (room?.name) {
        const { error } = await supabase
          .from('live_streams')
          .update({
            is_live: false,
            ended_at: new Date().toISOString(),
          })
          .eq('livepeer_playback_id', room.name);

        if (error) {
          console.error('Error updating stream status:', error);
        }
      }
    }

    // Handle egress (recording) events
    if (event === 'egress_started') {
      console.log(`Egress started: ${egressInfo?.egressId}`);
      console.log(`Recording to: ${egressInfo?.fileResults?.[0]?.filename}`);
    }

    if (event === 'egress_ended') {
      console.log(`Egress ended: ${egressInfo?.egressId}`);
      const fileResult = egressInfo?.fileResults?.[0];
      
      if (fileResult && fileResult.filename) {
        console.log(`Recording saved: ${fileResult.filename}`);
        console.log(`File size: ${fileResult.size} bytes`);
        console.log(`Duration: ${fileResult.duration}ms`);

        // Extract room name from recording
        const roomName = egressInfo?.roomName || egressInfo?.roomId;
        
        if (roomName) {
          // Find the stream
          const { data: streamData, error: streamError } = await supabase
            .from('live_streams')
            .select('*')
            .eq('livepeer_playback_id', roomName)
            .single();

          if (streamError || !streamData) {
            console.error('Stream not found:', roomName);
            return new Response(
              JSON.stringify({ success: true, message: 'Stream not found' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Create asset record for the recording
          const { data: asset, error: assetError } = await supabase
            .from('assets')
            .insert({
              user_id: streamData.user_id,
              stream_id: streamData.id,
              title: streamData.title || 'Untitled Recording',
              description: `LiveKit recording\nFile: ${fileResult.filename}`,
              livepeer_asset_id: egressInfo.egressId,
              livepeer_playback_id: egressInfo.egressId, // Use egress ID as playback reference
              status: 'ready',
              duration: fileResult.duration ? fileResult.duration / 1000 : null, // Convert ms to seconds
              size: fileResult.size,
              ready_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (assetError) {
            console.error('Error creating asset:', assetError);
          } else {
            console.log('Asset created:', asset);
          }
        }
      }
    }

    if (event === 'egress_failed') {
      console.error(`Egress failed: ${egressInfo?.egressId}`);
      console.error(`Error: ${egressInfo?.error}`);
    }

    // Handle participant events for viewer count
    if (event === 'participant_joined' || event === 'participant_left') {
      if (room?.name && room?.numParticipants !== undefined) {
        console.log(`Participant ${event}: ${room.numParticipants} in room`);
        
        const { error } = await supabase
          .from('live_streams')
          .update({
            viewer_count: Math.max(0, room.numParticipants - 1), // Subtract broadcaster
          })
          .eq('livepeer_playback_id', room.name);

        if (error) {
          console.error('Error updating viewer count:', error);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('LiveKit webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
