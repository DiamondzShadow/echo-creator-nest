import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, parseUnits, formatUnits } from 'viem';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Coins, Loader2 } from 'lucide-react';
import { TIPJAR_CONTRACT_ADDRESS, TIPJAR_ABI, ERC20_TOKENS, ERC20_ABI } from '@/lib/web3-config';

interface TipButtonProps {
  recipientUserId: string;
  recipientWalletAddress?: string | null;
  recipientUsername: string;
}

type TokenType = 'ETH' | 'MATIC' | 'USDC' | 'DAI';

export const TipButton = ({ recipientUserId, recipientWalletAddress, recipientUsername }: TipButtonProps) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState<TokenType>('ETH');
  const [isRecording, setIsRecording] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const { address, isConnected, chain } = useAccount();
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const { toast } = useToast();

  // Check if token is ERC20
  const isERC20 = token === 'USDC' || token === 'DAI';

  // Get token contract address
  const getTokenAddress = () => {
    if (!chain || !isERC20) return undefined;
    const chainName = chain.name.toLowerCase() as keyof typeof ERC20_TOKENS;
    return ERC20_TOKENS[chainName]?.[token];
  };

  const tokenAddress = getTokenAddress();

  // Check allowance for ERC20 tokens
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && tokenAddress ? [address as `0x${string}`, TIPJAR_CONTRACT_ADDRESS as `0x${string}`] : undefined,
    query: {
      enabled: isERC20 && !!address && !!tokenAddress,
    },
  });

  // Get token decimals
  const { data: decimals } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: {
      enabled: isERC20 && !!tokenAddress,
    },
  });

  // Check if approval is needed
  useEffect(() => {
    if (isERC20 && allowance !== undefined && amount && decimals) {
      const amountWei = parseUnits(amount, decimals as number);
      setNeedsApproval(allowance < amountWei);
    } else {
      setNeedsApproval(false);
    }
  }, [isERC20, allowance, amount, decimals]);
  
  // Calculate fee split (3% platform, 97% creator)
  const calculateSplit = (tipAmount: string) => {
    if (!tipAmount || parseFloat(tipAmount) <= 0) return { platformFee: '0', creatorAmount: '0' };
    const total = parseFloat(tipAmount);
    const platformFee = (total * 0.03).toFixed(6);
    const creatorAmount = (total * 0.97).toFixed(6);
    return { platformFee, creatorAmount };
  };

  // Record tip after transaction is confirmed
  useEffect(() => {
    const recordTip = async () => {
      if (isSuccess && hash && !isRecording) {
        setIsRecording(true);
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            toast({
              title: "Authentication Error",
              description: "Please sign in to record your tip",
              variant: "destructive",
            });
            return;
          }

          // Calculate amount in wei/smallest unit
          let amountInWei: string;
          if (isERC20 && decimals) {
            amountInWei = parseUnits(amount, decimals as number).toString();
          } else {
            amountInWei = parseEther(amount).toString();
          }

          // Call edge function to verify and record tip
          const { data, error } = await supabase.functions.invoke('record-tip', {
            body: {
              to_user_id: recipientUserId,
              to_wallet_address: recipientWalletAddress,
              from_wallet_address: address,
              amount: amountInWei,
              token_symbol: token,
              network: chain?.name?.toLowerCase() || 'ethereum',
              transaction_hash: hash,
              token_address: isERC20 ? tokenAddress : undefined,
              metadata: {
                amount_display: amount,
              },
            },
          });

          if (error) {
            console.error('Error recording tip:', error);
            toast({
              title: "Recording Failed",
              description: error.message || "Failed to verify and record tip",
              variant: "destructive",
            });
          } else {
            const { platformFee, creatorAmount } = calculateSplit(amount);
            toast({
              title: "Tip Sent! 🎉",
              description: `${recipientUsername} received ${creatorAmount} ${token} (3% platform fee: ${platformFee} ${token})`,
            });
            setOpen(false);
            setAmount('');
            setIsApproving(false);
            refetchAllowance();
          }
        } catch (error) {
          console.error('Error recording tip:', error);
          toast({
            title: "Recording Failed",
            description: error instanceof Error ? error.message : "Failed to verify and record tip",
            variant: "destructive",
          });
        } finally {
          setIsRecording(false);
        }
      }
    };

    recordTip();
  }, [isSuccess, hash, amount, token, chain, address, recipientUserId, recipientWalletAddress, recipientUsername, toast, isRecording, isERC20, decimals, tokenAddress, refetchAllowance]);

  const handleApprove = async () => {
    if (!tokenAddress || !decimals) return;

    setIsApproving(true);
    try {
      const amountWei = parseUnits(amount, decimals as number);
      
      writeContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [TIPJAR_CONTRACT_ADDRESS as `0x${string}`, amountWei],
        account: address as `0x${string}`,
        chain,
      });

      toast({
        title: "Approval Sent",
        description: "Waiting for approval confirmation...",
      });
    } catch (error) {
      console.error('Approval error:', error);
      toast({
        title: "Approval Failed",
        description: error instanceof Error ? error.message : "Failed to approve token",
        variant: "destructive",
      });
      setIsApproving(false);
    }
  };

  const handleTip = async () => {
    if (!isConnected || !address) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!recipientWalletAddress) {
      toast({
        title: "No Wallet Connected",
        description: `${recipientUsername} hasn't connected their wallet yet`,
        variant: "destructive",
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid tip amount",
        variant: "destructive",
      });
      return;
    }

    // Check if token is available on current chain
    if (isERC20 && !tokenAddress) {
      toast({
        title: "Token Not Available",
        description: `${token} is not available on ${chain?.name}`,
        variant: "destructive",
      });
      return;
    }

    try {
      if (isERC20 && tokenAddress && decimals) {
        // ERC20 tip
        const amountWei = parseUnits(amount, decimals as number);
        
        writeContract({
          address: TIPJAR_CONTRACT_ADDRESS as `0x${string}`,
          abi: TIPJAR_ABI,
          functionName: 'tipWithToken',
          args: [
            recipientWalletAddress as `0x${string}`,
            tokenAddress as `0x${string}`,
            amountWei,
          ],
          account: address as `0x${string}`,
          chain,
        });
      } else {
        // Native currency tip
        writeContract({
          address: TIPJAR_CONTRACT_ADDRESS as `0x${string}`,
          abi: TIPJAR_ABI,
          functionName: 'tipWithNative',
          args: [recipientWalletAddress as `0x${string}`],
          value: parseEther(amount),
          account: address as `0x${string}`,
          chain,
        });
      }

      toast({
        title: "Transaction Sent",
        description: "Waiting for confirmation...",
      });
    } catch (error) {
      console.error('Tip error:', error);
      toast({
        title: "Transaction Failed",
        description: error instanceof Error ? error.message : "Failed to send tip",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Coins className="w-4 h-4 mr-2" />
          Tip Creator
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tip {recipientUsername}</DialogTitle>
          <DialogDescription>
            Send crypto to support this creator (3% platform fee)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {!recipientWalletAddress ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">
                {recipientUsername} hasn't connected their wallet yet
              </p>
            </div>
          ) : !isConnected ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">
                Connect your wallet to send tips
              </p>
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.001"
                  placeholder="0.1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="token">Token</Label>
                <Select value={token} onValueChange={(value) => setToken(value as TokenType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ETH">ETH (Ethereum)</SelectItem>
                    <SelectItem value="MATIC">MATIC (Polygon)</SelectItem>
                    <SelectItem value="USDC">USDC (Stablecoin)</SelectItem>
                    <SelectItem value="DAI">DAI (Stablecoin)</SelectItem>
                  </SelectContent>
                </Select>
                {isERC20 && !tokenAddress && (
                  <p className="text-xs text-destructive mt-1">
                    {token} not available on {chain?.name}
                  </p>
                )}
              </div>

              {amount && parseFloat(amount) > 0 && (
                <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Creator receives:</span>
                    <span className="font-medium">{calculateSplit(amount).creatorAmount} {token}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform fee (3%):</span>
                    <span className="font-medium">{calculateSplit(amount).platformFee} {token}</span>
                  </div>
                  <div className="border-t pt-1 flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{amount} {token}</span>
                  </div>
                </div>
              )}

              {isERC20 && needsApproval && (
                <Button 
                  onClick={handleApprove} 
                  disabled={isApproving || isConfirming}
                  className="w-full"
                  variant="outline"
                >
                  {isApproving || isConfirming ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    `Approve ${token}`
                  )}
                </Button>
              )}

              <Button 
                onClick={handleTip} 
                disabled={isConfirming || isRecording || (isERC20 && needsApproval)}
                className="w-full"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : isRecording ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Recording...
                  </>
                ) : (
                  `Send ${amount || '0'} ${token}`
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Network: {chain?.name || 'Not connected'}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
