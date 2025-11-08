import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, ChevronDown, RefreshCw } from 'lucide-react';

interface ProgressData {
  status: 'countries' | 'countries_complete' | 'regions' | 'completed' | 'initializing';
  current_step: string | null;
  total_countries: number | null;
  processed_countries: number | null;
  total_regions: number | null;
  processed_regions: number | null;
}

export function CompactInitProgress() {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [regionsKickoff, setRegionsKickoff] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    const fetchProgress = async () => {
      const { data, error } = await supabase
        .from('initialization_progress')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setProgress(data as ProgressData);
        
        // Hide after completion
        if (data.status === 'completed') {
          setTimeout(() => setIsVisible(false), 3000);
          clearInterval(intervalId);
        }
      }
    };

    // Poll every 1 second for snappier progress
    fetchProgress();
    intervalId = setInterval(fetchProgress, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Auto-start regions after countries complete
  useEffect(() => {
    if (progress?.status === 'countries_complete' && !regionsKickoff && !isRunning) {
      setRegionsKickoff(true);
      (async () => {
        try {
          setIsRunning(true);
          await supabase.functions.invoke('initialize-regions');
        } catch (e) {
          console.error('Auto-start regions failed:', e);
        } finally {
          setIsRunning(false);
        }
      })();
    }
  }, [progress?.status, regionsKickoff, isRunning]);

  const handleRetry = async () => {
    try {
      setIsRunning(true);
      // First invoke countries, then regions
      await supabase.functions.invoke('initialize-countries');
      await supabase.functions.invoke('initialize-regions');
    } catch (e) {
      console.error('Retry initialization failed:', e);
    } finally {
      setIsRunning(false);
    }
  };

  if (!isVisible || !progress || progress.status === 'completed') {
    return null;
  }

  // Calculate progress based on current status
  let totalItems = 0;
  let processedItems = 0;
  let percentage = 0;

  if (progress.status === 'countries' || progress.status === 'countries_complete') {
    totalItems = progress.total_countries || 0;
    processedItems = progress.processed_countries || 0;
    percentage = totalItems > 0 ? Math.round((processedItems / totalItems) * 100) : 0;
  } else if (progress.status === 'regions') {
    totalItems = progress.total_regions || 0;
    processedItems = progress.processed_regions || 0;
    percentage = totalItems > 0 ? Math.round((processedItems / totalItems) * 100) : 0;
  }

  const statusLabel = 
    progress.status === 'countries' || progress.status === 'countries_complete'
      ? 'Loading Countries'
      : progress.status === 'regions'
      ? 'Loading Regions'
      : 'Initializing';

  return (
    <div className="absolute top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
      <Collapsible open={showDetails} onOpenChange={setShowDetails}>
        <div className="px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-medium text-foreground truncate">
                    {statusLabel}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {percentage}%
                  </span>
                </div>
                <Progress value={percentage} className="h-1.5" />
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRetry}
                disabled={isRunning}
                className="h-7 px-2"
                title="Retry"
              >
                <RefreshCw className={`h-3 w-3 ${isRunning ? 'animate-spin' : ''}`} />
              </Button>
              
              <CollapsibleTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  title="Show details"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </div>

        <CollapsibleContent>
          <div className="px-4 pb-3 space-y-2 border-t border-border/50 pt-2">
            <p className="text-xs text-muted-foreground">
              {progress.current_step}
            </p>

            {(progress.total_countries || 0) > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Countries:</span>
                  <span className="text-foreground font-medium">
                    {progress.processed_countries || 0} / {progress.total_countries || 0}
                  </span>
                </div>
                {(progress.total_regions || 0) > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Regions:</span>
                    <span className="text-foreground font-medium">
                      {progress.processed_regions || 0} / {progress.total_regions || 0}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
