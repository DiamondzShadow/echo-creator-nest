import { useState, useEffect } from 'react';

interface CryptoPrices {
  ethereum: number;
  'matic-network': number;
  solana: number;
  ripple: number;
}

export const useCryptoPrices = () => {
  const [prices, setPrices] = useState<CryptoPrices | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,matic-network,solana,ripple&vs_currencies=usd'
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch prices');
      }

      const data = await response.json();
      setPrices({
        ethereum: data.ethereum?.usd || 0,
        'matic-network': data['matic-network']?.usd || 0,
        solana: data.solana?.usd || 0,
        ripple: data.ripple?.usd || 0,
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching crypto prices:', err);
      setError('Failed to fetch prices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    // Refresh prices every 60 seconds
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  return { prices, loading, error, refetch: fetchPrices };
};
