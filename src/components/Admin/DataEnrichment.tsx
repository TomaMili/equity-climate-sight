import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Database, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SpeedDataPoint {
  time: string;
  itemsPerMinute: number;
  worker0?: number;
  worker1?: number;
  worker2?: number;
  worker3?: number;
  worker4?: number;
}

interface WorkerState {
  id: number;
  active: boolean;
  enriched: number;
  offset: number;
}

export function DataEnrichment() {
  const [isEnriching, setIsEnriching] = useState(false);
  const [progress, setProgress] = useState({ enriched: 0, total: 0, failed: 0 });
  const [autoResume, setAutoResume] = useState(true);
  const [pauseInterval, setPauseInterval] = useState(2);
  const [shouldStop, setShouldStop] = useState(false);
  const [timeEstimate, setTimeEstimate] = useState<{ startTime: number; itemsProcessed: number; lastCheckTime: number; lastCheckItems: number } | null>(null);
  const [speedData, setSpeedData] = useState<SpeedDataPoint[]>([]);
  const [workers, setWorkers] = useState<WorkerState[]>([]);
  const [parallelWorkers, setParallelWorkers] = useState(5); // Number of parallel workers

  const handleEnrichCountries = async (year: number) => {
    try {
      setIsEnriching(true);
      setShouldStop(false);
      const now = Date.now();
      setTimeEstimate({ startTime: now, itemsProcessed: 0, lastCheckTime: now, lastCheckItems: 0 });
      setSpeedData([]);
      toast.info(`Starting data enrichment for countries (${year})...`);
      
      let totalEnriched = 0;
      let totalFailed = 0;
      let shouldContinue = true;
      let iteration = 0;

      while (shouldContinue && iteration < 1000 && !shouldStop) { // Safety limit increased for large datasets
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

        // Update speed tracking
        setTimeEstimate(prev => {
          if (!prev) return null;
          const now = Date.now();
          const timeSinceLastCheck = (now - prev.lastCheckTime) / 1000 / 60; // minutes
          const itemsSinceLastCheck = totalEnriched - prev.lastCheckItems;
          
          if (timeSinceLastCheck > 0 && itemsSinceLastCheck > 0) {
            const itemsPerMinute = itemsSinceLastCheck / timeSinceLastCheck;
            const elapsedMinutes = (now - prev.startTime) / 1000 / 60;
            
            setSpeedData(prevData => [
              ...prevData,
              {
                time: `${Math.floor(elapsedMinutes)}m`,
                itemsPerMinute: Math.round(itemsPerMinute * 10) / 10
              }
            ].slice(-20)); // Keep last 20 data points
            
            return {
              ...prev,
              itemsProcessed: totalEnriched,
              lastCheckTime: now,
              lastCheckItems: totalEnriched
            };
          }
          
          return { ...prev, itemsProcessed: totalEnriched };
        });

        shouldContinue = data?.shouldContinue === true;

        if (shouldContinue) {
          console.log(`Batch ${iteration}: ${data?.enriched} enriched, ${data?.remaining} remaining...`);
          
          if (!autoResume && data?.remaining > 0) {
            toast.info(`Batch complete. ${data.remaining} regions remaining. Click again to continue.`);
            break;
          }
          
          // Configurable delay between batches
          await new Promise(resolve => setTimeout(resolve, pauseInterval * 1000));
        } else {
          toast.success(`Enrichment complete! ${totalEnriched} regions updated with real data.`);
        }
      }

      if (shouldStop) {
        toast.info(`Enrichment stopped by user. ${totalEnriched} regions enriched, progress saved.`);
      } else if (iteration >= 1000) {
        toast.warning('Enrichment paused after 1000 iterations. Click again to continue.');
      }
    } catch (error) {
      console.error('Enrichment error:', error);
      toast.error('Failed to enrich data. Please try again.');
    } finally {
      setIsEnriching(false);
      setTimeEstimate(null);
    }
  };

  const handleEnrichRegions = async (year: number) => {
    try {
      setIsEnriching(true);
      setShouldStop(false);
      const now = Date.now();
      setTimeEstimate({ startTime: now, itemsProcessed: 0, lastCheckTime: now, lastCheckItems: 0 });
      setSpeedData([]);
      
      // Initialize workers
      const initialWorkers: WorkerState[] = Array.from({ length: parallelWorkers }, (_, i) => ({
        id: i,
        active: true,
        enriched: 0,
        offset: i * 20 // Each worker starts at a different offset
      }));
      setWorkers(initialWorkers);
      
      toast.info(`Starting parallel enrichment with ${parallelWorkers} workers for regions (${year})...`);
      
      let totalEnriched = 0;
      let totalFailed = 0;
      let iteration = 0;
      const maxIterations = 200; // Safety limit per worker

      // Run workers in parallel
      while (!shouldStop && iteration < maxIterations) {
        iteration++;
        
        // Launch all active workers in parallel
        const workerPromises = initialWorkers
          .filter(w => w.active)
          .map(async (worker) => {
            try {
              const { data, error } = await supabase.functions.invoke('enrich-with-real-data', {
                body: { 
                  year, 
                  region_type: 'region',
                  worker_id: worker.id,
                  offset: worker.offset
                }
              });

              if (error) {
                console.error(`Worker ${worker.id} error:`, error);
                return { worker_id: worker.id, enriched: 0, failed: 0, complete: true, error: true };
              }

              return {
                worker_id: worker.id,
                enriched: data?.enriched || 0,
                failed: data?.failed || 0,
                complete: data?.complete || false,
                remaining: data?.remaining || 0
              };
            } catch (err) {
              console.error(`Worker ${worker.id} exception:`, err);
              return { worker_id: worker.id, enriched: 0, failed: 0, complete: true, error: true };
            }
          });

        // Wait for all workers to complete
        const results = await Promise.all(workerPromises);
        
        // Aggregate results
        let batchEnriched = 0;
        let batchFailed = 0;
        let allComplete = true;
        
        results.forEach((result) => {
          batchEnriched += result.enriched;
          batchFailed += result.failed;
          
          if (!result.complete && !result.error) {
            allComplete = false;
            // Update worker offset for next iteration
            const workerIndex = initialWorkers.findIndex(w => w.id === result.worker_id);
            if (workerIndex !== -1) {
              initialWorkers[workerIndex].offset += parallelWorkers * 20; // Jump ahead by total worker batch size
              initialWorkers[workerIndex].enriched += result.enriched;
            }
          } else {
            // Mark worker as inactive
            const workerIndex = initialWorkers.findIndex(w => w.id === result.worker_id);
            if (workerIndex !== -1) {
              initialWorkers[workerIndex].active = false;
            }
          }
        });

        totalEnriched += batchEnriched;
        totalFailed += batchFailed;

        // Get total remaining count
        const { count } = await supabase
          .from('climate_inequality_regions')
          .select('region_code', { count: 'exact', head: true })
          .eq('region_type', 'region')
          .eq('data_year', year)
          .contains('data_sources', ['Synthetic']);

        const remaining = count || 0;

        setProgress({
          enriched: totalEnriched,
          total: totalEnriched + remaining,
          failed: totalFailed
        });

        setWorkers([...initialWorkers]);

        // Update speed tracking
        setTimeEstimate(prev => {
          if (!prev) return null;
          const now = Date.now();
          const timeSinceLastCheck = (now - prev.lastCheckTime) / 1000 / 60;
          const itemsSinceLastCheck = totalEnriched - prev.lastCheckItems;
          
          if (timeSinceLastCheck > 0 && itemsSinceLastCheck > 0) {
            const itemsPerMinute = itemsSinceLastCheck / timeSinceLastCheck;
            const elapsedMinutes = (now - prev.startTime) / 1000 / 60;
            
            // Track per-worker speeds
            const workerSpeeds: any = {
              time: `${Math.floor(elapsedMinutes)}m`,
              itemsPerMinute: Math.round(itemsPerMinute * 10) / 10
            };
            
            initialWorkers.forEach(w => {
              workerSpeeds[`worker${w.id}`] = w.active ? Math.round((w.enriched / elapsedMinutes) * 10) / 10 : 0;
            });
            
            setSpeedData(prevData => [...prevData, workerSpeeds].slice(-20));
            
            return {
              ...prev,
              itemsProcessed: totalEnriched,
              lastCheckTime: now,
              lastCheckItems: totalEnriched
            };
          }
          
          return { ...prev, itemsProcessed: totalEnriched };
        });

        if (allComplete || remaining === 0) {
          toast.success(`Parallel enrichment complete! ${totalEnriched} regions updated with real data.`);
          break;
        }

        console.log(`Iteration ${iteration}: ${batchEnriched} enriched this round, ${remaining} remaining...`);

        if (!autoResume) {
          toast.info(`Batch complete. ${remaining} regions remaining. Click again to continue.`);
          break;
        }

        // Delay between iterations
        await new Promise(resolve => setTimeout(resolve, pauseInterval * 1000));
      }

      if (shouldStop) {
        toast.info(`Enrichment stopped by user. ${totalEnriched} regions enriched, progress saved.`);
      } else if (iteration >= maxIterations) {
        toast.warning('Enrichment paused after max iterations. Click again to continue.');
      }
    } catch (error) {
      console.error('Enrichment error:', error);
      toast.error('Failed to enrich data. Please try again.');
    } finally {
      setIsEnriching(false);
      setTimeEstimate(null);
      setWorkers([]);
    }
  };

  const calculateTimeRemaining = () => {
    if (!timeEstimate || !progress.total || progress.enriched === 0) return null;
    
    const elapsedMs = Date.now() - timeEstimate.startTime;
    const itemsRemaining = progress.total - progress.enriched;
    const avgTimePerItem = elapsedMs / progress.enriched;
    const estimatedRemainingMs = avgTimePerItem * itemsRemaining;
    
    const hours = Math.floor(estimatedRemainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((estimatedRemainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((estimatedRemainingMs % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s remaining`;
    } else {
      return `${seconds}s remaining`;
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
        {/* Auto-Resume Configuration */}
        <div className="space-y-3 pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="auto-resume"
                checked={autoResume}
                onChange={(e) => setAutoResume(e.target.checked)}
                disabled={isEnriching}
                className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
              />
              <label htmlFor="auto-resume" className="text-sm font-medium text-foreground cursor-pointer">
                Auto-resume enrichment
              </label>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <label htmlFor="parallel-workers" className="text-xs text-muted-foreground whitespace-nowrap">
              Parallel workers:
            </label>
            <input
              type="number"
              id="parallel-workers"
              min="1"
              max="10"
              value={parallelWorkers}
              onChange={(e) => setParallelWorkers(Math.max(1, Math.min(10, parseInt(e.target.value) || 5)))}
              disabled={isEnriching}
              className="w-16 h-8 px-2 text-sm rounded border border-border bg-background text-foreground focus:ring-2 focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground">(10x faster)</span>
          </div>
          
          <div className="flex items-center gap-2">
            <label htmlFor="pause-interval" className="text-xs text-muted-foreground whitespace-nowrap">
              Pause interval:
            </label>
            <input
              type="number"
              id="pause-interval"
              min="1"
              max="10"
              value={pauseInterval}
              onChange={(e) => setPauseInterval(Math.max(1, Math.min(10, parseInt(e.target.value) || 2)))}
              disabled={isEnriching}
              className="w-16 h-8 px-2 text-sm rounded border border-border bg-background text-foreground focus:ring-2 focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground">seconds between batches</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Countries (2024)</span>
            <div className="flex gap-2">
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
              {isEnriching && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setShouldStop(true)}
                >
                  Stop
                </Button>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Regions (2024)</span>
            <div className="flex gap-2">
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
              {isEnriching && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setShouldStop(true)}
                >
                  Stop
                </Button>
              )}
            </div>
          </div>
        </div>

        {isEnriching && progress.total > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <div className="flex items-center gap-2">
                {calculateTimeRemaining() && (
                  <span className="text-muted-foreground">{calculateTimeRemaining()}</span>
                )}
                <span className="text-foreground font-medium">{percentage}%</span>
              </div>
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

            {speedData.length > 1 && (
              <div className="pt-2">
                <div className="text-xs text-muted-foreground mb-2">
                  Enrichment Speed ({parallelWorkers} workers)
                  {workers.length > 0 && (
                    <span className="ml-2">
                      Active: {workers.filter(w => w.active).length}
                    </span>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={speedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="time" 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '10px' }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '10px' }}
                      label={{ value: 'items/min', angle: -90, position: 'insideLeft', style: { fontSize: '10px' } }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                      labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="itemsPerMinute" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                      name="Total Speed"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
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
