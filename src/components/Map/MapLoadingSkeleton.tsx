import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

export const MapLoadingSkeleton = () => {
  return (
    <div className="absolute inset-0 bg-background flex items-center justify-center">
      <Card className="p-8 max-w-md space-y-4">
        <div className="flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            Loading Climate Inequality Map
          </h3>
          <p className="text-sm text-muted-foreground">
            Initializing Mapbox and loading region data...
          </p>
        </div>
        <div className="space-y-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary/50 animate-pulse w-3/4" />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Loading ASDI datasets</span>
            <span>12 countries</span>
          </div>
        </div>
      </Card>
    </div>
  );
};