import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Layers } from 'lucide-react';
import { getTraits, TraitsResponse } from '@/lib/opensea';

interface NFTTraitsDisplayProps {
  collectionSlug: string;
}

export function NFTTraitsDisplay({ collectionSlug }: NFTTraitsDisplayProps) {
  const [traits, setTraits] = useState<TraitsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTraits();
  }, [collectionSlug]);

  const loadTraits = async () => {
    setLoading(true);
    try {
      const data = await getTraits(collectionSlug);
      setTraits(data);
    } catch (error) {
      console.error('Error loading traits:', error);
    } finally {
      setLoading(false);
    }
  };

  const isNumericTrait = (counts: any): counts is { min: number; max: number } => {
    return 'min' in counts && 'max' in counts;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!traits) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No trait data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Collection Traits
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(traits.categories).map(([category, type]) => (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold capitalize">{category}</h3>
                <Badge variant="secondary" className="text-xs">
                  {type}
                </Badge>
              </div>
              
              <div className="pl-4">
                {isNumericTrait(traits.counts[category]) ? (
                  <div className="text-sm text-muted-foreground">
                    Range: {(traits.counts[category] as { min: number; max: number }).min} - {(traits.counts[category] as { min: number; max: number }).max}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(traits.counts[category] as Record<string, number>)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 10)
                      .map(([value, count]) => (
                        <Badge 
                          key={value} 
                          variant="outline"
                          className="text-xs"
                        >
                          {value} ({count})
                        </Badge>
                      ))}
                    {Object.keys(traits.counts[category] as Record<string, number>).length > 10 && (
                      <Badge variant="secondary" className="text-xs">
                        +{Object.keys(traits.counts[category] as Record<string, number>).length - 10} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
