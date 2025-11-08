import { Card } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

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
  const [prevYearStats, setPrevYearStats] = useState({
    avgCII: 0,
    highRiskCount: 0,
    totalRegions: 0,
    criticalRegions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      // Load current year stats
      let query = supabase
        .from('climate_inequality_regions')
        .select('cii_score')
        .eq('data_year', year);

      if (viewMode === 'countries') {
        query = query.eq('region_type', 'country');
      } else {
        query = query.eq('region_type', 'region');
      }

      const { data, error } = await query;
      if (error) throw error;

      // Load previous year stats for comparison
      let prevQuery = supabase
        .from('climate_inequality_regions')
        .select('cii_score')
        .eq('data_year', year - 1);

      if (viewMode === 'countries') {
        prevQuery = prevQuery.eq('region_type', 'country');
      } else {
        prevQuery = prevQuery.eq('region_type', 'region');
      }

      const { data: prevData } = await prevQuery;

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

        // Calculate previous year stats
        if (prevData && prevData.length > 0) {
          const prevAvgCII = prevData.reduce((sum, item) => sum + Number(item.cii_score), 0) / prevData.length;
          const prevHighRiskCount = prevData.filter(item => Number(item.cii_score) >= 0.7).length;
          const prevCriticalRegions = prevData.filter(item => Number(item.cii_score) >= 0.9).length;
          
          setPrevYearStats({
            avgCII: prevAvgCII,
            highRiskCount: prevHighRiskCount,
            totalRegions: prevData.length,
            criticalRegions: prevCriticalRegions,
          });
        } else {
          setPrevYearStats({
            avgCII: 0,
            highRiskCount: 0,
            totalRegions: 0,
            criticalRegions: 0,
          });
        }

        setLastUpdated(new Date());
      } else {
        setStats({
          avgCII: 0,
          highRiskCount: 0,
          totalRegions: 0,
          criticalRegions: 0,
        });
        setPrevYearStats({
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
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [viewMode, year]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadStats();
  };

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const renderChangeIndicator = (current: number, previous: number) => {
    const change = calculateChange(current, previous);
    if (change === null || change === 0) return null;

    const isPositive = change > 0;
    return (
      <span className={`text-xs ml-2 inline-flex items-center gap-1 ${isPositive ? 'text-destructive' : 'text-green-600'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(change).toFixed(1)}%
      </span>
    );
  };

  const displayMode = viewMode === 'countries' ? 'Countries' : 'Regions';

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          {displayMode} Statistics ({year})
        </h3>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-8 w-8"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      {lastUpdated && (
        <p className="text-xs text-muted-foreground mb-3">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}

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
            <div className="flex items-baseline">
              <p className="text-2xl font-bold text-foreground">{stats.avgCII.toFixed(2)}</p>
              {renderChangeIndicator(stats.avgCII, prevYearStats.avgCII)}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total {displayMode}</p>
            <div className="flex items-baseline">
              <p className="text-2xl font-bold text-foreground">{stats.totalRegions}</p>
              {renderChangeIndicator(stats.totalRegions, prevYearStats.totalRegions)}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">High Risk Areas</p>
            <div className="flex items-baseline">
              <p className="text-2xl font-bold text-destructive">{stats.highRiskCount}</p>
              {renderChangeIndicator(stats.highRiskCount, prevYearStats.highRiskCount)}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Critical Areas</p>
            <div className="flex items-baseline">
              <p className="text-2xl font-bold text-destructive">{stats.criticalRegions}</p>
              {renderChangeIndicator(stats.criticalRegions, prevYearStats.criticalRegions)}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};