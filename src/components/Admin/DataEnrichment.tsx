import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Database, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { EnrichmentValidation } from './EnrichmentValidation';

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
  failures: number;
  lastSuccess: boolean;
}

interface ScalingState {
  currentWorkers: number;
  successRate: number;
  rateLimitDetected: boolean;
  lastScaleAction: 'up' | 'down' | 'stable';
  scaleReason: string;
}

export function DataEnrichment() {
  // Constants
  const BATCH_SIZE = 6; // Must match edge function BATCH_SIZE
  
  const [isEnriching, setIsEnriching] = useState(false);
  const [progress, setProgress] = useState({ enriched: 0, total: 0, failed: 0 });
  const [shouldStop, setShouldStop] = useState(false);
  const [timeEstimate, setTimeEstimate] = useState<{ startTime: number; itemsProcessed: number; lastCheckTime: number; lastCheckItems: number } | null>(null);
  const [logs, setLogs] = useState<Array<{ time: string; message: string; type: 'info' | 'success' | 'error' | 'warning' }>>([]);
  const [parallelWorkers, setParallelWorkers] = useState(5);
  const [currentPhase, setCurrentPhase] = useState<'countries' | 'regions' | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [validationType, setValidationType] = useState<'all' | 'countries' | 'regions'>('all');
  const [selectedYear, setSelectedYear] = useState(2025);
  const [resumeStatus, setResumeStatus] = useState<{
    countriesRemaining: number;
    regionsRemaining: number;
    total: number;
    loading: boolean;
  }>({
    countriesRemaining: 0,
    regionsRemaining: 0,
    total: 0,
    loading: true
  });

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-49), { time, message, type }]);
  };

  // Check what needs enrichment on mount and when enrichment completes
  const checkResumeStatus = async () => {
    setResumeStatus(prev => ({ ...prev, loading: true }));
    try {
      const year = selectedYear;
      
      // Count total items for progress tracking
      const { count: countriesCount } = await supabase
        .from('climate_inequality_regions')
        .select('region_code', { count: 'exact', head: true })
        .eq('region_type', 'country')
        .eq('data_year', year);
      
      const { count: regionsCount } = await supabase
        .from('climate_inequality_regions')
        .select('region_code', { count: 'exact', head: true })
        .eq('region_type', 'region')
        .eq('data_year', year);
      
      setResumeStatus({
        countriesRemaining: countriesCount || 0,
        regionsRemaining: regionsCount || 0,
        total: (countriesCount || 0) + (regionsCount || 0),
        loading: false
      });
    } catch (error) {
      console.error('Error checking resume status:', error);
      setResumeStatus(prev => ({ ...prev, loading: false }));
    }
  };

  // Check status on mount and when year changes
  useEffect(() => {
    checkResumeStatus();
  }, [selectedYear]);

  const handleResumeEnrichment = async () => {
    setShowValidation(false);
    
    if (resumeStatus.countriesRemaining > 0 && resumeStatus.regionsRemaining > 0) {
      await handleEnrichAll();
    } else if (resumeStatus.countriesRemaining > 0) {
      await handleEnrichCountries(selectedYear);
    } else if (resumeStatus.regionsRemaining > 0) {
      await handleEnrichRegions(selectedYear);
    }
    
    await checkResumeStatus();
  };

  const handleEnrichCountries = async (year: number) => {
    setShowValidation(false);
    try {
      setIsEnriching(true);
      setShouldStop(false);
      const now = Date.now();
      setTimeEstimate({ startTime: now, itemsProcessed: 0, lastCheckTime: now, lastCheckItems: 0 });
      setLogs([]);
      addLog(`Starting enrichment for countries (${year})...`, 'info');
      toast.info(`Starting data enrichment for countries (${year})...`);
      
      let totalEnriched = 0;
      let totalFailed = 0;
      let shouldContinue = true;
      let iteration = 0;
      let offset = 0; // Track current offset

      while (shouldContinue && iteration < 1000 && !shouldStop) { // Safety limit increased for large datasets
        iteration++;
        
        // Retry up to 3 times on transient failures
        let data: any = null;
        let error: any = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          const resp = await supabase.functions.invoke('enrich-with-real-data', {
            body: { year, region_type: 'country', worker_id: 0, offset }
          });
          if (!resp.error && resp.data) {
            data = resp.data;
            error = null;
            break;
          }
          error = resp.error;
          // Backoff before retrying
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }

        if (error) {
          console.error(`Enrichment call failed (iteration ${iteration}):`, error);
          addLog(`Batch ${iteration} failed: ${error.message || 'Unknown error'}`, 'error');
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

        // Update time tracking
        setTimeEstimate(prev => {
          if (!prev) return null;
          return {
            ...prev,
            itemsProcessed: totalEnriched,
            lastCheckTime: Date.now(),
            lastCheckItems: totalEnriched
          };
        });

        shouldContinue = data?.shouldContinue === true;

        if (shouldContinue) {
          // Increment offset for next batch
          offset += BATCH_SIZE;
          
        console.log(`Batch ${iteration}: ${data?.enriched} enriched, ${data?.remaining} remaining, offset now ${offset}...`);
        addLog(`Batch ${iteration}: +${data?.enriched} enriched, ${data?.remaining} remaining`, 'success');
        
        // Configurable delay between batches
        await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          addLog(`✓ Enrichment complete! ${totalEnriched} countries updated`, 'success');
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
      await checkResumeStatus(); // Refresh resume status
    }
  };

  const handleEnrichRegions = async (year: number) => {
    setShowValidation(false);
    try {
      setIsEnriching(true);
      setShouldStop(false);
      const now = Date.now();
      setTimeEstimate({ startTime: now, itemsProcessed: 0, lastCheckTime: now, lastCheckItems: 0 });
      setLogs([]);
      
      // Initialize workers
      let currentWorkerCount = parallelWorkers;
      const initialWorkers: WorkerState[] = Array.from({ length: currentWorkerCount }, (_, i) => ({
        id: i,
        active: true,
        enriched: 0,
        offset: i * BATCH_SIZE,
        failures: 0,
        lastSuccess: true
      }));
      
      addLog(`Starting parallel enrichment with ${currentWorkerCount} workers...`, 'info');
      toast.info(`Starting parallel enrichment with ${currentWorkerCount} workers...`);
      
      let totalEnriched = 0;
      let totalFailed = 0;
      let iteration = 0;
      const maxIterations = 200;

      // Run workers in parallel with dynamic scaling
      while (!shouldStop && iteration < maxIterations) {
        iteration++;
        
        // Launch all active workers in parallel
        const activeWorkers = initialWorkers.filter(w => w.active);
        const workerPromises = activeWorkers.map(async (worker) => {
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
                const errorMsg = error.message || 'Unknown error';
                addLog(`Worker ${worker.id} failed: ${errorMsg}`, 'error');
                
                return {
                  worker_id: worker.id, 
                  enriched: 0, 
                  failed: 0, 
                  complete: false, 
                  error: true
                };
              }

              return {
                worker_id: worker.id,
                enriched: data?.enriched || 0,
                failed: data?.failed || 0,
                complete: data?.complete || false,
                remaining: data?.remaining || 0,
                error: false
              };
            } catch (err: any) {
              console.error(`Worker ${worker.id} exception:`, err);
              const errorMsg = err.message || 'Unknown exception';
              addLog(`Worker ${worker.id} exception: ${errorMsg}`, 'error');
              
              return {
                worker_id: worker.id, 
                enriched: 0, 
                failed: 0, 
                complete: false, 
                error: true
              };
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
          
          if (!result.error && result.enriched > 0) {
            addLog(`Worker ${result.worker_id}: +${result.enriched} enriched`, 'success');
          }
          
          if (result.error) {
            const workerIndex = initialWorkers.findIndex(w => w.id === result.worker_id);
            if (workerIndex !== -1) {
              initialWorkers[workerIndex].failures += 1;
              initialWorkers[workerIndex].lastSuccess = false;
            }
            allComplete = false;
          } else if (!result.complete) {
            allComplete = false;
            const workerIndex = initialWorkers.findIndex(w => w.id === result.worker_id);
            if (workerIndex !== -1) {
              initialWorkers[workerIndex].offset += currentWorkerCount * BATCH_SIZE;
              initialWorkers[workerIndex].enriched += result.enriched;
              initialWorkers[workerIndex].failures = 0;
              initialWorkers[workerIndex].lastSuccess = true;
            }
          } else {
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
          .eq('data_year', year);

        const remaining = count || 0;

        setProgress({
          enriched: totalEnriched,
          total: totalEnriched + remaining,
          failed: totalFailed
        });

        // Update time tracking
        setTimeEstimate(prev => {
          if (!prev) return null;
          return { ...prev, itemsProcessed: totalEnriched };
        });

        if (allComplete || remaining === 0) {
          addLog(`✓ Enrichment complete! ${totalEnriched} regions updated`, 'success');
          toast.success(`Parallel enrichment complete! ${totalEnriched} regions updated with real data.`);
          break;
        }

        console.log(`Iteration ${iteration}: ${batchEnriched} enriched, ${currentWorkerCount} workers active, ${remaining} remaining`);

        // Delay between iterations
        await new Promise(resolve => setTimeout(resolve, 2000));
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
      await checkResumeStatus();
    }
  };

  const handleEnrichAll = async () => {
    setShowValidation(false);
    setCurrentPhase('countries');
    toast.info('Starting full enrichment: countries first, then regions...');
    
    await handleEnrichCountries(selectedYear);
    
    if (!shouldStop) {
      setCurrentPhase('regions');
      await handleEnrichRegions(selectedYear);
    }
    
    setCurrentPhase(null);
    toast.success('Full enrichment complete!');
  };

  return (
    <Card className="p-6">
      {showValidation ? (
        <EnrichmentValidation
          enrichmentType={validationType}
          parallelWorkers={parallelWorkers}
          year={selectedYear}
          onProceed={() => {
            if (validationType === 'all') handleEnrichAll();
            else if (validationType === 'countries') handleEnrichCountries(selectedYear);
            else if (validationType === 'regions') handleEnrichRegions(selectedYear);
          }}
          onCancel={() => setShowValidation(false)}
        />
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Data Enrichment</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Enrich regions with real data from OpenAQ, World Bank, NASA, and GeoNames APIs.
            </p>
          </div>

          {/* Status Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground mb-1">Countries</div>
              <div className="text-2xl font-bold">{resumeStatus.countriesRemaining}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground mb-1">Regions</div>
              <div className="text-2xl font-bold">{resumeStatus.regionsRemaining}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground mb-1">Total</div>
              <div className="text-2xl font-bold">{resumeStatus.total}</div>
            </div>
          </div>

          {/* Year Selection */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 rounded-md border bg-background"
            disabled={isEnriching}
            >
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
              <option value={2023}>2023</option>
              <option value={2022}>2022</option>
              <option value={2021}>2021</option>
              <option value={2020}>2020</option>
            </select>
            <label className="text-sm font-medium ml-4">Workers:</label>
          <input
            type="number"
            min="1"
            max="10"
            value={parallelWorkers}
            onChange={(e) => setParallelWorkers(Math.max(1, Math.min(10, parseInt(e.target.value) || 5)))}
              disabled={isEnriching}
            className="w-20 px-3 py-2 rounded-md border bg-background"
          />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setValidationType('all');
                setShowValidation(true);
              }}
              disabled={isEnriching}
              size="lg"
            >
              <Database className="w-4 h-4 mr-2" />
              Enrich All Data
            </Button>
            
            <Button
              onClick={() => {
                setValidationType('countries');
                setShowValidation(true);
              }}
              disabled={isEnriching}
              variant="outline"
            >
              Enrich Countries Only
            </Button>
            
            <Button
              onClick={() => {
                setValidationType('regions');
                setShowValidation(true);
              }}
              disabled={isEnriching}
              variant="outline"
            >
              Enrich Regions Only
            </Button>

            {isEnriching && (
              <Button
                onClick={() => setShouldStop(true)}
                variant="destructive"
              >
                Stop
              </Button>
            )}
          </div>

          {/* Progress */}
          {isEnriching && progress.total > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {currentPhase === 'countries' ? 'Enriching Countries' : 'Enriching Regions'}
                </span>
                <span className="font-medium">
                  {progress.enriched} / {progress.total} ({Math.round((progress.enriched / progress.total) * 100)}%)
                </span>
              </div>
              <Progress value={(progress.enriched / progress.total) * 100} />
              {timeEstimate && progress.enriched > 0 && (
                <p className="text-sm text-muted-foreground">
                  Estimated time remaining: {
                    Math.max(0, Math.ceil(
                      ((progress.total - progress.enriched) * 
                      ((Date.now() - timeEstimate.startTime) / progress.enriched)) / 1000 / 60
                    ))
                  } minutes
                </p>
              )}
            </div>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <div className="rounded-lg border bg-muted/20">
              <ScrollArea className="h-[200px] p-4">
                {logs.slice(-30).map((log, i) => (
                  <div key={i} className="text-xs mb-1 font-mono flex gap-2">
                    <span className="text-muted-foreground">{log.time}</span>
                    <span className={
                      log.type === 'error' ? 'text-destructive' :
                      log.type === 'success' ? 'text-green-500' :
                      log.type === 'warning' ? 'text-yellow-500' :
                      'text-foreground'
                    }>{log.message}</span>
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
