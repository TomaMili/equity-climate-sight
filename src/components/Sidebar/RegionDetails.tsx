import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Bookmark, Sparkles, TrendingUp, AlertTriangle, Maximize2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import CIIBreakdown from './CIIBreakdown';
import { ExpandedAnalysis } from '@/components/Analysis/ExpandedAnalysis';
import { ShareButton } from '@/components/Share/ShareButton';
import { generateRegionShareUrl, generateRegionMetaTags } from '@/lib/shareUtils';
import { useShareMetaTags } from '@/hooks/useShareMetaTags';
import { DataQualityBadge } from '@/components/DataQuality/DataQualityBadge';
import { QuickEnrichButton } from '@/components/DataQuality/QuickEnrichButton';
import { supabase } from '@/integrations/supabase/client';

interface RegionDetailsProps {
  data: any | null;
  aiInsight: string | null;
  isLoadingInsight: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
}

const MAX_AI_CHARS = 280; // <- set your desired preview length

function truncateAtWord(text: string, max: number) {
  if (!text) return "";
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  const end = lastSpace > max * 0.6 ? lastSpace : max; // avoid cutting too early
  return slice.slice(0, end) + "…";
}

export const RegionDetails = ({ data, aiInsight, isLoadingInsight, isBookmarked = false, onToggleBookmark }: RegionDetailsProps) => {
  const [showExpandedAnalysis, setShowExpandedAnalysis] = useState(false);
  const [showAllStats, setShowAllStats] = useState(true); // Start open by default
  const [regionData, setRegionData] = useState(data);

  // Update local state when data prop changes
  useEffect(() => {
    setRegionData(data);
  }, [data]);

  const isTruncated = !!aiInsight && aiInsight.length > MAX_AI_CHARS;
  const insightPreview = useMemo(
    () => (aiInsight ? truncateAtWord(aiInsight, MAX_AI_CHARS) : ""),
    [aiInsight]
  );

  // Generate share metadata
  const shareMetaTags = useMemo(() => {
    if (!regionData) return null;
    return generateRegionMetaTags({
      id: regionData.id,
      region_name: regionData.region_name,
      country: regionData.country,
      cii_score: regionData.cii_score,
    });
  }, [regionData]);

  // Update meta tags for social sharing
  useShareMetaTags(shareMetaTags);

  const handleEnrichComplete = async () => {
    // Reload region data after enrichment
    if (!regionData) return;
    
    const { data: updatedData, error } = await supabase
      .from('climate_inequality_regions')
      .select('*')
      .eq('id', regionData.id)
      .single();

    if (!error && updatedData) {
      setRegionData(updatedData);
    }
  };

  if (!regionData) {
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

  const ciiLevel = getRiskLevel(regionData.cii_score);

  return (
    <div className="space-y-4">
      {/* Region Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex-1">
            <div className="flex items-start gap-2 mb-2">
              <h2 className="text-2xl font-bold text-foreground">
                {regionData.region_name || 'Unknown Region'}
              </h2>
              <DataQualityBadge dataSources={regionData.data_sources || []} />
            </div>
            <p className="text-muted-foreground">{regionData.country || 'Unknown Country'}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {regionData.data_sources?.includes('Synthetic') && (
              <QuickEnrichButton
                regionCode={regionData.region_code}
                regionName={regionData.region_name}
                year={regionData.data_year}
                variant="outline"
                size="sm"
                showLabel={true}
                onEnrichComplete={handleEnrichComplete}
              />
            )}
            <ShareButton
              url={generateRegionShareUrl(regionData)}
              title={shareMetaTags?.title || ''}
              description={shareMetaTags?.description || ''}
              variant="ghost"
              size="icon"
              showLabel={false}
            />
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
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Climate Inequality Index:</span>
          <span className="text-2xl font-bold text-foreground">{(regionData.cii_score * 100).toFixed(1)}%</span>
          <Badge variant={ciiLevel.variant}>{ciiLevel.label}</Badge>
        </div>
      </Card>

      {/* AI Insight - Prominent Display */}
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-accent/5 to-background shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">AI Climate Analysis</CardTitle>
              <CardDescription className="text-xs">Expert assessment powered by Gemini 2.5</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoadingInsight ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                  <span>Analyzing climate data...</span>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            ) : aiInsight ? (
              <div className="space-y-3">
                {/* Styled preview text */}
                <div className="rounded-md border border-border/60 bg-muted/40 p-3">
                  <p className="text-sm leading-6 text-foreground/90 whitespace-pre-line selection:bg-primary/20 selection:text-primary-foreground">
                    {isTruncated ? insightPreview : aiInsight}
                  </p>
                </div>

                {/* Keep your existing button; show it always, or only when truncated */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => setShowExpandedAnalysis(true)}
                >
                  <Maximize2 className="h-4 w-4" />
                  {isTruncated ? "View Detailed Analysis & Export" : "Open & Export"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                No AI analysis available
              </p>
            )}

        </CardContent>
      </Card>

      {/* All Statistics - Collapsible */}
      <Collapsible open={showAllStats} onOpenChange={setShowAllStats}>
        <Card className="p-6">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <h3 className="text-lg font-semibold text-foreground">All Statistics</h3>
              <ChevronDown className={`h-4 w-4 transition-transform ${showAllStats ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          
          {/* Key Stats Always Visible */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Climate Risk</p>
              <p className="text-lg font-semibold text-foreground">
                {regionData.climate_risk_score ? (regionData.climate_risk_score * 100).toFixed(1) + '%' : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Infrastructure</p>
              <p className="text-lg font-semibold text-foreground">
                {regionData.infrastructure_score ? (regionData.infrastructure_score * 100).toFixed(1) + '%' : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Socioeconomic</p>
              <p className="text-lg font-semibold text-foreground">
                {regionData.socioeconomic_score ? (regionData.socioeconomic_score * 100).toFixed(1) + '%' : 'N/A'}
              </p>
            </div>
            {regionData.region_type === 'country' && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Population</p>
                <p className="text-lg font-semibold text-foreground">
                  {regionData.population?.toLocaleString() || 'N/A'}
                </p>
              </div>
            )}
          </div>

          <CollapsibleContent className="mt-4 space-y-4">
            <Separator />
            
            {/* Environmental Data */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Environmental</h4>
              <div className="space-y-2">
                {regionData.air_quality_pm25 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">PM2.5 Air Quality</span>
                    <span className="text-sm font-medium text-foreground">{regionData.air_quality_pm25} µg/m³</span>
                  </div>
                )}
                {regionData.air_quality_no2 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">NO₂ Levels</span>
                    <span className="text-sm font-medium text-foreground">{regionData.air_quality_no2} µg/m³</span>
                  </div>
                )}
                {regionData.temperature_avg && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Average Temperature</span>
                    <span className="text-sm font-medium text-foreground">{regionData.temperature_avg.toFixed(1)}°C</span>
                  </div>
                )}
                {regionData.precipitation_avg && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Annual Precipitation</span>
                    <span className="text-sm font-medium text-foreground">{regionData.precipitation_avg.toFixed(0)} mm</span>
                  </div>
                )}
                {regionData.drought_index != null && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Drought Index</span>
                    <span className="text-sm font-medium text-foreground">{regionData.drought_index.toFixed(2)}</span>
                  </div>
                )}
                {regionData.flood_risk_score != null && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Flood Risk Score</span>
                    <span className="text-sm font-medium text-foreground">{(regionData.flood_risk_score * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Economic Data */}
            {(regionData.gdp_per_capita || regionData.urban_population_percent) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Economic & Social</h4>
                  <div className="space-y-2">
                    {regionData.gdp_per_capita && (
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">GDP per Capita</span>
                        <span className="text-sm font-medium text-foreground">${regionData.gdp_per_capita.toLocaleString()}</span>
                      </div>
                    )}
                    {regionData.urban_population_percent != null && (
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Urban Population</span>
                        <span className="text-sm font-medium text-foreground">{regionData.urban_population_percent.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Infrastructure Data */}
            {(regionData.internet_speed_download || regionData.internet_speed_upload) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Infrastructure</h4>
                  <div className="space-y-2">
                    {regionData.internet_speed_download && (
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Internet Download</span>
                        <span className="text-sm font-medium text-foreground">{regionData.internet_speed_download} Mbps</span>
                      </div>
                    )}
                    {regionData.internet_speed_upload && (
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Internet Upload</span>
                        <span className="text-sm font-medium text-foreground">{regionData.internet_speed_upload} Mbps</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Data Sources */}
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Data Sources</h4>
              <div className="flex flex-wrap gap-1">
                {(Array.isArray(regionData.data_sources) ? regionData.data_sources : []).map((source: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {source}
                  </Badge>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* CII Breakdown in Collapsible */}
      <CIIBreakdown 
        climateRisk={regionData.cii_climate_risk_component}
        infrastructureGap={regionData.cii_infrastructure_gap_component}
        socioeconomicVuln={regionData.cii_socioeconomic_vuln_component}
        airQuality={regionData.cii_air_quality_component}
      />

      {/* Expanded Analysis Modal */}
      <ExpandedAnalysis
        open={showExpandedAnalysis}
        onOpenChange={setShowExpandedAnalysis}
        regionData={regionData}
        basicInsight={aiInsight || ''}
      />
    </div>
  );
};