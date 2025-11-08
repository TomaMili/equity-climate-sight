import { useState, useEffect } from 'react';
import { MapContainer } from '@/components/Map/MapContainer';
import { MapLegend } from '@/components/Map/MapLegend';
import { RegionDetails } from '@/components/Sidebar/RegionDetails';
import { StatisticsPanel } from '@/components/Sidebar/StatisticsPanel';
import { SidebarSkeleton } from '@/components/Sidebar/SidebarSkeleton';
import { DataRefresh } from '@/components/Admin/DataRefresh';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

// LocalStorage key for Mapbox token
const MAPBOX_TOKEN_KEY = 'ai-equity-mapper-mapbox-token';

const Index = () => {
  const [selectedRegion, setSelectedRegion] = useState<any>(null);
  const [selectedH3Index, setSelectedH3Index] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [mapboxToken, setMapboxToken] = useState('');
  const [isTokenSet, setIsTokenSet] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<'countries' | 'regions'>('regions');
  const [year, setYear] = useState<number>(2024);
  const { toast } = useToast();

// Load token from localStorage on mount
useEffect(() => {
  const savedToken = localStorage.getItem(MAPBOX_TOKEN_KEY);
  if (savedToken) {
    setMapboxToken(savedToken);
    setIsTokenSet(true);
    console.log('Loaded Mapbox token from localStorage');
  }
}, []);

  const handleTokenError = () => {
    setIsTokenSet(false);
    toast({
      title: 'Token Error',
      description: 'Please check your Mapbox token and try again',
      variant: 'destructive',
    });
  };

  const handleMapDataLoaded = () => {
    setIsMapLoaded(true);
  };

  const handleRegionClick = async (data: any) => {
    setSelectedRegion(data);
    setSelectedH3Index(data.region_code);
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
      // Save token to localStorage
      localStorage.setItem(MAPBOX_TOKEN_KEY, mapboxToken.trim());
      setIsTokenSet(true);
      toast({
        title: 'Mapbox Token Saved',
        description: 'Your token has been saved and the map is loading...',
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
                . Your token will be saved for future visits.
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
    <ErrorBoundary title="Application Error">
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

            {isMapLoaded ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant={viewMode === 'regions' ? 'default' : 'outline'} onClick={() => setViewMode('regions')}>Regions</Button>
                    <Button size="sm" variant={viewMode === 'countries' ? 'default' : 'outline'} onClick={() => setViewMode('countries')}>Countries</Button>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Year</label>
                    <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-full mt-1 bg-background border border-border rounded px-2 py-1 text-sm">
                      {[2020,2021,2022,2023,2024,2025].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <ErrorBoundary title="Statistics Loading Error">
                  <StatisticsPanel />
                </ErrorBoundary>

                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdmin(!showAdmin)}
                    className="w-full justify-between text-sm"
                  >
                    <span>Data Management</span>
                    {showAdmin ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                  
                  {showAdmin && (
                    <div className="mt-3">
                      <ErrorBoundary title="Data Refresh Error">
                        <DataRefresh />
                      </ErrorBoundary>
                    </div>
                  )}
                </div>

                <ErrorBoundary title="Region Details Error">
                  <RegionDetails 
                    data={selectedRegion} 
                    aiInsight={aiInsight}
                    isLoadingInsight={isLoadingInsight}
                  />
                </ErrorBoundary>
              </>
            )}

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
          <ErrorBoundary title="Map Visualization Error">
            <MapContainer 
              onRegionClick={handleRegionClick} 
              selectedRegion={selectedH3Index}
              mapboxToken={mapboxToken}
              onTokenError={handleTokenError}
              onDataLoaded={handleMapDataLoaded}
              viewMode={viewMode}
              year={year}
            />
            <MapLegend />
          </ErrorBoundary>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Index;
