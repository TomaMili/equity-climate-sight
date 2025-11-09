import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { RegionDetails } from '@/components/Sidebar/RegionDetails';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function RegionDetail() {
  const { regionCode } = useParams<{ regionCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [regionData, setRegionData] = useState<any>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  useEffect(() => {
    if (!regionCode) return;

    const loadRegionData = async () => {
      try {
        setIsLoading(true);

        // Fetch region data
        const { data, error } = await supabase
          .from('climate_inequality_regions')
          .select('*')
          .eq('region_code', regionCode)
          .eq('data_year', 2024)
          .single();

        if (error) throw error;

        setRegionData(data);

        // Generate AI insight
        if (data) {
          setIsLoadingInsight(true);
          
          const sanitizeNumber = (value: any) => {
            if (value === null || value === undefined) return null;
            const num = Number(value);
            return isNaN(num) ? null : num;
          };

          const regionDataForInsight = {
            ...data,
            population: sanitizeNumber(data.population),
            cii_score: sanitizeNumber(data.cii_score) ?? 0,
            climate_risk_score: sanitizeNumber(data.climate_risk_score),
            infrastructure_score: sanitizeNumber(data.infrastructure_score),
            socioeconomic_score: sanitizeNumber(data.socioeconomic_score),
            air_quality_pm25: sanitizeNumber(data.air_quality_pm25),
            air_quality_no2: sanitizeNumber(data.air_quality_no2),
            internet_speed_download: sanitizeNumber(data.internet_speed_download),
            internet_speed_upload: sanitizeNumber(data.internet_speed_upload),
            temperature_avg: sanitizeNumber(data.temperature_avg),
            precipitation_avg: sanitizeNumber(data.precipitation_avg),
            drought_index: sanitizeNumber(data.drought_index),
            flood_risk_score: sanitizeNumber(data.flood_risk_score),
            gdp_per_capita: sanitizeNumber(data.gdp_per_capita),
            urban_population_percent: sanitizeNumber(data.urban_population_percent),
            data_sources: typeof data.data_sources === 'string' 
              ? JSON.parse(data.data_sources)
              : data.data_sources
          };

          const { data: insightData, error: insightError } = await supabase.functions.invoke('generate-insights', {
            body: { regionData: regionDataForInsight }
          });

          if (insightError) throw insightError;

          setAiInsight(insightData?.insight || null);
          setIsLoadingInsight(false);
        }
      } catch (error: any) {
        console.error('Error loading region data:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to load region data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadRegionData();
  }, [regionCode, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading region data...</p>
        </div>
      </div>
    );
  }

  if (!regionData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Region Not Found</h1>
          <p className="text-muted-foreground">The region you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Region Details</h1>
            <p className="text-sm text-muted-foreground">Climate inequality analysis for {regionData.region_name}</p>
          </div>
        </div>

        <RegionDetails
          data={regionData}
          aiInsight={aiInsight}
          isLoadingInsight={isLoadingInsight}
        />
      </div>
    </div>
  );
}
