import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coins } from 'lucide-react';
import { TipButton } from './TipButton';
import { XRPTipButton } from './XRPTipButton';
import { SOLTipButton } from './SOLTipButton';

interface MultiChainTipButtonProps {
  recipientUserId: string;
  recipientWalletAddress?: string | null;
  recipientXRPAddress?: string | null;
  recipientSOLAddress?: string | null;
  recipientUsername: string;
  videoId?: string;
}

export const MultiChainTipButton = ({ 
  recipientUserId, 
  recipientWalletAddress,
  recipientXRPAddress,
  recipientSOLAddress,
  recipientUsername,
  videoId 
}: MultiChainTipButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2">
          <Coins className="w-4 h-4" />
          Tip Creator
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tip {recipientUsername}</DialogTitle>
          <DialogDescription>
            Choose your preferred payment method
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="eth" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="eth">ETH/EVM</TabsTrigger>
            <TabsTrigger value="xrp">XRP</TabsTrigger>
            <TabsTrigger value="sol">SOL</TabsTrigger>
          </TabsList>
          
          <TabsContent value="eth" className="mt-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Send tips using ETH, USDC, DAI on Ethereum, Polygon, Base, Arbitrum, or Optimism
              </p>
              {/* Embed the existing TipButton component */}
              <TipButton
                recipientUserId={recipientUserId}
                recipientWalletAddress={recipientWalletAddress}
                recipientUsername={recipientUsername}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="xrp" className="mt-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Send tips using the XRP Ledger
              </p>
              <XRPTipButton
                recipientUserId={recipientUserId}
                recipientXRPAddress={recipientXRPAddress}
                recipientUsername={recipientUsername}
                videoId={videoId}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="sol" className="mt-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Send tips using Solana
              </p>
              <SOLTipButton
                recipientUserId={recipientUserId}
                recipientSOLAddress={recipientSOLAddress}
                recipientUsername={recipientUsername}
                videoId={videoId}
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
