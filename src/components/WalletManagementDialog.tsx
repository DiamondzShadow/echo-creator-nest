import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccount, useDisconnect } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { Badge } from '@/components/ui/badge';
import { Wallet, LogOut, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { WalletConnect } from './WalletConnect';
import { SolanaWalletConnect } from './SolanaWalletConnect';

interface WalletManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WalletManagementDialog = ({ open, onOpenChange }: WalletManagementDialogProps) => {
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const { disconnect: disconnectEVM } = useDisconnect();
  const { publicKey: solanaPublicKey, disconnect: disconnectSolana } = useWallet();
  const [copiedEVM, setCopiedEVM] = useState(false);
  const [copiedSolana, setCopiedSolana] = useState(false);
  const { toast } = useToast();

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Management
          </DialogTitle>
          <DialogDescription>
            Manage your connected wallets and blockchain accounts
          </DialogDescription>
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
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Connected</Badge>
                      <span className="text-sm font-mono">{shortenAddress(evmAddress)}</span>
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
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-1">
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
