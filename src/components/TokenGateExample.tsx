import { TokenGate } from './TokenGate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Crown } from 'lucide-react';

export const TokenGateExample = () => {
  return (
    <div className="space-y-6">
      {/* Premium Content Example */}
      <TokenGate gateType="PREMIUM_CONTENT">
        <Card className="border-primary/50 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Premium Content
            </CardTitle>
            <CardDescription>
              This content is only visible to token holders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Welcome to premium content! You have access because you hold enough tokens.</p>
          </CardContent>
        </Card>
      </TokenGate>

      {/* VIP Content Example */}
      <TokenGate gateType="VIP_ACCESS">
        <Card className="border-primary bg-gradient-hero">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5" />
              VIP Exclusive
            </CardTitle>
            <CardDescription>
              Ultra-exclusive content for top supporters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Welcome VIP! You're among our most valued supporters.</p>
          </CardContent>
        </Card>
      </TokenGate>
    </div>
  );
};
