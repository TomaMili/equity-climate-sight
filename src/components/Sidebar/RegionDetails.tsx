import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

interface RegionDetailsProps {
  data: any | null;
  aiInsight: string | null;
  isLoadingInsight: boolean;
}

export const RegionDetails = ({ data, aiInsight, isLoadingInsight }: RegionDetailsProps) => {
  if (!data) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">
          Click on a region to view details
        </p>
      </Card>
    );
  }

  const getRiskLevel = (score: number) => {
    if (score < 0.3) return { label: 'Low', variant: 'default' as const };
    if (score < 0.5) return { label: 'Low-Medium', variant: 'secondary' as const };
    if (score < 0.7) return { label: 'Medium', variant: 'default' as const };
    if (score < 0.9) return { label: 'High', variant: 'destructive' as const };
    return { label: 'Critical', variant: 'destructive' as const };
  };

  const ciiLevel = getRiskLevel(data.cii_score);

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-foreground mb-1">
          {data.region_name || 'Unknown Region'}
        </h2>
        <p className="text-muted-foreground mb-4">{data.country || 'Unknown Country'}</p>
        
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">CII Score:</span>
          <span className="text-2xl font-bold text-foreground">{data.cii_score.toFixed(2)}</span>
          <Badge variant={ciiLevel.variant}>{ciiLevel.label}</Badge>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Climate Risk</p>
            <p className="text-lg font-semibold text-foreground">
              {data.climate_risk_score?.toFixed(2) || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Infrastructure</p>
            <p className="text-lg font-semibold text-foreground">
              {data.infrastructure_score?.toFixed(2) || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Socioeconomic</p>
            <p className="text-lg font-semibold text-foreground">
              {data.socioeconomic_score?.toFixed(2) || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Population</p>
            <p className="text-lg font-semibold text-foreground">
              {data.population?.toLocaleString() || 'N/A'}
            </p>
          </div>
        </div>

        {(data.air_quality_pm25 || data.internet_connectivity_mbps) && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              {data.air_quality_pm25 && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Air Quality (PM2.5)</span>
                  <span className="text-sm font-medium text-foreground">{data.air_quality_pm25} µg/m³</span>
                </div>
              )}
              {data.internet_connectivity_mbps && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Internet Speed</span>
                  <span className="text-sm font-medium text-foreground">{data.internet_connectivity_mbps} Mbps</span>
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      <Card className="p-6 bg-accent/50">
        <div className="flex items-start gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-bold text-primary">AI</span>
          </div>
          <h3 className="text-sm font-semibold text-foreground">AI Analysis</h3>
        </div>
        {isLoadingInsight ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Generating insights...</span>
          </div>
        ) : aiInsight ? (
          <p className="text-sm text-foreground leading-relaxed">{aiInsight}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No AI insight available</p>
        )}
      </Card>
    </div>
  );
};