import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const tiktokClientSecret = Deno.env.get('TIKTOK_CLIENT_SECRET');

    if (!tiktokClientSecret) {
      throw new Error('TikTok client secret not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get webhook payload
    const payload = await req.json();
    console.log('TikTok webhook received:', payload);

    // Verify webhook signature if provided
    const signature = req.headers.get('x-tiktok-signature');
    if (signature) {
      // TikTok webhook signature verification
      // You would verify the signature here using the client secret
      // This is a placeholder for the actual verification logic
      console.log('Webhook signature:', signature);
    }

    // Handle different webhook events
    const eventType = payload.event;
    
    switch (eventType) {
      case 'video.upload':
        // Handle video upload completion
        console.log('Video uploaded:', payload.data);
        // You can store this information in your database
        break;
      
      case 'video.delete':
        // Handle video deletion
        console.log('Video deleted:', payload.data);
        break;
      
      case 'user.authorization.revoked':
        // Handle when user revokes authorization
        console.log('Authorization revoked for user:', payload.data);
        
        // Remove the connection from database
        if (payload.data?.open_id) {
          await supabase
            .from('platform_connections')
            .delete()
            .eq('platform', 'tiktok')
            .eq('platform_user_id', payload.data.open_id);
        }
        break;
      
      default:
        console.log('Unknown event type:', eventType);
    }

    // Return success response
    return new Response(
      JSON.stringify({ success: true, received: true }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('TikTok webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
