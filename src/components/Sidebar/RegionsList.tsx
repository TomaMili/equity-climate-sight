import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RegionsListProps {
  country: string;
  year: number;
  onRegionClick: (region: any) => void;
  selectedRegionCode?: string | null;
}

export function RegionsList({ country, year, onRegionClick, selectedRegionCode }: RegionsListProps) {
  const [regions, setRegions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRegions = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('climate_inequality_regions')
          .select('*')
          .eq('data_year', year)
          .eq('country', country)
          .eq('region_type', 'region')
          .order('cii_score', { ascending: false });

        if (error) throw error;
        setRegions(data || []);
      } catch (error) {
        console.error('Error loading regions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRegions();
  }, [country, year]);

  const getRiskColor = (score: number) => {
    if (score < 0.3) return 'text-green-600';
    if (score < 0.5) return 'text-blue-600';
    if (score < 0.7) return 'text-yellow-600';
    if (score < 0.9) return 'text-orange-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (regions.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground text-center py-4">
          No regions found for {country}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground">Regions in {country}</h4>
        <Badge variant="secondary" className="text-xs">{regions.length} total</Badge>
      </div>
      
      <ScrollArea className="h-[400px] pr-3">
        <div className="space-y-2">
          {regions.map((region) => (
            <Button
              key={region.region_code}
              variant={selectedRegionCode === region.region_code ? "default" : "outline"}
              className="w-full justify-start h-auto py-3 px-3"
              onClick={() => onRegionClick(region)}
            >
              <div className="flex items-start gap-3 w-full">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm">{region.region_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-semibold ${getRiskColor(region.cii_score)}`}>
                      CII: {(region.cii_score * 100).toFixed(1)}%
                    </span>
                    {region.population && (
                      <span className="text-xs text-muted-foreground">
                        • Pop: {(region.population / 1000).toFixed(0)}K
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
