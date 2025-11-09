import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DataQualityBadge } from '@/components/DataQuality/DataQualityBadge';
import { QuickEnrichButton } from '@/components/DataQuality/QuickEnrichButton';

interface CriticalRegion {
  region_code: string;
  region_name: string;
  country: string;
  cii_score: number;
  cii_climate_risk_component: number | null;
  cii_infrastructure_gap_component: number | null;
  cii_socioeconomic_vuln_component: number | null;
  cii_air_quality_component: number | null;
  data_sources: string[];
}

interface CriticalRegionsProps {
  year: number;
  onRegionClick?: (data: any) => void;
}

export function CriticalRegions({ year, onRegionClick }: CriticalRegionsProps) {
  const [criticalRegions, setCriticalRegions] = useState<CriticalRegion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCriticalRegions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('climate_inequality_regions')
          .select(`
            region_code,
            region_name,
            country,
            cii_score,
            cii_climate_risk_component,
            cii_infrastructure_gap_component,
            cii_socioeconomic_vuln_component,
            cii_air_quality_component,
            data_sources
          `)
          .eq('data_year', year)
          .order('cii_score', { ascending: false })
          .limit(10);

        if (error) throw error;
        setCriticalRegions(data || []);
      } catch (error) {
        console.error('Error fetching critical regions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCriticalRegions();
  }, [year]);

  const handleEnrichComplete = () => {
    // Reload critical regions after enrichment
    const fetchCriticalRegions = async () => {
      const { data, error } = await supabase
        .from('climate_inequality_regions')
        .select(`
          region_code,
          region_name,
          country,
          cii_score,
          cii_climate_risk_component,
          cii_infrastructure_gap_component,
          cii_socioeconomic_vuln_component,
          cii_air_quality_component,
          data_sources
        `)
        .eq('data_year', year)
        .order('cii_score', { ascending: false })
        .limit(10);

      if (!error && data) {
        setCriticalRegions(data);
      }
    };
    fetchCriticalRegions();
  };

  const getSeverityColor = (score: number): string => {
    if (score >= 0.8) return 'bg-destructive text-destructive-foreground';
    if (score >= 0.6) return 'bg-orange-500 text-white';
    if (score >= 0.5) return 'bg-yellow-500 text-black';
    return 'bg-blue-500 text-white';
  };

  const getSeverityLabel = (score: number): string => {
    if (score >= 0.8) return 'Critical';
    if (score >= 0.6) return 'High';
    if (score >= 0.5) return 'Neutral';
    return 'Low';
  };

  const handleRegionClick = async (regionCode: string) => {
    try {
      const { data, error } = await supabase
        .from('climate_inequality_regions')
        .select('*')
        .eq('region_code', regionCode)
        .eq('data_year', year)
        .single();

      if (error) throw error;
      if (data && onRegionClick) {
        onRegionClick(data);
      }
    } catch (error) {
      console.error('Error loading region:', error);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Critical Regions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Critical Regions ({year})
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Top 10 regions with highest Climate Inequality Index
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {criticalRegions.map((region, index) => (
              <div
                key={region.region_code}
                className="p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group relative"
                onClick={() => handleRegionClick(region.region_code)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 pr-8">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">#{index + 1}</span>
                      <h4 className="font-medium text-sm">{region.region_name}</h4>
                    </div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-xs text-muted-foreground">{region.country}</p>
                      <DataQualityBadge 
                        dataSources={region.data_sources || []} 
                        size="sm"
                        showIcon={false}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 items-start">
                    <Badge className={getSeverityColor(region.cii_score)}>
                      {getSeverityLabel(region.cii_score)}
                    </Badge>
                  </div>
                </div>
                {region.data_sources?.includes('Synthetic') && (
                  <div 
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <QuickEnrichButton
                      regionCode={region.region_code}
                      regionName={region.region_name}
                      year={year}
                      size="icon"
                      variant="ghost"
                      onEnrichComplete={handleEnrichComplete}
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">CII Score:</span>
                    <span className="font-mono font-semibold">
                      {(region.cii_score * 100).toFixed(1)}%
                    </span>
                  </div>

                  {region.cii_climate_risk_component !== null && (
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t">
                      <div className="text-xs">
                        <span className="text-muted-foreground block">Climate Risk:</span>
                        <span className="font-mono text-xs">
                          {(region.cii_climate_risk_component * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground block">Infrastructure:</span>
                        <span className="font-mono text-xs">
                          {((region.cii_infrastructure_gap_component || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground block">Socioeconomic:</span>
                        <span className="font-mono text-xs">
                          {((region.cii_socioeconomic_vuln_component || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground block">Air Quality:</span>
                        <span className="font-mono text-xs">
                          {((region.cii_air_quality_component || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {region.cii_climate_risk_component === null && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    <span>Components being computed</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
