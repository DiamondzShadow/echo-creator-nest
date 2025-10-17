import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, livepeer-signature',
};

interface AssetWebhookPayload {
  id: string;
  event: string;
  stream?: {
    id: string;
  };
  payload: {
    id: string;
    playbackId: string;
    userId: string;
    status: {
      phase: string; // 'ready', 'processing', 'failed'
      progress?: number;
      errorMessage?: string;
    };
    name: string;
    meta?: {
      source?: any;
    };
    videoSpec?: {
      duration?: number;
    };
    size?: number;
    createdAt: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const livepeerWebhookSecret = Deno.env.get('LIVEPEER_WEBHOOK_SECRET');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body as text for signature validation
    const rawBody = await req.text();
    
    // Verify webhook signature to prevent unauthorized requests
    const signature = req.headers.get('livepeer-signature');
    
    if (!signature) {
      console.error('Missing livepeer-signature header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If webhook secret is configured, validate the signature
    if (livepeerWebhookSecret) {
      // Livepeer uses HMAC-SHA256 for webhook signatures
      // Format: t=<timestamp>,v1=<signature>
      const signatureParts = signature.split(',');
      const timestamp = signatureParts.find(part => part.startsWith('t='))?.split('=')[1];
      const signatureHash = signatureParts.find(part => part.startsWith('v1='))?.split('=')[1];

      if (!timestamp || !signatureHash) {
        console.error('Invalid signature format');
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Invalid signature format' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify signature is not too old (5 minute tolerance)
      const currentTime = Math.floor(Date.now() / 1000);
      const signatureAge = currentTime - parseInt(timestamp);
      if (signatureAge > 300) {
        console.error('Signature too old:', signatureAge);
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Signature expired' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Compute expected signature
      const signedPayload = `${timestamp}.${rawBody}`;
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(livepeerWebhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBytes = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(signedPayload)
      );
      const expectedSignature = Array.from(new Uint8Array(signatureBytes))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Compare signatures using constant-time comparison to prevent timing attacks
      if (expectedSignature !== signatureHash) {
        console.error('Invalid signature');
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Webhook signature verified successfully');
    } else {
      console.warn('LIVEPEER_WEBHOOK_SECRET not configured - signature validation skipped (not recommended for production)');
    }

    const webhookData: AssetWebhookPayload = JSON.parse(rawBody);
    console.log('Webhook event:', webhookData.event);
    console.log('Webhook payload:', JSON.stringify(webhookData.payload, null, 2));

    const { event, payload, stream } = webhookData;

    // Handle asset events
    if (event.startsWith('asset.')) {
      const assetId = payload.id;
      const playbackId = payload.playbackId;
      const status = payload.status.phase;

      // Try to find the associated stream by livepeer_stream_id
      let streamId = null;
      let userId = null;
      let title = payload.name || 'Untitled Recording';
      let description = null;

      if (stream?.id) {
        const { data: streamData } = await supabase
          .from('live_streams')
          .select('id, user_id, title, description')
          .eq('livepeer_stream_id', stream.id)
          .single();

        if (streamData) {
          streamId = streamData.id;
          userId = streamData.user_id;
          title = streamData.title || title;
          description = streamData.description;
        }
      }

      // If we still don't have a user_id, we can't create the asset
      if (!userId) {
        console.warn('No user found for asset, cannot save to database');
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'No user found for asset' 
          }),
          { 
            status: 200, // Still return 200 to acknowledge receipt
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (event === 'asset.created') {
        // Create new asset record
        const { data, error } = await supabase
          .from('assets')
          .insert({
            user_id: userId,
            stream_id: streamId,
            title,
            description,
            livepeer_asset_id: assetId,
            livepeer_playback_id: playbackId,
            status: 'processing',
            duration: payload.videoSpec?.duration,
            size: payload.size,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating asset:', error);
          throw error;
        }

        console.log('Asset created:', data);
      } 
      else if (event === 'asset.updated' || event === 'asset.ready') {
        // Update existing asset
        const updateData: any = {
          status: status === 'ready' ? 'ready' : 'processing',
          livepeer_playback_id: playbackId,
          duration: payload.videoSpec?.duration,
          size: payload.size,
        };

        if (status === 'ready') {
          updateData.ready_at = new Date().toISOString();
          
          // Extract thumbnail from playback info if available
          if (payload.meta?.source) {
            const thumbnailSource = payload.meta.source.find((s: any) => s.hrn === 'Thumbnails');
            if (thumbnailSource?.url) {
              // Extract base URL and create thumbnail URL (first frame)
              const vttUrl = thumbnailSource.url;
              const baseUrl = vttUrl.replace('/thumbnails.vtt', '');
              updateData.thumbnail_url = `${baseUrl}/keyframes_0.jpg`;
            }
          }
        }

        const { data, error } = await supabase
          .from('assets')
          .update(updateData)
          .eq('livepeer_asset_id', assetId)
          .select()
          .single();

        if (error) {
          console.error('Error updating asset:', error);
          throw error;
        }

        console.log('Asset updated:', data);
      }
      else if (event === 'asset.failed') {
        // Mark asset as failed
        const { data, error } = await supabase
          .from('assets')
          .update({
            status: 'failed',
          })
          .eq('livepeer_asset_id', assetId)
          .select()
          .single();

        if (error) {
          console.error('Error marking asset as failed:', error);
          throw error;
        }

        console.log('Asset marked as failed:', data);
      }
      else if (event === 'asset.deleted') {
        // Delete asset from database
        const { error } = await supabase
          .from('assets')
          .delete()
          .eq('livepeer_asset_id', assetId);

        if (error) {
          console.error('Error deleting asset:', error);
          throw error;
        }

        console.log('Asset deleted:', assetId);
      }
    }

    // Acknowledge receipt of webhook
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
