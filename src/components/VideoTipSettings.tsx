import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Settings, Loader2, Info, Coins } from 'lucide-react';
import { VIDEO_TIPPING_CONTRACT_ADDRESS, VIDEO_TIPPING_ABI } from '@/lib/web3-config';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VideoTipSettingsProps {
  videoId: string;
  videoType?: 'asset' | 'live_stream' | 'fvm_video';
  creatorId: string;
  currentCustomFee?: number;
  onSettingsUpdated?: () => void;
}

export const VideoTipSettings = ({
  videoId,
  videoType = 'asset',
  creatorId,
  currentCustomFee = 0,
  onSettingsUpdated,
}: VideoTipSettingsProps) => {
  const [open, setOpen] = useState(false);
  const [customFeePercentage, setCustomFeePercentage] = useState(currentCustomFee);
  const [isLoading, setIsLoading] = useState(false);
  
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const { toast } = useToast();

  useEffect(() => {
    setCustomFeePercentage(currentCustomFee);
  }, [currentCustomFee]);

  const calculateTipBreakdown = (amount: number) => {
    const platformFee = amount * 0.03; // 3% platform fee
    const customFee = amount * (customFeePercentage / 100);
    const creatorAmount = amount - platformFee - customFee;
    const totalCreatorAmount = creatorAmount + customFee;
    
    return {
      platformFee: platformFee.toFixed(4),
      customFee: customFee.toFixed(4),
      creatorAmount: creatorAmount.toFixed(4),
      totalCreatorAmount: totalCreatorAmount.toFixed(4),
    };
  };

  const handleSaveSettings = async () => {
    if (!isConnected || !address) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (customFeePercentage < 0 || customFeePercentage > 50) {
      toast({
        title: "Invalid Fee",
        description: "Custom fee must be between 0% and 50%",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      // Convert percentage to basis points (10% = 1000)
      const basisPoints = Math.floor(customFeePercentage * 100);

      // Call smart contract to set video tip settings
      writeContract({
        address: VIDEO_TIPPING_CONTRACT_ADDRESS as `0x${string}`,
        abi: VIDEO_TIPPING_ABI,
        functionName: 'setVideoTipSettings',
        args: [videoId, BigInt(basisPoints)],
      });

      toast({
        title: "Setting Custom Fee",
        description: "Transaction sent, waiting for confirmation...",
      });
    } catch (error) {
      console.error('Error setting custom fee:', error);
      toast({
        title: "Failed to Set Fee",
        description: error instanceof Error ? error.message : "Failed to set custom tip fee",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  // Handle successful transaction
  useEffect(() => {
    const saveToDatabase = async () => {
      if (isSuccess && hash) {
        try {
          // Save settings to database
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error('Not authenticated');
          }

          const { error } = await supabase
            .from('video_tip_settings')
            .upsert({
              video_id: videoId,
              video_type: videoType,
              creator_id: creatorId,
              creator_wallet_address: address,
              custom_fee_percentage: customFeePercentage,
              has_custom_fee: customFeePercentage > 0,
              synced_to_chain: true,
              transaction_hash: hash,
            }, {
              onConflict: 'video_id'
            });

          if (error) throw error;

          toast({
            title: "Settings Saved! ✓",
            description: `Custom tip fee set to ${customFeePercentage}%`,
          });

          setOpen(false);
          if (onSettingsUpdated) {
            onSettingsUpdated();
          }
        } catch (error) {
          console.error('Error saving to database:', error);
          toast({
            title: "Database Error",
            description: "Settings saved on-chain but failed to sync to database",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };

    saveToDatabase();
  }, [isSuccess, hash, videoId, videoType, creatorId, address, customFeePercentage, toast, onSettingsUpdated]);

  const breakdown = calculateTipBreakdown(1); // Example with 1 ETH

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Tip Settings
          {currentCustomFee > 0 && (
            <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
              +{currentCustomFee}%
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Custom Tip Settings
          </DialogTitle>
          <DialogDescription>
            Set a custom tip fee for this video (0-50%). This is added on top of the 3% platform fee.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Custom fees allow you to earn additional revenue from tips on this video.
              The fee is transparently shown to tippers before they send.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <Label htmlFor="custom-fee">
                Custom Fee Percentage: {customFeePercentage}%
              </Label>
              <div className="flex items-center gap-4 mt-2">
                <Slider
                  id="custom-fee"
                  min={0}
                  max={50}
                  step={0.5}
                  value={[customFeePercentage]}
                  onValueChange={(value) => setCustomFeePercentage(value[0])}
                  className="flex-1"
                />
                <Input
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={customFeePercentage}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 0 && val <= 50) {
                      setCustomFeePercentage(val);
                    }
                  }}
                  className="w-20"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {customFeePercentage === 0 ? 'No custom fee (only 3% platform fee)' : 
                 customFeePercentage <= 10 ? 'Modest additional fee' :
                 customFeePercentage <= 25 ? 'Moderate additional fee' :
                 'High additional fee (may discourage tippers)'}
              </p>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <p className="font-semibold mb-2">Example: 1 ETH Tip Breakdown</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform Fee (3%):</span>
                <span className="font-medium">{breakdown.platformFee} ETH</span>
              </div>
              {customFeePercentage > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your Custom Fee ({customFeePercentage}%):</span>
                  <span className="font-medium text-green-600">{breakdown.customFee} ETH</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Creator Amount:</span>
                <span className="font-medium">{breakdown.creatorAmount} ETH</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold text-base">
                <span>You Receive:</span>
                <span className="text-green-600">{breakdown.totalCreatorAmount} ETH</span>
              </div>
            </div>

            {customFeePercentage > 25 && (
              <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Warning: High custom fees (over 25%) may discourage viewers from tipping.
                  Consider setting a lower fee to encourage more tips.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {!isConnected ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">
                Please connect your wallet to set custom tip fees
              </p>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleSaveSettings}
                disabled={isConfirming || isLoading}
                className="flex-1"
              >
                {isConfirming || isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Settings className="w-4 h-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isConfirming || isLoading}
              >
                Cancel
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Settings are stored on-chain and cannot be changed after tipping begins
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
