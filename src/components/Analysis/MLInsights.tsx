import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  AlertTriangle, 
  Layers, 
  Network, 
  Lightbulb,
  Loader2 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { parseMarkdownBold } from '@/lib/markdownUtils';

interface MLInsightsProps {
  regionData: any;
  year: number;
}

export function MLInsights({ regionData, year }: MLInsightsProps) {
  const [activeTab, setActiveTab] = useState<string>('trends');
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [insights, setInsights] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  const generateInsight = async (type: string, functionName: string, additionalData?: any) => {
    if (insights[type]) return; // Already loaded
    
    setLoading(prev => ({ ...prev, [type]: true }));
    try {
      const body: any = { regionData, year };
      if (additionalData) Object.assign(body, additionalData);

      const { data, error } = await supabase.functions.invoke(functionName, { body });

      if (error) {
        // Check for specific error types
        if (error.message?.includes('credits exhausted') || error.message?.includes('402')) {
          toast({
            title: '💳 AI Credits Exhausted',
            description: 'Please add credits to your Lovable workspace: Settings → Workspace → Usage',
            variant: 'destructive',
            duration: 8000,
          });
          return;
        }
        if (error.message?.includes('rate limit') || error.message?.includes('429')) {
          toast({
            title: '⏱️ Rate Limit Reached',
            description: 'Too many requests. Please wait a moment and try again.',
            variant: 'destructive',
            duration: 5000,
          });
          return;
        }
        throw error;
      }

      const resultKey = type === 'trends' ? 'prediction' : 
                       type === 'anomalies' ? 'anomalies' :
                       type === 'clusters' ? 'clusters' :
                       type === 'patterns' ? 'patterns' : 'recommendations';

      setInsights(prev => ({ ...prev, [type]: data[resultKey] }));
    } catch (error: any) {
      console.error(`Error generating ${type}:`, error);
      toast({
        title: 'Analysis Error',
        description: error.message || `Failed to generate ${type} analysis`,
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const fetchComparativeData = async () => {
    const { data } = await supabase
      .from('climate_inequality_regions')
      .select('cii_score, gdp_per_capita, urban_population_percent')
      .eq('data_year', year)
      .eq('country', regionData.country);

    if (data && data.length > 0) {
      const avgCII = data.reduce((sum, r) => sum + r.cii_score, 0) / data.length;
      const avgGDP = data.reduce((sum, r) => sum + (r.gdp_per_capita || 0), 0) / data.length;
      const avgUrban = data.reduce((sum, r) => sum + (r.urban_population_percent || 0), 0) / data.length;
      return { avgCII, avgGDP, avgUrban };
    }
    return null;
  };

  const fetchSimilarRegions = async () => {
    const { data } = await supabase
      .from('climate_inequality_regions')
      .select('*')
      .eq('data_year', year)
      .gte('cii_score', regionData.cii_score - 0.1)
      .lte('cii_score', regionData.cii_score + 0.1)
      .neq('region_code', regionData.region_code)
      .limit(5);

    return data || [];
  };

  const fetchAllRegions = async () => {
    const { data } = await supabase
      .from('climate_inequality_regions')
      .select('*')
      .eq('data_year', year)
      .order('cii_score', { ascending: false })
      .limit(100);

    return data || [];
  };

  // Auto-load trends on mount
  useEffect(() => {
    if (!insights.trends && !loading.trends) {
      generateInsight('trends', 'ml-predict-trends');
    }
  }, [regionData]);

  const handleTabChange = async (value: string) => {
    setActiveTab(value);
    
    if (insights[value]) return; // Already loaded

    switch (value) {
      case 'trends':
        await generateInsight('trends', 'ml-predict-trends');
        break;
      case 'anomalies':
        const comparativeData = await fetchComparativeData();
        await generateInsight('anomalies', 'ml-detect-anomalies', { comparativeData });
        break;
      case 'clusters':
        const allRegionsData = await fetchAllRegions();
        await generateInsight('clusters', 'ml-find-clusters', { allRegionsData });
        break;
      case 'patterns':
        const similarRegionsData = await fetchSimilarRegions();
        await generateInsight('patterns', 'ml-find-patterns', { similarRegionsData });
        break;
      case 'recommendations':
        const successfulRegionsData = await fetchSimilarRegions(); // Could be enhanced to find actual success stories
        await generateInsight('recommendations', 'ml-recommend-interventions', { successfulRegionsData });
        break;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5 text-primary" />
          AI-Powered Analytics
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Advanced ML insights for {regionData.region_name}
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="trends" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="anomalies" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Anomalies
            </TabsTrigger>
            <TabsTrigger value="clusters" className="text-xs">
              <Layers className="h-3 w-3 mr-1" />
              Clusters
            </TabsTrigger>
            <TabsTrigger value="patterns" className="text-xs">
              <Network className="h-3 w-3 mr-1" />
              Patterns
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="text-xs">
              <Lightbulb className="h-3 w-3 mr-1" />
              Actions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="mt-4">
            <ScrollArea className="h-[400px] w-full pr-4">
              {loading.trends ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Forecasting 2025-2030 trends...</span>
                </div>
              ) : insights.trends ? (
                <div className="space-y-2">
                  <Badge variant="outline" className="mb-2">XGBoost Predictive Model</Badge>
                  <div 
                    className="text-sm whitespace-pre-wrap" 
                    dangerouslySetInnerHTML={{ __html: parseMarkdownBold(insights.trends) }}
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Click to load predictive trends</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="anomalies" className="mt-4">
            <ScrollArea className="h-[400px] w-full pr-4">
              {loading.anomalies ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Detecting anomalies...</span>
                </div>
              ) : insights.anomalies ? (
                <div className="space-y-2">
                  <Badge variant="outline" className="mb-2">Anomaly Detection AI</Badge>
                  <div 
                    className="text-sm whitespace-pre-wrap" 
                    dangerouslySetInnerHTML={{ __html: parseMarkdownBold(insights.anomalies) }}
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Click to detect unusual patterns</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="clusters" className="mt-4">
            <ScrollArea className="h-[400px] w-full pr-4">
              {loading.clusters ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Finding vulnerability hotspots...</span>
                </div>
              ) : insights.clusters ? (
                <div className="space-y-2">
                  <Badge variant="outline" className="mb-2">DBSCAN Clustering</Badge>
                  <div 
                    className="text-sm whitespace-pre-wrap" 
                    dangerouslySetInnerHTML={{ __html: parseMarkdownBold(insights.clusters) }}
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Click to identify vulnerability clusters</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="patterns" className="mt-4">
            <ScrollArea className="h-[400px] w-full pr-4">
              {loading.patterns ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Discovering hidden patterns...</span>
                </div>
              ) : insights.patterns ? (
                <div className="space-y-2">
                  <Badge variant="outline" className="mb-2">Pattern Recognition AI</Badge>
                  <div 
                    className="text-sm whitespace-pre-wrap" 
                    dangerouslySetInnerHTML={{ __html: parseMarkdownBold(insights.patterns) }}
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Network className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Click to find hidden correlations</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="recommendations" className="mt-4">
            <ScrollArea className="h-[400px] w-full pr-4">
              {loading.recommendations ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Generating recommendations...</span>
                </div>
              ) : insights.recommendations ? (
                <div className="space-y-2">
                  <Badge variant="outline" className="mb-2">Recommendation Engine</Badge>
                  <div 
                    className="text-sm whitespace-pre-wrap" 
                    dangerouslySetInnerHTML={{ __html: parseMarkdownBold(insights.recommendations) }}
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Click to get intervention recommendations</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
