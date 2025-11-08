import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  title?: string;
}

export const ErrorFallback = ({ error, resetErrorBoundary, title = 'Something went wrong' }: ErrorFallbackProps) => {
  const isMapError = error.message.includes('Style') || error.message.includes('mapbox') || error.message.includes('token');
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 space-y-6">
        <div className="flex items-center gap-3 text-destructive">
          <AlertCircle className="w-8 h-8" />
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>

        <div className="space-y-3">
          <p className="text-muted-foreground">
            {isMapError ? (
              <>
                <strong className="text-foreground">Map Loading Error:</strong>
                <br />
                {error.message.includes('token') ? (
                  'Invalid or missing Mapbox token. Please check your token and try again.'
                ) : (
                  'The map failed to load properly. This could be due to network issues or an invalid configuration.'
                )}
              </>
            ) : (
              <>
                An unexpected error occurred while loading the application. 
                Please try refreshing the page or contact support if the problem persists.
              </>
            )}
          </p>

          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground mb-2">
              Technical Details
            </summary>
            <pre className="bg-muted p-3 rounded-md overflow-auto max-h-32 text-xs">
              {error.message}
            </pre>
          </details>
        </div>

        <div className="flex gap-3">
          <Button onClick={resetErrorBoundary} className="flex-1">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'}
            className="flex-1"
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </div>

        {isMapError && (
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <strong>Need a Mapbox token?</strong>
              <br />
              Visit{' '}
              <a 
                href="https://mapbox.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                mapbox.com
              </a>
              {' '}to get your free public token.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};