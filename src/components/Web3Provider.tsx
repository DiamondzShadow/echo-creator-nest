import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { web3Config } from '@/lib/web3-config';

const queryClient = new QueryClient();

interface Web3ProviderProps {
  children: React.ReactNode;
}

export const Web3Provider = ({ children }: Web3ProviderProps) => {
  // Prefer MetaMask when multiple injected providers (e.g., Phantom + MetaMask) are present
  useEffect(() => {
    try {
      const eth: any = (window as any).ethereum;
      if (eth?.providers?.length) {
        const metamask = eth.providers.find((p: any) => p.isMetaMask);
        if (metamask) {
          (window as any).ethereum = metamask;
          console.log('[Web3] Using MetaMask injected provider');
        }
      }
    } catch (e) {
      console.warn('[Web3] Provider preference check failed', e);
    }
  }, []);

  return (
    <WagmiProvider config={web3Config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: 'hsl(var(--primary))',
            accentColorForeground: 'white',
            borderRadius: 'medium',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
