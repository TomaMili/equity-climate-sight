import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Database, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export function DataEnrichment() {
  const [isEnriching, setIsEnriching] = useState(false);
  const [progress, setProgress] = useState({ enriched: 0, total: 0, failed: 0 });

  const handleEnrichCountries = async (year: number) => {
    try {
      setIsEnriching(true);
      toast.info(`Starting data enrichment for countries (${year})...`);
      
      let totalEnriched = 0;
      let totalFailed = 0;
      let shouldContinue = true;
      let iteration = 0;

      while (shouldContinue && iteration < 1000) { // Safety limit increased for large datasets
        iteration++;
        
        const { data, error } = await supabase.functions.invoke('enrich-with-real-data', {
          body: { year, region_type: 'country' }
        });

        if (error) {
          console.error(`Enrichment call failed (iteration ${iteration}):`, error);
          toast.error(`Enrichment error at batch ${iteration}. Stopping.`);
          break;
        }

        if (!data) {
          console.error(`No data returned (iteration ${iteration})`);
          toast.error('No response from enrichment function.');
          break;
        }

        totalEnriched += data?.enriched || 0;
        totalFailed += data?.failed || 0;

        setProgress({
          enriched: totalEnriched,
          total: totalEnriched + (data?.remaining || 0),
          failed: totalFailed
        });

        shouldContinue = data?.shouldContinue === true;

        if (shouldContinue) {
          console.log(`Batch ${iteration}: ${data?.enriched} enriched, ${data?.remaining} remaining...`);
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          toast.success(`Enrichment complete! ${totalEnriched} regions updated with real data.`);
        }
      }

      if (iteration >= 1000) {
        toast.warning('Enrichment paused after 1000 iterations. Click again to continue.');
      }
    } catch (error) {
      console.error('Enrichment error:', error);
      toast.error('Failed to enrich data. Please try again.');
    } finally {
      setIsEnriching(false);
    }
  };

  const handleEnrichRegions = async (year: number) => {
    try {
      setIsEnriching(true);
      toast.info(`Starting data enrichment for regions (${year})...`);
      
      let totalEnriched = 0;
      let totalFailed = 0;
      let shouldContinue = true;
      let iteration = 0;

      while (shouldContinue && iteration < 1000) { // Safety limit increased for large datasets
        iteration++;
        
        const { data, error } = await supabase.functions.invoke('enrich-with-real-data', {
          body: { year, region_type: 'region' }
        });

        if (error) {
          console.error(`Enrichment call failed (iteration ${iteration}):`, error);
          toast.error(`Enrichment error at batch ${iteration}. Stopping.`);
          break;
        }

        if (!data) {
          console.error(`No data returned (iteration ${iteration})`);
          toast.error('No response from enrichment function.');
          break;
        }

        totalEnriched += data?.enriched || 0;
        totalFailed += data?.failed || 0;

        setProgress({
          enriched: totalEnriched,
          total: totalEnriched + (data?.remaining || 0),
          failed: totalFailed
        });

        shouldContinue = data?.shouldContinue === true;

        if (shouldContinue) {
          console.log(`Batch ${iteration}: ${data?.enriched} enriched, ${data?.remaining} remaining...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          toast.success(`Enrichment complete! ${totalEnriched} regions updated with real data.`);
        }
      }

      if (iteration >= 1000) {
        toast.warning('Enrichment paused after 1000 iterations. Click again to continue.');
      }
    } catch (error) {
      console.error('Enrichment error:', error);
      toast.error('Failed to enrich data. Please try again.');
    } finally {
      setIsEnriching(false);
    }
  };

  const percentage = progress.total > 0 
    ? Math.round((progress.enriched / progress.total) * 100) 
    : 0;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Database className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Real Data Integration</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Replace synthetic data with real measurements from OpenAQ, World Bank, and other public APIs.
      </p>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Countries (2024)</span>
            <Button
              size="sm"
              onClick={() => handleEnrichCountries(2024)}
              disabled={isEnriching}
            >
              {isEnriching ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Enriching...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Enrich Countries
                </>
              )}
            </Button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Regions (2024)</span>
            <Button
              size="sm"
              onClick={() => handleEnrichRegions(2024)}
              disabled={isEnriching}
            >
              {isEnriching ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Enriching...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Enrich Regions
                </>
              )}
            </Button>
          </div>
        </div>

        {isEnriching && progress.total > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-foreground font-medium">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
            
            <div className="grid grid-cols-2 gap-2 text-xs pt-2">
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                <span>{progress.enriched} enriched</span>
              </div>
              {progress.failed > 0 && (
                <div className="flex items-center gap-1 text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  <span>{progress.failed} failed</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p className="font-medium">Data Sources:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>OpenAQ - Air quality (PM2.5, NO2)</li>
            <li>World Bank - Population, GDP, urban %</li>
            <li>World Bank Climate - Precipitation</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
