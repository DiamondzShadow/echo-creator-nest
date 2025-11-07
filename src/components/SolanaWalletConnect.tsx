import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const SolanaWalletConnect = () => {
  const { publicKey, connected } = useWallet();

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

  return <WalletMultiButton />;
};
