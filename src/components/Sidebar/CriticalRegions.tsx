import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CriticalRegion {
  region_code: string;
  region_name: string;
  country: string;
  cii_score: number;
  cii_climate_risk_component: number | null;
  cii_infrastructure_gap_component: number | null;
  cii_socioeconomic_vuln_component: number | null;
  cii_air_quality_component: number | null;
}

interface CriticalRegionsProps {
  year: number;
  onRegionClick?: (regionCode: string) => void;
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
            cii_air_quality_component
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

  const getSeverityColor = (score: number): string => {
    if (score >= 0.7) return 'bg-destructive text-destructive-foreground';
    if (score >= 0.5) return 'bg-orange-500 text-white';
    return 'bg-yellow-500 text-black';
  };

  const getSeverityLabel = (score: number): string => {
    if (score >= 0.7) return 'Kritično';
    if (score >= 0.5) return 'Visoko';
    return 'Umjereno';
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Najkritičniji regioni
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Učitavanje...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Najkritičniji regioni ({year})
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Top 10 regiona sa najvišim Climate Inequality Index
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {criticalRegions.map((region, index) => (
              <div
                key={region.region_code}
                className="p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => onRegionClick?.(region.region_code)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">#{index + 1}</span>
                      <h4 className="font-medium text-sm">{region.region_name}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">{region.country}</p>
                  </div>
                  <Badge className={getSeverityColor(region.cii_score)}>
                    {getSeverityLabel(region.cii_score)}
                  </Badge>
                </div>

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
                        <span className="text-muted-foreground block">Klimatski rizik:</span>
                        <span className="font-mono text-xs">
                          {(region.cii_climate_risk_component * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground block">Infrastruktura:</span>
                        <span className="font-mono text-xs">
                          {((region.cii_infrastructure_gap_component || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground block">Socioekonomija:</span>
                        <span className="font-mono text-xs">
                          {((region.cii_socioeconomic_vuln_component || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground block">Kvaliteta zraka:</span>
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
                    <span>Komponente u procesu izračunavanja</span>
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
