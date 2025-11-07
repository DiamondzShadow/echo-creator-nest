import { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

export const useSOLBalance = (solAddress: string | null | undefined) => {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!solAddress) {
      setBalance(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Connect to Solana mainnet
      const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      
      // Validate and create public key
      const publicKey = new PublicKey(solAddress);
      
      // Get balance
      const balanceInLamports = await connection.getBalance(publicKey);
      const balanceInSOL = (balanceInLamports / LAMPORTS_PER_SOL).toFixed(4);
      
      setBalance(balanceInSOL);
    } catch (err: any) {
      console.error('Error fetching SOL balance:', err);
      
      if (err.message?.includes('Invalid public key')) {
        setError('Invalid address');
      } else {
        setError('Failed to fetch balance');
      }
    } finally {
      setLoading(false);
    }
  }, [solAddress]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, loading, error, refetch: fetchBalance };
};
