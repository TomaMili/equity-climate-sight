import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, AlertCircle, CheckCircle2, Database } from 'lucide-react';
import { toast } from 'sonner';

interface SourceStats {
  source: string;
  total: number;
  withData: number;
  percentage: number;
}

export function EnrichmentStats() {
  const [stats, setStats] = useState<SourceStats[]>([]);
  const [lastErrors, setLastErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Get counts for each data source
      const sources = ['OpenAQ', 'World Bank', 'NASA POWER', 'UN Data'];
      const sourceStats: SourceStats[] = [];

      for (const source of sources) {
        const { count: total } = await supabase
          .from('climate_inequality_regions')
          .select('*', { count: 'exact', head: true })
          .eq('data_year', 2024);

        const { count: withData } = await supabase
          .from('climate_inequality_regions')
          .select('*', { count: 'exact', head: true })
          .eq('data_year', 2024)
          .contains('data_sources', [source]);

        sourceStats.push({
          source,
          total: total || 0,
          withData: withData || 0,
          percentage: total ? Math.round((withData || 0) / total * 100) : 0
        });
      }

      setStats(sourceStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLastErrors(prev => [...prev, `Stats fetch: ${error}`].slice(-5));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleRetrySource = async (source: string) => {
    setRetrying(source);
    try {
      if (source === 'OpenAQ') {
        const { error } = await supabase.functions.invoke('fetch-openaq-data');
        if (error) throw error;
        toast.success('OpenAQ data fetch initiated');
      } else {
        const { error } = await supabase.functions.invoke('enrich-with-real-data', {
          body: { year: 2024, region_type: 'country' }
        });
        if (error) throw error;
        toast.success(`${source} enrichment initiated`);
      }
      
      setTimeout(fetchStats, 2000);
    } catch (error: any) {
      console.error(`Retry ${source} failed:`, error);
      setLastErrors(prev => [...prev, `${source}: ${error.message}`].slice(-5));
      toast.error(`Failed to retry ${source}`);
    } finally {
      setRetrying(null);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Enrichment Stats</h3>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={fetchStats}
          disabled={loading}
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="space-y-2">
        {stats.map((stat) => (
          <div key={stat.source} className="flex items-center justify-between text-xs border-b border-border/40 pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <span className="font-medium">{stat.source}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {stat.withData}/{stat.total} ({stat.percentage}%)
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2"
                onClick={() => handleRetrySource(stat.source)}
                disabled={retrying === stat.source}
              >
                {retrying === stat.source ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {lastErrors.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/40">
          <div className="flex items-center gap-1 mb-2">
            <AlertCircle className="h-3 w-3 text-destructive" />
            <span className="text-xs font-medium text-destructive">Recent Errors</span>
          </div>
          <div className="space-y-1">
            {lastErrors.map((error, idx) => (
              <p key={idx} className="text-[10px] text-muted-foreground truncate">
                {error}
              </p>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
