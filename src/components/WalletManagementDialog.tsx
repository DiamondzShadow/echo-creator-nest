import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccount, useDisconnect, useChainId } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { Badge } from '@/components/ui/badge';
import { Wallet, LogOut, Copy, Check, RefreshCw, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { WalletConnect } from './WalletConnect';
import { SolanaWalletConnect } from './SolanaWalletConnect';
import { useEVMBalance } from '@/hooks/useEVMBalance';
import { useSOLBalance } from '@/hooks/useSOLBalance';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { Separator } from '@/components/ui/separator';
import { mainnet, polygon } from 'wagmi/chains';

interface WalletManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WalletManagementDialog = ({ open, onOpenChange }: WalletManagementDialogProps) => {
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect: disconnectEVM } = useDisconnect();
  const { publicKey: solanaPublicKey, disconnect: disconnectSolana } = useWallet();
  const [copiedEVM, setCopiedEVM] = useState(false);
  const [copiedSolana, setCopiedSolana] = useState(false);
  const { toast } = useToast();
  
  const { balance: evmBalance, symbol: evmSymbol, chainName, loading: evmLoading, refetch: refetchEVM } = useEVMBalance();
  const { balance: solBalance, loading: solLoading, refetch: refetchSOL } = useSOLBalance(solanaPublicKey?.toBase58());
  const { prices, loading: pricesLoading, refetch: refetchPrices } = useCryptoPrices();

  const copyToClipboard = async (text: string, type: 'evm' | 'solana') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'evm') {
        setCopiedEVM(true);
        setTimeout(() => setCopiedEVM(false), 2000);
      } else {
        setCopiedSolana(true);
        setTimeout(() => setCopiedSolana(false), 2000);
      }
      toast({
        title: 'Address copied',
        description: 'Wallet address copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy address to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnectEVM = () => {
    disconnectEVM();
    toast({
      title: 'Wallet disconnected',
      description: 'EVM wallet has been disconnected',
    });
  };

  const handleDisconnectSolana = () => {
    disconnectSolana();
    toast({
      title: 'Wallet disconnected',
      description: 'Solana wallet has been disconnected',
    });
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const calculateUSDValue = (balance: string | null, tokenId: 'ethereum' | 'matic-network' | 'solana' | 'ripple') => {
    if (!balance || !prices) return null;
    const price = prices[tokenId];
    const usdValue = parseFloat(balance) * price;
    return usdValue.toFixed(2);
  };

  const getTokenIdForChain = (): 'ethereum' | 'matic-network' => {
    if (chainId === polygon.id) return 'matic-network';
    return 'ethereum';
  };

  const handleRefreshAll = () => {
    refetchEVM();
    refetchSOL();
    refetchPrices();
    toast({
      title: 'Refreshing balances',
      description: 'Updating all wallet balances and prices',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Wallet Management
              </DialogTitle>
              <DialogDescription>
                Manage your connected wallets and blockchain accounts
              </DialogDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshAll}
              disabled={pricesLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${pricesLoading ? 'animate-spin' : ''}`} />
              Refresh All
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* EVM Wallet Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">EVM Wallets (Ethereum, Polygon, Base, etc.)</CardTitle>
              <CardDescription>
                Connect MetaMask or other Web3 wallets for EVM-compatible chains
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {evmConnected && evmAddress ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Connected</Badge>
                        <span className="text-sm font-mono">{shortenAddress(evmAddress)}</span>
                        <Badge variant="outline" className="text-xs">{chainName}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Full address: {evmAddress}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(evmAddress, 'evm')}
                      >
                        {copiedEVM ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleDisconnectEVM}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Disconnect
                      </Button>
                    </div>
                  </div>

                  {/* Balance Display */}
                  <div className="p-4 border rounded-lg bg-background">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Balance</span>
                      {evmLoading && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
                    </div>
                    {evmBalance ? (
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">{evmBalance}</span>
                          <span className="text-sm text-muted-foreground">{evmSymbol}</span>
                        </div>
                        {!pricesLoading && prices && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            <span>≈ ${calculateUSDValue(evmBalance, getTokenIdForChain())} USD</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No balance data</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">No EVM wallet connected</p>
                  <WalletConnect />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Solana Wallet Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Solana Wallet</CardTitle>
              <CardDescription>
                Connect Phantom or other Solana wallets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {solanaPublicKey ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Connected</Badge>
                        <span className="text-sm font-mono">
                          {shortenAddress(solanaPublicKey.toBase58())}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Full address: {solanaPublicKey.toBase58()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(solanaPublicKey.toBase58(), 'solana')}
                      >
                        {copiedSolana ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleDisconnectSolana}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Disconnect
                      </Button>
                    </div>
                  </div>

                  {/* Balance Display */}
                  <div className="p-4 border rounded-lg bg-background">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Balance</span>
                      {solLoading && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
                    </div>
                    {solBalance ? (
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">{solBalance}</span>
                          <span className="text-sm text-muted-foreground">SOL</span>
                        </div>
                        {!pricesLoading && prices && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            <span>≈ ${calculateUSDValue(solBalance, 'solana')} USD</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No balance data</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">No Solana wallet connected</p>
                  <SolanaWalletConnect />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
