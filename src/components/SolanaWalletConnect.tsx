import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSOLBalance } from '@/hooks/useSOLBalance';
import { Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const SolanaWalletConnect = () => {
  const { publicKey, connected } = useWallet();
  const { balance, loading, error, refetch } = useSOLBalance(publicKey?.toString());

  // Sync wallet address to profile when connected
  useEffect(() => {
    const syncWalletAddress = async () => {
      if (connected && publicKey) {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { error } = await supabase
            .from('profiles')
            .update({ sol_address: publicKey.toString() })
            .eq('id', user.id);

          if (error) {
            console.error('Error syncing Solana wallet:', error);
          } else {
            console.log('Solana wallet address synced:', publicKey.toString());
          }
        }
      }
    };

    syncWalletAddress();
  }, [connected, publicKey]);

  return (
    <div className="flex flex-col gap-2">
      <WalletMultiButton />
      {connected && publicKey && (
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="text-xs">SOL Balance</Badge>
          {loading ? (
            <div className="flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-xs">Loading...</span>
            </div>
          ) : error ? (
            <span className="text-xs text-destructive">{error}</span>
          ) : balance ? (
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-primary">{balance} SOL</span>
              <button
                onClick={refetch}
                disabled={loading}
                className="p-1 hover:bg-accent rounded-sm transition-colors disabled:opacity-50"
                aria-label="Refresh SOL balance"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
