import { Card } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StatisticsPanelProps {
  viewMode: 'countries' | 'regions';
  year: number;
}

export const StatisticsPanel = ({ viewMode, year }: StatisticsPanelProps) => {
  const [stats, setStats] = useState({
    avgCII: 0,
    highRiskCount: 0,
    totalRegions: 0,
    criticalRegions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('climate_inequality_regions')
          .select('cii_score')
          .eq('data_year', year);

        // Filter by region type based on view mode
        if (viewMode === 'countries') {
          query = query.eq('region_type', 'country');
        } else {
          query = query.eq('region_type', 'region');
        }

        const { data, error } = await query;

        if (error) throw error;

        if (data && data.length > 0) {
          const avgCII = data.reduce((sum, item) => sum + Number(item.cii_score), 0) / data.length;
          const highRiskCount = data.filter(item => Number(item.cii_score) >= 0.7).length;
          const criticalRegions = data.filter(item => Number(item.cii_score) >= 0.9).length;
          
          setStats({
            avgCII,
            highRiskCount,
            totalRegions: data.length,
            criticalRegions,
          });
        } else {
          // Reset stats if no data
          setStats({
            avgCII: 0,
            highRiskCount: 0,
            totalRegions: 0,
            criticalRegions: 0,
          });
        }
      } catch (error) {
        console.error('Error loading statistics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [viewMode, year]);

  const displayMode = viewMode === 'countries' ? 'Countries' : 'Regions';

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        {displayMode} Statistics ({year})
      </h3>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 bg-muted animate-pulse rounded" />
              <div className="h-8 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Average CII</p>
            <p className="text-2xl font-bold text-foreground">{stats.avgCII.toFixed(2)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total {displayMode}</p>
            <p className="text-2xl font-bold text-foreground">{stats.totalRegions}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">High Risk Areas</p>
            <p className="text-2xl font-bold text-destructive">{stats.highRiskCount}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Critical Areas</p>
            <p className="text-2xl font-bold text-destructive">{stats.criticalRegions}</p>
          </div>
        </div>
      )}
    </Card>
  );
};