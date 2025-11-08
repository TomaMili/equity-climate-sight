import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Map } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const DataRefresh = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdatingBoundaries, setIsUpdatingBoundaries] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshStatus, setRefreshStatus] = useState<any>(null);
  const [boundaryStatus, setBoundaryStatus] = useState<any>(null);
  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshStatus(null);

    try {
      const { data, error } = await supabase.functions.invoke('fetch-openaq-data', {
        body: { days_back: 7 }
      });

      if (error) throw error;

      setRefreshStatus(data);
      setLastRefresh(new Date());
      
      toast({
        title: 'Data Refresh Complete',
        description: `Updated ${data.summary.successful} of ${data.summary.total} countries`,
      });
    } catch (error: any) {
      console.error('Error refreshing data:', error);
      toast({
        title: 'Refresh Failed',
        description: error.message || 'Failed to fetch OpenAQ data',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpdateBoundaries = async () => {
    setIsUpdatingBoundaries(true);
    setBoundaryStatus(null);

    toast({
      title: 'Updating Boundaries',
      description: 'This may take 1-2 minutes. Please wait...',
    });

    try {
      const { data, error } = await supabase.functions.invoke('update-real-boundaries', {
        body: {}
      });

      if (error) throw error;

      setBoundaryStatus(data);
      
      toast({
        title: 'Boundaries Updated! 🎉',
        description: `Updated ${data.summary.updated} countries with real borders from Natural Earth`,
      });

      // Reload the page after 2 seconds to show new boundaries
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error('Error updating boundaries:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update boundaries',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingBoundaries(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Air Quality Data Refresh Section */}
        <div>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                OpenAQ Data Refresh
              </h3>
              <p className="text-sm text-muted-foreground">
                Fetch live air quality data from ASDI
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing || isUpdatingBoundaries}
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>

          {lastRefresh && (
            <p className="text-xs text-muted-foreground mb-3">
              Last refreshed: {lastRefresh.toLocaleString()}
            </p>
          )}

          {refreshStatus && (
            <div className="space-y-3 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-foreground">
                  {refreshStatus.summary.successful} countries updated successfully
                </span>
              </div>
              
              {refreshStatus.summary.failed > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span className="text-foreground">
                    {refreshStatus.summary.failed} countries failed
                  </span>
                </div>
              )}

              {refreshStatus.errors && refreshStatus.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                    View Errors
                  </summary>
                  <div className="mt-2 space-y-1">
                    {refreshStatus.errors.map((error: string, i: number) => (
                      <div key={i} className="text-xs text-destructive flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              <details className="mt-2">
                <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                  View Details
                </summary>
                <div className="mt-2 space-y-2">
                  {Object.entries(refreshStatus.results).map(([code, result]: [string, any]) => (
                    <div key={code} className="text-xs flex items-center justify-between bg-muted/50 p-2 rounded">
                      <span className="font-medium">{code}</span>
                      {result.success ? (
                        <div className="flex gap-2 text-muted-foreground">
                          {result.pm25 && <span>PM2.5: {result.pm25.toFixed(1)}</span>}
                          {result.no2 && <span>NO₂: {result.no2.toFixed(1)}</span>}
                        </div>
                      ) : (
                        <span className="text-destructive">{result.message || result.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <strong>Data Source:</strong> OpenAQ API (Amazon Sustainability Data Initiative)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Fetches 7-day average PM2.5 and NO₂ measurements for all mapped countries
            </p>
          </div>
        </div>

        {/* Map Boundaries Update Section */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Real Country Boundaries
              </h3>
              <p className="text-sm text-muted-foreground">
                Replace simplified borders with Natural Earth data
              </p>
            </div>
            <Button
              onClick={handleUpdateBoundaries}
              disabled={isRefreshing || isUpdatingBoundaries}
              size="sm"
              variant="secondary"
            >
              <Map className={`w-4 h-4 mr-2 ${isUpdatingBoundaries ? 'animate-pulse' : ''}`} />
              {isUpdatingBoundaries ? 'Updating...' : 'Update Boundaries'}
            </Button>
          </div>

          {boundaryStatus && (
            <div className="space-y-3 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-foreground">
                  {boundaryStatus.summary.updated} countries updated with real borders
                </span>
              </div>
              
              {boundaryStatus.summary.skipped > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {boundaryStatus.summary.skipped} countries skipped (not in database)
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <strong>Data Source:</strong> Natural Earth 1:110m Cultural Vectors
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Updates country-level geometries with accurate boundary polygons. Page will reload automatically after update.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};