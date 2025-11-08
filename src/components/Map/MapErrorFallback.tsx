import { AlertTriangle, RefreshCw, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface MapErrorFallbackProps {
  error: Error;
  onRetry: () => void;
  onChangeToken: () => void;
}

export const MapErrorFallback = ({ error, onRetry, onChangeToken }: MapErrorFallbackProps) => {
  const isTokenError = error.message.toLowerCase().includes('token') || 
                      error.message.toLowerCase().includes('unauthorized');
  const isNetworkError = error.message.toLowerCase().includes('network') || 
                        error.message.toLowerCase().includes('fetch');

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <Card className="max-w-lg w-full p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-destructive/10">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Map Loading Failed
            </h3>
            <p className="text-sm text-muted-foreground">
              {isTokenError ? (
                'There\'s an issue with your Mapbox token. Please verify it\'s correct and has the necessary permissions.'
              ) : isNetworkError ? (
                'Unable to connect to map services. Please check your internet connection and try again.'
              ) : (
                'The map visualization could not be loaded. This might be temporary.'
              )}
            </p>
          </div>
        </div>

        <div className="bg-muted p-3 rounded-md">
          <p className="text-xs font-mono text-muted-foreground break-all">
            {error.message}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={onRetry} className="flex-1">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Loading
          </Button>
          {isTokenError && (
            <Button onClick={onChangeToken} variant="outline" className="flex-1">
              <Map className="w-4 h-4 mr-2" />
              Change Token
            </Button>
          )}
        </div>

        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <strong>Troubleshooting tips:</strong>
          </p>
          <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
            <li>Ensure your Mapbox token is a <strong>public token</strong> (starts with "pk.")</li>
            <li>Check that your token hasn't expired or been revoked</li>
            <li>Verify your internet connection is stable</li>
            <li>Try disabling browser extensions that might block map content</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};