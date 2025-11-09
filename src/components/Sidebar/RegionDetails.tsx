import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Bookmark, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import CIIBreakdown from './CIIBreakdown';

interface RegionDetailsProps {
  data: any | null;
  aiInsight: string | null;
  isLoadingInsight: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
}

export const RegionDetails = ({ data, aiInsight, isLoadingInsight, isBookmarked = false, onToggleBookmark }: RegionDetailsProps) => {
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
      {/* AI Analysis - Featured First for Prominence */}
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-accent/5 to-background shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/20">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  AI Climate Equity Analysis
                  {!isLoadingInsight && aiInsight && (
                    <Badge variant="secondary" className="text-xs">
                      Powered by Gemini 2.5
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Expert assessment of climate vulnerability
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoadingInsight ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                <span>Analyzing regional climate inequality factors...</span>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : aiInsight ? (
            <div className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                  {aiInsight}
                </p>
              </div>
              
              {/* Key Indicators */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                {data.cii_score >= 0.7 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Critical Risk
                  </Badge>
                )}
                {data.air_quality_pm25 && data.air_quality_pm25 > 35 && (
                  <Badge variant="destructive" className="gap-1">
                    Hazardous Air Quality
                  </Badge>
                )}
                {data.flood_risk_score && data.flood_risk_score > 0.7 && (
                  <Badge variant="destructive" className="gap-1">
                    High Flood Risk
                  </Badge>
                )}
                {data.gdp_per_capita && data.gdp_per_capita < 5000 && (
                  <Badge variant="outline" className="gap-1">
                    Low-Income Region
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2">
                <TrendingUp className="h-3 w-3" />
                <span>Analysis based on {data.data_year || 2024} data from multiple sources</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">No AI analysis available</p>
              <p className="text-xs text-muted-foreground mt-1">Select a region to generate insights</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Region Overview */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground mb-1">
              {data.region_name || 'Unknown Region'}
            </h2>
            <p className="text-muted-foreground">{data.country || 'Unknown Country'}</p>
          </div>
          {onToggleBookmark && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleBookmark}
              className="shrink-0"
            >
              <Bookmark
                className={`w-4 h-4 ${isBookmarked ? 'fill-current text-primary' : ''}`}
              />
            </Button>
          )}
        </div>
        
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
            {data.air_quality_no2 && (
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">NO₂ Levels</span>
                <span className="text-sm font-medium text-foreground">{data.air_quality_no2} µg/m³</span>
              </div>
            )}
            {data.internet_speed_download && (
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Internet (Down)</span>
                <span className="text-sm font-medium text-foreground">{data.internet_speed_download} Mbps</span>
              </div>
            )}
            {data.temperature_avg && (
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Avg Temperature</span>
                <span className="text-sm font-medium text-foreground">{data.temperature_avg}°C</span>
              </div>
            )}
            {data.drought_index && (
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Drought Index</span>
                <span className="text-sm font-medium text-foreground">{data.drought_index}</span>
              </div>
            )}
          </div>
          </>
        )}
      </Card>

      <CIIBreakdown 
        climateRisk={data.cii_climate_risk_component}
        infrastructureGap={data.cii_infrastructure_gap_component}
        socioeconomicVuln={data.cii_socioeconomic_vuln_component}
        airQuality={data.cii_air_quality_component}
      />
    </div>
  );
};