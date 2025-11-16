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
 * Verify LiveKit webhook Authorization header (JWT HS256 signed with API secret)
 */
async function verifyLiveKitAuthorization(authHeader: string, secret: string): Promise<{ valid: boolean; payload?: any; error?: string }> {
  try {
    const bearerPrefix = 'Bearer ';
    const token = authHeader.startsWith(bearerPrefix) ? authHeader.slice(bearerPrefix.length) : authHeader;

    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      return { valid: false, error: 'Malformed JWT' };
    }

    // Base64url decode helpers
    const b64urlToUint8 = (b64url: string) => {
      const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64url.length / 4) * 4, '=');
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    };
    const uint8ToB64url = (bytes: Uint8Array) => {
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);
      return b64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    };

    const headerJson = new TextDecoder().decode(b64urlToUint8(encodedHeader));
    const payloadJson = new TextDecoder().decode(b64urlToUint8(encodedPayload));
    const header = JSON.parse(headerJson);
    const payload = JSON.parse(payloadJson);

    if (header.alg !== 'HS256') {
      return { valid: false, error: 'Unsupported alg' };
    }

    // verify exp if present
    if (typeof payload.exp === 'number' && Date.now() / 1000 > payload.exp) {
      return { valid: false, error: 'Token expired' };
    }

    // Compute expected signature over "header.payload"
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
    const expectedSig = uint8ToB64url(new Uint8Array(sigBuf));

    if (!timingSafeEqual(expectedSig, encodedSignature)) {
      return { valid: false, error: 'Signature mismatch' };
    }

    return { valid: true, payload };
  } catch (e) {
    console.error('JWT verification error', e);
    return { valid: false, error: 'Verification exception' };
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

    // Read body as text (needed later for event parsing)
    const body = await req.text();
    
    // Verify Authorization JWT signed with API secret
    const { valid, error: verifyError } = await verifyLiveKitAuthorization(authHeader, apiSecret);
    if (!valid) {
      console.error('Invalid webhook authorization:', verifyError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Webhook authorization verified');

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
      
      // Update stream status - reset viewer count when room ends
      if (room?.name) {
        const { error } = await supabase
          .from('live_streams')
          .update({
            is_live: false,
            ended_at: new Date().toISOString(),
            viewer_count: 0,
          })
          .eq('livepeer_playback_id', room.name);

        if (error) {
          console.error('Error updating stream status:', error);
        } else {
          console.log(`✅ Stream ended and viewer count reset: ${room.name}`);
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
      
      if (fileResult && (fileResult.download || fileResult.filename)) {
        const storjEndpoint = Deno.env.get('STORJ_ENDPOINT') || 'https://gateway.storjshare.io';
        const storjBucket = Deno.env.get('STORJ_BUCKET') || 'livepeer-videos';
        const sourceUrl = fileResult.download || `${storjEndpoint}/${storjBucket}/${fileResult.filename}`;

        console.log(`Recording source: ${sourceUrl}`);
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
            .maybeSingle();

          if (streamError || !streamData) {
            console.error('Stream not found:', roomName);
            return new Response(
              JSON.stringify({ success: true, message: 'Stream not found' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Only save to storage if enabled
          if (streamData.save_to_storj) {
            console.log('📥 Downloading recording from LiveKit...');
            
            try {
              // Download the file from LiveKit
              const fileResponse = await fetch(sourceUrl);
              if (!fileResponse.ok) {
                throw new Error(`Failed to download: ${fileResponse.statusText}`);
              }
              
              const fileBlob = await fileResponse.blob();
              const fileName = `${streamData.user_id}/stream-${roomName}-${Date.now()}.mp4`;
              
              console.log('📤 Uploading to Supabase Storage...');
              
              // Upload to Supabase Storage
              const { data: uploadData, error: uploadError } = await supabase
                .storage
                .from('recordings')
                .upload(fileName, fileBlob, {
                  contentType: 'video/mp4',
                  upsert: false
                });

              if (uploadError) {
                console.error('Error uploading to storage:', uploadError);
                throw uploadError;
              }

              // Get public URL
              const { data: { publicUrl } } = supabase
                .storage
                .from('recordings')
                .getPublicUrl(fileName);

              console.log('✅ Recording saved to:', publicUrl);
              
              // Create asset record
              const { data: asset, error: assetError } = await supabase
                .from('assets')
                .insert({
                  user_id: streamData.user_id,
                  stream_id: streamData.id,
                  title: streamData.title || 'Untitled Recording',
                  description: `LiveKit recording saved to Supabase Storage`,
                  livepeer_asset_id: egressInfo.egressId,
                  livepeer_playback_id: publicUrl,
                  status: 'ready',
                  duration: fileResult.duration ? fileResult.duration / 1000 : null,
                  size: fileResult.size,
                  storage_provider: 'supabase',
                  ready_at: new Date().toISOString(),
                })
                .select()
                .single();

              if (assetError) {
                console.error('Error creating asset:', assetError);
              } else {
                console.log('Asset created successfully:', asset.id);
              }
              
              // Update stream ended timestamp
              await supabase
                .from('live_streams')
                .update({ 
                  ended_at: new Date().toISOString(),
                  is_live: false
                })
                .eq('id', streamData.id);

            } catch (error) {
              console.error('Error saving recording:', error);
            }
          } else {
            console.log('Recording save not enabled for this stream');
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
        console.log(`📊 Participant ${event}: room=${room.name}, total=${room.numParticipants}`);
        
        // Subtract 1 for the broadcaster (they're always counted)
        const viewerCount = Math.max(0, room.numParticipants - 1);
        console.log(`👥 Updating viewer count to: ${viewerCount}`);
        
        const { error } = await supabase
          .from('live_streams')
          .update({
            viewer_count: viewerCount,
          })
          .eq('livepeer_playback_id', room.name);

        if (error) {
          console.error('❌ Error updating viewer count:', error);
        } else {
          console.log(`✅ Viewer count updated successfully`);
        }
      } else {
        console.warn('⚠️ Missing room data for participant event:', { event, room });
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
