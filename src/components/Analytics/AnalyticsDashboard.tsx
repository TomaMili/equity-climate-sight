import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Globe, BarChart3, Award } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AnalyticsDashboardProps {
  viewMode: 'countries' | 'regions';
  year: number;
  currentCountry?: string | null;
}

const COLORS = ['#08519c', '#3182bd', '#6baed6', '#bdd7e7', '#fb6a4a', '#de2d26', '#a50f15'];

export const AnalyticsDashboard = ({ viewMode, year, currentCountry }: AnalyticsDashboardProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [countryAggregates, setCountryAggregates] = useState<any[]>([]);
  const [topRegions, setTopRegions] = useState<any[]>([]);
  const [bottomRegions, setBottomRegions] = useState<any[]>([]);
  const [ciiDistribution, setCiiDistribution] = useState<any[]>([]);
  const [componentDistribution, setComponentDistribution] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, [viewMode, year, currentCountry]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Fetch all region data
      let query = supabase
        .from('climate_inequality_regions')
        .select('*')
        .eq('data_year', year)
        .eq('region_type', viewMode === 'countries' ? 'country' : 'region');

      // Filter by current country if drilling down
      if (currentCountry) {
        query = query.eq('country', currentCountry);
      }

      const { data: regions, error } = await query;

      if (error) throw error;
      if (!regions || regions.length === 0) {
        setIsLoading(false);
        return;
      }

      // Calculate global statistics
      const avgCII = regions.reduce((sum, r) => sum + r.cii_score, 0) / regions.length;
      const avgClimate = regions.reduce((sum, r) => sum + (r.climate_risk_score || 0), 0) / regions.length;
      const avgInfra = regions.reduce((sum, r) => sum + (r.infrastructure_score || 0), 0) / regions.length;
      const avgSocio = regions.reduce((sum, r) => sum + (r.socioeconomic_score || 0), 0) / regions.length;
      
      setGlobalStats({
        avgCII,
        avgClimate,
        avgInfra,
        avgSocio,
        total: regions.length,
        highRisk: regions.filter(r => r.cii_score >= 0.7).length,
        critical: regions.filter(r => r.cii_score >= 0.9).length
      });

      // Country-level aggregates (for regions view mode)
      if (viewMode === 'regions') {
        const countryMap = new Map();
        regions.forEach(region => {
          if (!countryMap.has(region.country)) {
            countryMap.set(region.country, {
              country: region.country,
              count: 0,
              totalCII: 0,
              totalPopulation: 0,
              highRiskCount: 0
            });
          }
          const countryData = countryMap.get(region.country);
          countryData.count++;
          countryData.totalCII += region.cii_score;
          countryData.totalPopulation += region.population || 0;
          if (region.cii_score >= 0.7) countryData.highRiskCount++;
        });

        const aggregates = Array.from(countryMap.values())
          .map(c => ({
            country: c.country,
            avgCII: c.totalCII / c.count,
            regions: c.count,
            population: c.totalPopulation,
            highRiskRegions: c.highRiskCount
          }))
          .sort((a, b) => b.avgCII - a.avgCII)
          .slice(0, 15);

        setCountryAggregates(aggregates);
      }

      // Top 10 and Bottom 10 regions
      const sorted = [...regions].sort((a, b) => b.cii_score - a.cii_score);
      setTopRegions(sorted.slice(0, 10).map(r => ({
        name: r.region_name.length > 20 ? r.region_name.substring(0, 20) + '...' : r.region_name,
        fullName: r.region_name,
        country: r.country,
        cii: r.cii_score,
        population: r.population
      })));
      setBottomRegions(sorted.slice(-10).reverse().map(r => ({
        name: r.region_name.length > 20 ? r.region_name.substring(0, 20) + '...' : r.region_name,
        fullName: r.region_name,
        country: r.country,
        cii: r.cii_score,
        population: r.population
      })));

      // CII Distribution (histogram bins)
      const bins = [
        { range: '0-10%', count: 0, min: 0, max: 0.1 },
        { range: '10-20%', count: 0, min: 0.1, max: 0.2 },
        { range: '20-30%', count: 0, min: 0.2, max: 0.3 },
        { range: '30-40%', count: 0, min: 0.3, max: 0.4 },
        { range: '40-50%', count: 0, min: 0.4, max: 0.5 },
        { range: '50-60%', count: 0, min: 0.5, max: 0.6 },
        { range: '60-70%', count: 0, min: 0.6, max: 0.7 },
        { range: '70-80%', count: 0, min: 0.7, max: 0.8 },
        { range: '80-90%', count: 0, min: 0.8, max: 0.9 },
        { range: '90-100%', count: 0, min: 0.9, max: 1.0 }
      ];

      regions.forEach(r => {
        const bin = bins.find(b => r.cii_score >= b.min && r.cii_score < b.max);
        if (bin) bin.count++;
      });

      setCiiDistribution(bins);

      // Component distribution
      const components = [
        { name: 'Climate Risk', value: avgClimate * 100 },
        { name: 'Infrastructure Gap', value: avgInfra * 100 },
        { name: 'Socioeconomic Vuln', value: avgSocio * 100 }
      ];

      setComponentDistribution(components);

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Global Statistics */}
      {globalStats && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Global Overview ({year})</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Average CII</p>
              <p className="text-2xl font-bold text-foreground">{(globalStats.avgCII * 100).toFixed(1)}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Regions</p>
              <p className="text-2xl font-bold text-foreground">{globalStats.total}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">High Risk</p>
              <p className="text-2xl font-bold text-destructive">{globalStats.highRisk}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Critical</p>
              <p className="text-2xl font-bold text-destructive">{globalStats.critical}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs for different analytics views */}
      <Tabs defaultValue="distribution" className="w-full">
        <TabsList className={`grid w-full ${viewMode === 'regions' && !currentCountry ? 'grid-cols-3' : 'grid-cols-2'} bg-muted`}>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
          {viewMode === 'regions' && !currentCountry && <TabsTrigger value="countries">By Country</TabsTrigger>}
        </TabsList>

        {/* CII Distribution Tab */}
        <TabsContent value="distribution" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">CII Score Distribution</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ciiDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Component Distribution */}
          {componentDistribution.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Average Component Scores</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={componentDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {componentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}
        </TabsContent>

        {/* Rankings Tab */}
        <TabsContent value="rankings" className="space-y-4">
          {/* Top 10 Highest CII */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-destructive" />
              <h3 className="text-lg font-semibold text-foreground">Top 10 Highest CII</h3>
            </div>
            <div className="space-y-2">
              {topRegions.map((region, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive" className="w-8 h-8 flex items-center justify-center rounded-full">
                      {idx + 1}
                    </Badge>
                    <div>
                      <p className="font-medium text-foreground text-sm" title={region.fullName}>
                        {region.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{region.country}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-destructive">{(region.cii * 100).toFixed(1)}%</p>
                    {region.population && (
                      <p className="text-xs text-muted-foreground">
                        {(region.population / 1000000).toFixed(1)}M
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Bottom 10 Lowest CII */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-foreground">Top 10 Lowest CII</h3>
            </div>
            <div className="space-y-2">
              {bottomRegions.map((region, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="w-8 h-8 flex items-center justify-center rounded-full">
                      {idx + 1}
                    </Badge>
                    <div>
                      <p className="font-medium text-foreground text-sm" title={region.fullName}>
                        {region.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{region.country}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{(region.cii * 100).toFixed(1)}%</p>
                    {region.population && (
                      <p className="text-xs text-muted-foreground">
                        {(region.population / 1000000).toFixed(1)}M
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

      {/* Country Aggregates Tab (only for regions view without country drill-down) */}
        {viewMode === 'regions' && !currentCountry && (
          <TabsContent value="countries" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Countries by Average CII</h3>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={countryAggregates} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="country" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => [(value * 100).toFixed(1) + '%', 'Avg CII']}
                  />
                  <Bar dataKey="avgCII" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Country Statistics</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {countryAggregates.map((country, idx) => (
                  <div key={idx} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-foreground">{country.country}</p>
                      <Badge variant="outline">{(country.avgCII * 100).toFixed(1)}% CII</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div>
                        <p>Regions: {country.regions}</p>
                      </div>
                      <div>
                        <p>Population: {(country.population / 1000000).toFixed(1)}M</p>
                      </div>
                      <div>
                        <p>High Risk: {country.highRiskRegions}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};