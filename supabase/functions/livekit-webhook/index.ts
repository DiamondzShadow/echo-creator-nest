import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  
  return result === 0;
}

/**
 * Verify LiveKit webhook signature using Web Crypto API
 */
async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(body);
    
    // Import the secret key
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Sign the message
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
    
    // Convert to hex string
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return timingSafeEqual(signature, expectedSignature);
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

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
    // Get LiveKit API credentials for webhook verification
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    if (!apiSecret) {
      console.error('LIVEKIT_API_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook verification not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get signature from Authorization header (LiveKit sends it here)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read body as text for signature verification
    const body = await req.text();
    
    // Verify signature using LiveKit API Secret
    const isValid = await verifyWebhookSignature(body, authHeader, apiSecret);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Webhook signature verified with LiveKit API Secret');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const webhookData = JSON.parse(body);
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

          // Create Storj URL for the recording
          const storjUrl = fileResult.filename 
            ? `${Deno.env.get('STORJ_ENDPOINT') || 'https://gateway.storjshare.io'}/${Deno.env.get('STORJ_BUCKET') || 'livepeer-videos'}/${fileResult.filename}`
            : null;

          console.log('📤 Uploading recording to Livepeer with IPFS...');
          
          // Import recording into Livepeer with IPFS enabled
          try {
            const { data: livepeerData, error: livepeerError } = await supabase.functions.invoke(
              'livepeer-asset',
              {
                body: {
                  action: 'import-url',
                  name: streamData.title || 'Untitled Recording',
                  url: storjUrl,
                  enableIPFS: true,
                }
              }
            );

            if (livepeerError) {
              console.error('❌ Failed to import to Livepeer:', livepeerError);
              
              // Still create asset with Storj URL
              const { data: asset, error: assetError } = await supabase
                .from('assets')
                .insert({
                  user_id: streamData.user_id,
                  stream_id: streamData.id,
                  title: streamData.title || 'Untitled Recording',
                  description: `LiveKit recording\nStorj URL: ${storjUrl}\nFile: ${fileResult.filename}`,
                  livepeer_asset_id: egressInfo.egressId,
                  livepeer_playback_id: storjUrl,
                  status: 'ready',
                  duration: fileResult.duration ? fileResult.duration / 1000 : null,
                  size: fileResult.size,
                  ready_at: new Date().toISOString(),
                })
                .select()
                .single();

              if (assetError) {
                console.error('Error creating asset:', assetError);
              }
            } else {
              console.log('✅ Recording imported to Livepeer:', livepeerData);
              
              // Create asset with Livepeer playback ID
              const { data: asset, error: assetError } = await supabase
                .from('assets')
                .insert({
                  user_id: streamData.user_id,
                  stream_id: streamData.id,
                  title: streamData.title || 'Untitled Recording',
                  description: `LiveKit recording\nStorj URL: ${storjUrl}\nFile: ${fileResult.filename}`,
                  livepeer_asset_id: livepeerData.assetId,
                  livepeer_playback_id: livepeerData.playbackId,
                  status: 'processing',
                  duration: fileResult.duration ? fileResult.duration / 1000 : null,
                  size: fileResult.size,
                })
                .select()
                .single();

              if (assetError) {
                console.error('Error creating asset:', assetError);
              } else {
                console.log('✅ Asset created with Livepeer processing:', asset);
              }
            }
          } catch (err) {
            console.error('❌ Exception importing to Livepeer:', err);
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
