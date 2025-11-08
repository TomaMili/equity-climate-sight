import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ProgressData {
  status: 'countries' | 'countries_complete' | 'regions' | 'completed' | 'initializing';
  current_step: string | null;
  total_countries: number | null;
  processed_countries: number | null;
  total_regions: number | null;
  processed_regions: number | null;
}

export function InitializationProgress() {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
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

    // Poll every 2 seconds
    fetchProgress();
    intervalId = setInterval(fetchProgress, 2000);

    return () => clearInterval(intervalId);
  }, []);

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

  return (
    <Card className="fixed top-4 right-4 z-50 p-4 w-80 bg-card border-border shadow-lg">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <h3 className="font-semibold text-sm text-foreground">
              {progress.status === 'countries' || progress.status === 'countries_complete' 
                ? 'Loading Countries' 
                : progress.status === 'regions'
                ? 'Loading Regions'
                : 'Initializing Database'}
            </h3>
          </div>
          <Button size="sm" variant="secondary" onClick={handleRetry} disabled={isRunning} aria-label="Retry initialization">
            {isRunning ? 'Retrying...' : 'Retry'}
          </Button>
        </div>
        
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{progress.current_step}</p>
          <Progress value={percentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{percentage}% complete</span>
            <span>{processedItems} / {totalItems}</span>
          </div>
        </div>

        {(progress.total_countries || 0) > 0 && (
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Countries:</span>
              <span className="text-foreground font-medium">
                {progress.processed_countries || 0} / {progress.total_countries || 0}
              </span>
            </div>
            {(progress.total_regions || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Regions:</span>
                <span className="text-foreground font-medium">
                  {progress.processed_regions || 0} / {progress.total_regions || 0}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
