import { useState } from 'react';
import { MapContainer } from '@/components/Map/MapContainer';
import { MapLegend } from '@/components/Map/MapLegend';
import { RegionDetails } from '@/components/Sidebar/RegionDetails';
import { StatisticsPanel } from '@/components/Sidebar/StatisticsPanel';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [selectedRegion, setSelectedRegion] = useState<any>(null);
  const [selectedH3Index, setSelectedH3Index] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [mapboxToken, setMapboxToken] = useState('');
  const [isTokenSet, setIsTokenSet] = useState(false);
  const { toast } = useToast();

  const handleRegionClick = async (data: any) => {
    setSelectedRegion(data);
    setSelectedH3Index(data.h3_index);
    setAiInsight(null);
    setIsLoadingInsight(true);

    try {
      const { data: insightData, error } = await supabase.functions.invoke('generate-insights', {
        body: { regionData: data }
      });

      if (error) throw error;

      setAiInsight(insightData?.insight || null);
    } catch (error: any) {
      console.error('Error generating AI insight:', error);
      toast({
        title: 'AI Insight Error',
        description: error.message || 'Failed to generate AI insight',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingInsight(false);
    }
  };

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mapboxToken.trim()) {
      setIsTokenSet(true);
      toast({
        title: 'Mapbox Token Set',
        description: 'Map is now loading...',
      });
    } else {
      toast({
        title: 'Token Required',
        description: 'Please enter your Mapbox public token',
        variant: 'destructive',
      });
    }
  };

  if (!isTokenSet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">AI Equity Mapper</h1>
            <p className="text-muted-foreground">
              Visualizing climate inequality with AI-powered insights
            </p>
          </div>
          <form onSubmit={handleTokenSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="mapbox-token" className="text-sm font-medium text-foreground">
                Enter your Mapbox Public Token
              </label>
              <Input
                id="mapbox-token"
                type="text"
                placeholder="pk.eyJ1..."
                value={mapboxToken}
                onChange={(e) => setMapboxToken(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Get your free token at{' '}
                <a
                  href="https://mapbox.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  mapbox.com
                </a>
              </p>
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition-colors"
            >
              Launch Map
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-96 bg-card border-r border-border overflow-y-auto">
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">AI Equity Mapper</h1>
            <p className="text-sm text-muted-foreground">
              Team NOPE - hAIckathon 2025
            </p>
          </div>

          <StatisticsPanel />
          <RegionDetails 
            data={selectedRegion} 
            aiInsight={aiInsight}
            isLoadingInsight={isLoadingInsight}
          />

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Data sources: OpenAQ, ERA5, Ookla, World Bank (ASDI)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              AI-powered by Lovable AI (Gemini 2.5 Flash)
            </p>
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        <MapContainer 
          onRegionClick={handleRegionClick} 
          selectedRegion={selectedH3Index}
          mapboxToken={mapboxToken}
        />
        <MapLegend />
      </div>
    </div>
  );
};

export default Index;
