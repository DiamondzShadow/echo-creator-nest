import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TipPayload {
  streamId: string;
  fromWallet: string;
  amount: number;
  txHash: string;
  tokenSymbol: string;
  network: string;
  userTotal?: number;
  streamTotal?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: TipPayload = await req.json();
    console.log('Processing tip:', JSON.stringify(payload, null, 2));

    // Find the stream by stream_id
    const { data: stream, error: streamError } = await supabase
      .from('live_streams')
      .select('id, user_id')
      .eq('id', payload.streamId)
      .single();

    if (streamError || !stream) {
      console.error('Stream not found:', streamError);
      return new Response(
        JSON.stringify({ error: 'Stream not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find sender profile by wallet
    const { data: fromProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('wallet_address', payload.fromWallet.toLowerCase())
      .single();

    // Insert tip record
    const { error: tipError } = await supabase
      .from('tips')
      .insert({
        from_wallet_address: payload.fromWallet,
        to_wallet_address: stream.user_id, // Will be populated by trigger
        to_user_id: stream.user_id,
        from_user_id: fromProfile?.id,
        amount: payload.amount.toString(),
        token_symbol: payload.tokenSymbol,
        network: payload.network,
        transaction_hash: payload.txHash,
        metadata: {
          stream_id: payload.streamId,
          user_total: payload.userTotal,
          stream_total: payload.streamTotal,
        }
      });

    if (tipError) {
      console.error('Error inserting tip:', tipError);
      throw tipError;
    }

    // Update stream total tips
    const { error: updateError } = await supabase.rpc('increment_stream_tips', {
      p_stream_id: payload.streamId,
      p_amount: payload.amount
    });

    if (updateError) {
      console.error('Error updating stream tips:', updateError);
    }

    console.log('Tip processed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Tip recorded successfully',
        streamId: payload.streamId,
        amount: payload.amount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing tip:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
