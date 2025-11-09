import { Loader2 } from "lucide-react";

export const MapLoadingOverlay = () => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Loading Map Data</p>
          <p className="text-xs text-muted-foreground mt-1">Fetching global climate inequality data...</p>
        </div>
      </div>
    </div>
  );
};
