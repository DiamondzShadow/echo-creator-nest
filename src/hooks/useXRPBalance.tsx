import { useState, useEffect } from 'react';
import { Client } from 'xrpl';

export const useXRPBalance = (xrpAddress: string | null | undefined) => {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!xrpAddress) {
      setBalance(null);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchBalance = async () => {
      setLoading(true);
      setError(null);
      
      let client: Client | null = null;
      
      try {
        // Connect to public XRP Ledger Mainnet
        client = new Client('wss://xrplcluster.com');
        await client.connect();

        // Get account info
        const response = await client.request({
          command: 'account_info',
          account: xrpAddress,
          ledger_index: 'validated',
        });

        // Convert drops to XRP (1 XRP = 1,000,000 drops)
        const balanceInDrops = response.result.account_data.Balance;
        const balanceInXRP = (parseInt(balanceInDrops) / 1_000_000).toFixed(2);
        
        setBalance(balanceInXRP);
      } catch (err: any) {
        console.error('Error fetching XRP balance:', err);
        
        if (err?.data?.error === 'actNotFound') {
          setError('Account not activated');
        } else {
          setError('Failed to fetch balance');
        }
      } finally {
        if (client?.isConnected()) {
          await client.disconnect();
        }
        setLoading(false);
      }
    };

    fetchBalance();
  }, [xrpAddress]);

  return { balance, loading, error };
};
