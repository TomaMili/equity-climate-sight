import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Region {
  id: string;
  region_name: string;
  country: string;
  cii_score: number;
  cii_climate_risk_component: number | null;
  cii_infrastructure_gap_component: number | null;
  cii_socioeconomic_vuln_component: number | null;
  cii_air_quality_component: number | null;
  population: number | null;
  gdp_per_capita: number | null;
  air_quality_pm25: number | null;
  temperature_avg: number | null;
}

interface RegionComparisonProps {
  regionIds: string[];
  onRemoveRegion: (id: string) => void;
  onClose: () => void;
}

const RegionComparison = ({ regionIds, onRemoveRegion, onClose }: RegionComparisonProps) => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRegions = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('climate_inequality_regions')
        .select('*')
        .in('id', regionIds);

      if (error) {
        console.error('Error fetching regions:', error);
        toast({
          title: "Error loading regions",
          description: "Failed to load comparison data",
          variant: "destructive"
        });
      } else if (data) {
        // Transform data_sources from string to array if needed
        const transformedData = data.map(region => ({
          ...region,
          data_sources: typeof region.data_sources === 'string' 
            ? JSON.parse(region.data_sources)
            : region.data_sources
        }));
        setRegions(transformedData);
      }
      setLoading(false);
    };

    if (regionIds.length > 0) {
      fetchRegions();
    }
  }, [regionIds]);

  useEffect(() => {
    const generateComparison = async () => {
      if (regions.length < 2) return;

      setAiLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('compare-regions', {
          body: { regions }
        });

        if (error) throw error;
        if (data?.insight) {
          setAiInsight(data.insight);
        }
      } catch (error: any) {
        console.error('Error generating comparison:', error);
        toast({
          title: "AI Analysis Unavailable",
          description: error.message || "Failed to generate comparative insights",
          variant: "destructive"
        });
      } finally {
        setAiLoading(false);
      }
    };

    generateComparison();
  }, [regions]);

  if (loading) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading comparison...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (regions.length === 0) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Select regions to compare (2-4 regions)
          </p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for CII components comparison
  const componentData = [
    {
      component: 'Climate Risk',
      ...Object.fromEntries(regions.map(r => [r.region_name.substring(0, 15), (r.cii_climate_risk_component || 0) * 100]))
    },
    {
      component: 'Infrastructure',
      ...Object.fromEntries(regions.map(r => [r.region_name.substring(0, 15), (r.cii_infrastructure_gap_component || 0) * 100]))
    },
    {
      component: 'Socioeconomic',
      ...Object.fromEntries(regions.map(r => [r.region_name.substring(0, 15), (r.cii_socioeconomic_vuln_component || 0) * 100]))
    },
    {
      component: 'Air Quality',
      ...Object.fromEntries(regions.map(r => [r.region_name.substring(0, 15), (r.cii_air_quality_component || 0) * 100]))
    }
  ];

  // Prepare radar chart data
  const radarData = [
    {
      metric: 'Climate',
      ...Object.fromEntries(regions.map(r => [r.region_name.substring(0, 15), (r.cii_climate_risk_component || 0) * 100]))
    },
    {
      metric: 'Infrastructure',
      ...Object.fromEntries(regions.map(r => [r.region_name.substring(0, 15), (r.cii_infrastructure_gap_component || 0) * 100]))
    },
    {
      metric: 'Socioeconomic',
      ...Object.fromEntries(regions.map(r => [r.region_name.substring(0, 15), (r.cii_socioeconomic_vuln_component || 0) * 100]))
    },
    {
      metric: 'Air Quality',
      ...Object.fromEntries(regions.map(r => [r.region_name.substring(0, 15), (r.cii_air_quality_component || 0) * 100]))
    }
  ];

  const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  return (
    <div className="space-y-4">
      <Card className="border-border/40 bg-card/50 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Region Comparison</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Region Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {regions.map((region, idx) => (
              <Card key={region.id} className="relative border-border/40">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-6 w-6 p-0"
                  onClick={() => onRemoveRegion(region.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
                <CardContent className="pt-6 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[idx] }} />
                    <h3 className="font-medium text-sm truncate">{region.region_name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{region.country}</p>
                  <div className="pt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">CII Score:</span>
                      <span className="font-medium">{(region.cii_score * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Population:</span>
                      <span className="font-medium">{region.population?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">GDP/capita:</span>
                      <span className="font-medium">${region.gdp_per_capita?.toFixed(0) || 'N/A'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CII Components Bar Chart */}
          <div>
            <h3 className="text-sm font-medium mb-4">CII Component Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={componentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="component" tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                {regions.map((region, idx) => (
                  <Bar
                    key={region.id}
                    dataKey={region.region_name.substring(0, 15)}
                    fill={colors[idx]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar Chart */}
          <div>
            <h3 className="text-sm font-medium mb-4">Vulnerability Profile</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
                <PolarRadiusAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                {regions.map((region, idx) => (
                  <Radar
                    key={region.id}
                    name={region.region_name.substring(0, 15)}
                    dataKey={region.region_name.substring(0, 15)}
                    stroke={colors[idx]}
                    fill={colors[idx]}
                    fillOpacity={0.3}
                  />
                ))}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* AI Comparative Insights */}
          <Card className="border-border/40 bg-background/50">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                AI Comparative Analysis
                {aiLoading && <Loader2 className="h-3 w-3 animate-spin" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aiLoading ? (
                <p className="text-xs text-muted-foreground">Generating comparative insights...</p>
              ) : aiInsight ? (
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">{aiInsight}</p>
              ) : (
                <p className="text-xs text-muted-foreground">No insights available</p>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegionComparison;
