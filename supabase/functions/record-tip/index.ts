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

interface TipRequest {
  to_user_id: string;
  to_wallet_address: string;
  from_wallet_address: string;
  amount: string;
  token_symbol: string;
  network: string;
  transaction_hash: string;
  metadata?: Record<string, unknown>;
}

async function verifyTransaction(
  txHash: string,
  network: string,
  expectedFrom: string,
  expectedTo: string,
  expectedAmount: string
): Promise<{ valid: boolean; error?: string; blockNumber?: number }> {
  const normalizedNetwork = network.toLowerCase().trim();
  const rpcUrl = RPC_ENDPOINTS[normalizedNetwork];
  if (!rpcUrl) {
    console.error('Unsupported network:', network, 'Normalized:', normalizedNetwork, 'Available:', Object.keys(RPC_ENDPOINTS));
    return { valid: false, error: `Unsupported network: ${network}. Supported networks: ${Object.keys(RPC_ENDPOINTS).join(', ')}` };
  }

  try {
    // Validate transaction hash format (must be 66 characters: 0x + 64 hex chars)
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return { valid: false, error: 'Invalid transaction hash format' };
    }

    // Get transaction details from blockchain
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

    // Verify transaction has been mined (has blockNumber)
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

    // Verify recipient matches expected wallet
    if (tx.to.toLowerCase() !== expectedTo.toLowerCase()) {
      return { 
        valid: false, 
        error: `Transaction recipient mismatch. Expected: ${expectedTo}, Got: ${tx.to}` 
      };
    }

    // Verify amount matches (convert hex to decimal string)
    const actualAmount = BigInt(tx.value).toString();
    if (actualAmount !== expectedAmount) {
      return { 
        valid: false, 
        error: `Transaction amount mismatch. Expected: ${expectedAmount}, Got: ${actualAmount}` 
      };
    }

    // Get receipt to ensure transaction was successful
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
      blockNumber: parseInt(receipt.blockNumber, 16) 
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
    
    // Create client with user's auth token for authentication
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
    const tipRequest: TipRequest = await req.json();
    const {
      to_user_id,
      to_wallet_address,
      from_wallet_address,
      amount,
      token_symbol,
      network,
      transaction_hash,
      metadata,
    } = tipRequest;

    // Validate required fields
    if (!to_user_id || !to_wallet_address || !from_wallet_address || !amount || !token_symbol || !network || !transaction_hash) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify transaction on blockchain
    console.log('Verifying transaction:', transaction_hash);
    const verification = await verifyTransaction(
      transaction_hash,
      network,
      from_wallet_address,
      to_wallet_address,
      amount
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

    console.log('Transaction verified successfully');

    // Use service role key to insert the tip (bypasses RLS)
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Check if transaction hash already exists to prevent duplicates
    const { data: existingTip } = await supabaseService
      .from('tips')
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

    // Insert the verified tip
    const { data: tip, error: insertError } = await supabaseService
      .from('tips')
      .insert({
        from_user_id: user.id,
        to_user_id,
        from_wallet_address,
        to_wallet_address,
        amount,
        token_symbol,
        network: network.toLowerCase(),
        transaction_hash,
        block_number: verification.blockNumber,
        metadata,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting tip:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        tip,
        message: 'Tip verified and recorded successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error recording tip:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
