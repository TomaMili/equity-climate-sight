import { Card } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const StatisticsPanel = () => {
  const [stats, setStats] = useState({
    avgCII: 0,
    highRiskCount: 0,
    totalRegions: 0,
    criticalRegions: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const { data, error } = await supabase
          .from('climate_inequality_data')
          .select('cii_score')
          .eq('data_year', 2024);

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
        }
      } catch (error) {
        console.error('Error loading statistics:', error);
      }
    };

    loadStats();
  }, []);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Global Statistics (2024)</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Average CII</p>
          <p className="text-2xl font-bold text-foreground">{stats.avgCII.toFixed(2)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Total Regions</p>
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
    </Card>
  );
};