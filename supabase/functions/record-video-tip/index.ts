import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// RPC providers for different networks
const RPC_ENDPOINTS: Record<string, string> = {
  ethereum: 'https://eth.llamarpc.com',
  polygon: 'https://polygon.llamarpc.com',
  'polygon pos': 'https://polygon.llamarpc.com', // Handle "Polygon PoS" chain name
  base: 'https://mainnet.base.org',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  optimism: 'https://mainnet.optimism.io',
};

interface VideoTipRequest {
  video_id: string;
  to_user_id: string;
  to_wallet_address: string;
  from_wallet_address: string;
  amount: string;
  network: string;
  transaction_hash: string;
  metadata?: Record<string, unknown>;
}

async function verifyVideoTipTransaction(
  txHash: string,
  network: string,
  expectedFrom: string,
  videoTippingContractAddress: string
): Promise<{ valid: boolean; error?: string; blockNumber?: number; logs?: any[] }> {
  const normalizedNetwork = network.toLowerCase().trim();
  const rpcUrl = RPC_ENDPOINTS[normalizedNetwork];
  if (!rpcUrl) {
    console.error('Unsupported network:', network, 'Normalized:', normalizedNetwork, 'Available:', Object.keys(RPC_ENDPOINTS));
    return { valid: false, error: `Unsupported network: ${network}. Supported networks: ${Object.keys(RPC_ENDPOINTS).join(', ')}` };
  }

  try {
    // Validate transaction hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return { valid: false, error: 'Invalid transaction hash format' };
    }

    // Get transaction details
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionByHash',
        params: [txHash],
      }),
    });

    if (!response.ok) {
      console.error('RPC request failed:', response.status, response.statusText);
      return { valid: false, error: `RPC request failed: ${response.status} ${response.statusText}` };
    }

    const data = await response.json();
    
    if (data.error) {
      console.error('RPC error:', data.error);
      return { valid: false, error: `RPC error: ${data.error.message}` };
    }

    const tx = data.result;
    
    if (!tx) {
      return { valid: false, error: 'Transaction not found on blockchain' };
    }

    // Verify transaction has been mined
    if (!tx.blockNumber) {
      return { valid: false, error: 'Transaction not yet mined' };
    }

    // Verify sender matches expected wallet
    if (tx.from.toLowerCase() !== expectedFrom.toLowerCase()) {
      return { 
        valid: false, 
        error: `Transaction sender mismatch. Expected: ${expectedFrom}, Got: ${tx.from}` 
      };
    }

    // Verify recipient is the VideoTipping contract
    if (tx.to.toLowerCase() !== videoTippingContractAddress.toLowerCase()) {
      return { 
        valid: false, 
        error: `Transaction recipient must be VideoTipping contract. Expected: ${videoTippingContractAddress}, Got: ${tx.to}` 
      };
    }

    // Get receipt to ensure transaction was successful and get logs
    const receiptResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      }),
    });

    if (!receiptResponse.ok) {
      console.error('Receipt request failed:', receiptResponse.status, receiptResponse.statusText);
      return { valid: false, error: `Receipt request failed: ${receiptResponse.status}` };
    }

    const receiptData = await receiptResponse.json();
    const receipt = receiptData.result;

    if (!receipt) {
      return { valid: false, error: 'Transaction receipt not found' };
    }

    // Check if transaction was successful (status = 0x1)
    if (receipt.status !== '0x1') {
      return { valid: false, error: 'Transaction failed on blockchain' };
    }

    return { 
      valid: true, 
      blockNumber: parseInt(receipt.blockNumber, 16),
      logs: receipt.logs
    };
  } catch (error) {
    console.error('Transaction verification error:', error);
    return { 
      valid: false, 
      error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const videoTippingContract = Deno.env.get('VIDEO_TIPPING_CONTRACT_ADDRESS') || '0x61801bC99d1A8CBb80EBE2b4171c1C6dC1B684f8';
    
    // Create client with user's auth token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const tipRequest: VideoTipRequest = await req.json();
    const {
      video_id,
      to_user_id,
      to_wallet_address,
      from_wallet_address,
      amount,
      network,
      transaction_hash,
      metadata,
    } = tipRequest;

    // Validate required fields
    if (!video_id || !to_user_id || !to_wallet_address || !from_wallet_address || !amount || !network || !transaction_hash) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify transaction on blockchain
    console.log('Verifying video tip transaction:', transaction_hash);
    const verification = await verifyVideoTipTransaction(
      transaction_hash,
      network,
      from_wallet_address,
      videoTippingContract
    );

    if (!verification.valid) {
      console.error('Transaction verification failed:', verification.error);
      return new Response(
        JSON.stringify({ 
          error: 'Transaction verification failed', 
          details: verification.error 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Video tip transaction verified successfully');

    // Use service role key to insert the tip (bypasses RLS)
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Check if transaction hash already exists to prevent duplicates
    const { data: existingTip } = await supabaseService
      .from('video_tips')
      .select('id')
      .eq('transaction_hash', transaction_hash)
      .single();

    if (existingTip) {
      return new Response(
        JSON.stringify({ 
          error: 'Transaction already recorded', 
          tip_id: existingTip.id 
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert the verified video tip
    const { data: videoTip, error: insertError } = await supabaseService
      .from('video_tips')
      .insert({
        video_id,
        from_user_id: user.id,
        to_user_id,
        from_wallet_address,
        to_wallet_address,
        amount,
        network: network.toLowerCase(),
        transaction_hash,
        block_number: verification.blockNumber,
        metadata: {
          ...metadata,
          logs: verification.logs,
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting video tip:', insertError);
      
      // If video_tips table doesn't exist, try inserting into regular tips table with video_id in metadata
      console.log('Attempting to insert into tips table with video_id in metadata...');
      const { data: fallbackTip, error: fallbackError } = await supabaseService
        .from('tips')
        .insert({
          from_user_id: user.id,
          to_user_id,
          from_wallet_address,
          to_wallet_address,
          amount,
          token_symbol: 'ETH',
          network: network.toLowerCase(),
          transaction_hash,
          block_number: verification.blockNumber,
          metadata: {
            ...metadata,
            video_id,
            tip_type: 'video_tip',
            logs: verification.logs,
          },
        })
        .select()
        .single();

      if (fallbackError) {
        console.error('Error inserting fallback tip:', fallbackError);
        throw fallbackError;
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          tip: fallbackTip,
          message: 'Video tip verified and recorded successfully (fallback to tips table)' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        tip: videoTip,
        message: 'Video tip verified and recorded successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error recording video tip:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
