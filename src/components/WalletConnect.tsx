import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const WalletConnect = () => {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();

  // Sync wallet address to profile when connected
  useEffect(() => {
    const syncWalletAddress = async () => {
      if (isConnected && address) {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { error } = await supabase
            .from('profiles')
            .update({ wallet_address: address })
            .eq('id', user.id);

          if (error) {
            console.error('Error syncing wallet:', error);
          } else {
            console.log('Wallet address synced:', address);
          }
        }
      }
    };

    syncWalletAddress();
  }, [isConnected, address, toast]);

  return <ConnectButton />;
};
