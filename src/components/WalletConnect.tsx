import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ConnectButton as ThirdwebConnectButton } from "thirdweb/react";
import { createWallet } from "thirdweb/wallets";
import { useAccount } from 'wagmi';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEVMBalance } from '@/hooks/useEVMBalance';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createThirdwebClient, defineChain } from "thirdweb";

const thirdwebClient = createThirdwebClient({
  clientId: "b1c4d85a2601e8268c98039ccb1de1db",
});

// Define supported chains for Thirdweb
const supportedChains = [
  defineChain(1), // Ethereum Mainnet
  defineChain(137), // Polygon
  defineChain(8453), // Base
  defineChain(42161), // Arbitrum One
  defineChain(10), // Optimism
  defineChain(3141), // Filecoin Hyperspace
];

const wallets = [
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("com.trustwallet.app"),
  createWallet("inApp", {
    auth: {
      options: ["google", "apple", "facebook", "email", "phone"],
    },
  }),
];

export const WalletConnect = () => {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const { balance, symbol, chainName, loading, error, refetch } = useEVMBalance();

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

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Connect with Web3 Wallet</h3>
        <ConnectButton />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Or Create Social Wallet</h3>
        <ThirdwebConnectButton
          client={thirdwebClient}
          wallets={wallets}
          chains={supportedChains}
          theme="dark"
          connectButton={{
            label: "Sign in with Social",
          }}
          connectModal={{
            size: "compact",
            title: "Connect Your Wallet",
            showThirdwebBranding: false,
          }}
        />
      </div>
      
      {isConnected && (
        <div className="flex items-center gap-2">
          {loading ? (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading balance...
            </Badge>
          ) : error ? (
            <Badge variant="destructive" className="flex items-center gap-1">
              {error}
            </Badge>
          ) : balance ? (
            <>
              <Badge variant="secondary" className="flex items-center gap-1">
                {balance} {symbol} ({chainName})
              </Badge>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => refetch()}
                className="h-6 w-6"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};
