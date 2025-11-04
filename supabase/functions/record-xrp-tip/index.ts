import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface XRPTipRequest {
  video_id?: string;
  to_user_id: string;
  to_wallet_address: string;
  from_user_id?: string;
  from_wallet_address: string;
  amount: string;
  network: string;
  transaction_hash: string;
  token_symbol: string;
  metadata?: any;
}

// Verify XRP transaction on XRP Ledger
async function verifyXRPTransaction(
  txHash: string,
  expectedFrom: string,
  expectedTo: string,
  expectedAmount: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Use public XRP Ledger API
    const response = await fetch('https://s1.ripple.com:51234/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'tx',
        params: [{
          transaction: txHash,
          binary: false
        }]
      })
    });

    const data = await response.json();
    
    if (data.result?.status !== 'success') {
      return { valid: false, error: 'Transaction not found or failed' };
    }

    const tx = data.result;
    
    // Verify transaction details
    if (tx.Account?.toLowerCase() !== expectedFrom.toLowerCase()) {
      return { valid: false, error: 'Sender address mismatch' };
    }

    if (tx.Destination?.toLowerCase() !== expectedTo.toLowerCase()) {
      return { valid: false, error: 'Recipient address mismatch' };
    }

    if (tx.Amount !== expectedAmount) {
      return { valid: false, error: 'Amount mismatch' };
    }

    // Check if transaction was successful
    if (tx.meta?.TransactionResult !== 'tesSUCCESS') {
      return { valid: false, error: 'Transaction failed on ledger' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error verifying XRP transaction:', error);
    return { valid: false, error: 'Failed to verify transaction' };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Parse request body
    const tipRequest: XRPTipRequest = await req.json();
    
    console.log('Received XRP tip request:', {
      ...tipRequest,
      from_wallet_address: tipRequest.from_wallet_address?.substring(0, 10) + '...',
      to_wallet_address: tipRequest.to_wallet_address?.substring(0, 10) + '...',
    });

    // Verify the XRP transaction
    const verification = await verifyXRPTransaction(
      tipRequest.transaction_hash,
      tipRequest.from_wallet_address,
      tipRequest.to_wallet_address,
      tipRequest.amount
    );

    if (!verification.valid) {
      console.error('XRP transaction verification failed:', verification.error);
      return new Response(
        JSON.stringify({ error: verification.error || 'Transaction verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('XRP transaction verified successfully');

    // Use service role key to insert tip
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Insert tip record
    const { data: tipData, error: tipError } = await supabaseAdmin
      .from('tips')
      .insert({
        from_user_id: tipRequest.from_user_id,
        to_user_id: tipRequest.to_user_id,
        from_wallet_address: tipRequest.from_wallet_address,
        to_wallet_address: tipRequest.to_wallet_address,
        amount: tipRequest.amount,
        token_symbol: tipRequest.token_symbol,
        network: 'xrp',
        transaction_hash: tipRequest.transaction_hash,
        metadata: tipRequest.metadata || {},
      })
      .select()
      .single();

    if (tipError) {
      // Check if it's a duplicate transaction
      if (tipError.code === '23505') {
        console.log('Duplicate transaction detected');
        return new Response(
          JSON.stringify({ 
            message: 'Tip already recorded',
            tip: tipData 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.error('Error inserting tip:', tipError);
      return new Response(
        JSON.stringify({ error: 'Failed to record tip', details: tipError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update recipient's tip stats
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('tip_count, total_tips_received')
      .eq('id', tipRequest.to_user_id)
      .single();

    if (profile) {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          tip_count: (profile.tip_count || 0) + 1,
          total_tips_received: parseFloat(profile.total_tips_received || '0') + parseFloat(tipRequest.metadata?.amount_display || '0'),
        })
        .eq('id', tipRequest.to_user_id);

      if (updateError) {
        console.error('Error updating profile stats:', updateError);
      }
    }

    console.log('XRP tip recorded successfully:', tipData?.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'XRP tip verified and recorded',
        tip: tipData 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in record-xrp-tip function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
