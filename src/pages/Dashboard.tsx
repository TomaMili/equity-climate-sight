import { useState, useEffect } from 'react';
import { MapContainer } from '@/components/Map/MapContainer';
import { MapLegend } from '@/components/Map/MapLegend';
import { RegionDetails } from '@/components/Sidebar/RegionDetails';
import { StatisticsPanel } from '@/components/Sidebar/StatisticsPanel';
import { AnalyticsDashboard } from '@/components/Analytics/AnalyticsDashboard';
import { SidebarSkeleton } from '@/components/Sidebar/SidebarSkeleton';
import { CompactInitProgress } from '@/components/Admin/CompactInitProgress';
import { SearchFilters, FilterState } from '@/components/Search/SearchFilters';

import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, BarChart3, GitCompare, Home, ChevronRight } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useBookmarks } from '@/hooks/useBookmarks';
import { useRecentRegions } from '@/hooks/useRecentRegions';
import RegionComparison from '@/components/Comparison/RegionComparison';

// LocalStorage key for Mapbox token
const MAPBOX_TOKEN_KEY = 'ai-equity-mapper-mapbox-token';

const Index = () => {
  const [selectedRegion, setSelectedRegion] = useState<any>(null);
  const [selectedH3Index, setSelectedH3Index] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [mapboxToken, setMapboxToken] = useState('');
  const [isTokenSet, setIsTokenSet] = useState(false);
  
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<'countries' | 'regions'>('countries');
  const [year, setYear] = useState<number>(2024);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    ciiRange: [0, 100],
    populationRange: [0, 500000000],
    dataQuality: 'all'
  });
  const [filteredCount, setFilteredCount] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [compareRegions, setCompareRegions] = useState<string[]>([]);
  const [currentCountry, setCurrentCountry] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { bookmarks, toggleBookmark, isBookmarked } = useBookmarks();
  const { recentRegions, addRecentRegion } = useRecentRegions();

// Load token from localStorage on mount
useEffect(() => {
  const savedToken = localStorage.getItem(MAPBOX_TOKEN_KEY);
  if (savedToken) {
    setMapboxToken(savedToken);
    setIsTokenSet(true);
    console.log('Loaded Mapbox token from localStorage');
  }
}, []);

// Auto-initialize data if the table is empty
useEffect(() => {
  const checkAndInitializeData = async () => {
    try {
      const { data, error } = await supabase
        .from('climate_inequality_regions')
        .select('region_code')
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        setIsInitializing(true);
        toast({
          title: 'Initializing Database',
          description: 'Loading global climate data for 100+ countries and regions (2020-2025)...',
        });

        // Initialize countries first, then regions
        const { error: countriesError } = await supabase.functions.invoke('initialize-countries');
        if (countriesError) throw countriesError;

        const { error: regionsError } = await supabase.functions.invoke('initialize-regions');
        if (regionsError) throw regionsError;

        setIsInitializing(false);
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Error initializing data:', error);
      setIsInitializing(false);
    }
  };

  checkAndInitializeData();
}, [toast]);

// Ensure coverage for the selected year (if user switches years)
useEffect(() => {
  const ensureYearData = async () => {
    try {
      const { count, error } = await supabase
        .from('climate_inequality_regions')
        .select('id', { count: 'exact', head: true })
        .eq('data_year', year);

      if (error) throw error;

      if ((count ?? 0) === 0) {
        setIsInitializing(true);
        toast({ title: 'Preparing Year Data', description: `Generating data for ${year}...` });
        
        // Initialize countries first, then regions
        const { error: countriesError } = await supabase.functions.invoke('initialize-countries');
        if (countriesError) throw countriesError;

        const { error: regionsError } = await supabase.functions.invoke('initialize-regions');
        if (regionsError) throw regionsError;
        
        setIsInitializing(false);
        window.location.reload();
      }
    } catch (err) {
      console.error('Year data check failed:', err);
      setIsInitializing(false);
    }
  };

  ensureYearData();
}, [year, toast]);

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
    // If clicking a country and not in drill-down mode, drill down to show its regions
    if (data.region_type === 'country' && !currentCountry && !compareMode) {
      setCurrentCountry(data.region_name);
      setViewMode('regions');
      toast({
        title: 'Viewing Regions',
        description: `Showing regions in ${data.region_name}`,
      });
      return;
    }

    // If in compare mode, toggle region in comparison
    if (compareMode) {
      const regionId = data.id;
      setCompareRegions(prev => {
        if (prev.includes(regionId)) {
          return prev.filter(id => id !== regionId);
        } else if (prev.length < 4) {
          toast({
            title: 'Region Added',
            description: `${data.region_name} added to comparison (${prev.length + 1}/4)`,
          });
          return [...prev, regionId];
        } else {
          toast({
            title: 'Maximum Reached',
            description: 'You can compare up to 4 regions at once',
            variant: 'destructive',
          });
          return prev;
        }
      });
      return;
    }

    // Normal mode - show region details
    setSelectedRegion(data);
    setSelectedH3Index(data.region_code);
    setAiInsight(null);
    setIsLoadingInsight(true);

    // Add to recent regions
    addRecentRegion(data.region_code, data.region_name, data.country);

    try {
      // Sanitize data before sending to edge function
      const sanitizeNumber = (value: any) => {
        if (value === null || value === undefined) return null;
        const num = Number(value);
        return isNaN(num) ? null : num;
      };

      const regionDataForInsight = {
        ...data,
        // Ensure numeric fields are properly formatted
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

      const { data: insightData, error } = await supabase.functions.invoke('generate-insights', {
        body: { regionData: regionDataForInsight }
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

  const handleRemoveCompareRegion = (regionId: string) => {
    setCompareRegions(prev => prev.filter(id => id !== regionId));
  };

  const handleCloseComparison = () => {
    setCompareMode(false);
    setCompareRegions([]);
  };

  const handleBookmarkClick = async (regionCode: string) => {
    try {
      const { data, error } = await supabase
        .from('climate_inequality_regions')
        .select('*')
        .eq('region_code', regionCode)
        .eq('data_year', year)
        .single();

      if (error) throw error;
      if (data) handleRegionClick(data);
    } catch (error) {
      console.error('Error loading bookmarked region:', error);
    }
  };

  const handleRecentClick = async (regionCode: string) => {
    try {
      const { data, error } = await supabase
        .from('climate_inequality_regions')
        .select('*')
        .eq('region_code', regionCode)
        .eq('data_year', year)
        .single();

      if (error) throw error;
      if (data) handleRegionClick(data);
    } catch (error) {
      console.error('Error loading recent region:', error);
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
              {isInitializing ? 'Preparing data...' : 'Launch Map'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary title="Application Error">
      <div className="flex h-full w-full bg-background">
        {/* Sidebar */}
        <div className="w-96 bg-card border-r border-border overflow-y-auto">
          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">AI Equity Mapper</h1>
              <p className="text-sm text-muted-foreground">
                Team NOPE - hAIckathon 2025
              </p>
            </div>

            {!isMapLoaded || isInitializing ? (
              <SidebarSkeleton />
            ) : (
              <>
                {/* Breadcrumb Navigation */}
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        onClick={() => {
                          setCurrentCountry(null);
                          setViewMode('countries');
                          setSelectedRegion(null);
                        }}
                        className="flex items-center gap-1 cursor-pointer"
                      >
                        <Home className="h-3 w-3" />
                        All Countries
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {currentCountry && (
                      <>
                        <BreadcrumbSeparator>
                          <ChevronRight className="h-4 w-4" />
                        </BreadcrumbSeparator>
                        <BreadcrumbItem>
                          <BreadcrumbPage className="font-medium">
                            {currentCountry} Regions
                          </BreadcrumbPage>
                        </BreadcrumbItem>
                      </>
                    )}
                  </BreadcrumbList>
                </Breadcrumb>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant={viewMode === 'regions' && !currentCountry ? 'default' : 'outline'} 
                      onClick={() => {
                        setViewMode('regions');
                        setCurrentCountry(null);
                      }}
                      disabled={!!currentCountry}
                    >
                      Regions
                    </Button>
                    <Button 
                      size="sm" 
                      variant={viewMode === 'countries' && !currentCountry ? 'default' : 'outline'} 
                      onClick={() => {
                        setViewMode('countries');
                        setCurrentCountry(null);
                      }}
                      disabled={!!currentCountry}
                    >
                      Countries
                    </Button>
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

                {/* Search and Filters */}
                <ErrorBoundary title="Search Error">
                  <SearchFilters
                    onFilterChange={setFilters}
                    onBookmarkClick={handleBookmarkClick}
                    onRecentClick={handleRecentClick}
                    bookmarks={bookmarks}
                    recentRegions={recentRegions}
                    totalResults={filteredCount}
                    currentCountry={currentCountry}
                  />
                </ErrorBoundary>

                {/* Compare Button */}
                <Button
                  variant={compareMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setCompareMode(!compareMode);
                    if (compareMode) {
                      setCompareRegions([]);
                    }
                  }}
                  className="w-full"
                >
                  <GitCompare className="h-4 w-4 mr-2" />
                  {compareMode ? `Compare Mode (${compareRegions.length}/4)` : 'Compare Regions'}
                </Button>

                {/* Show comparison or regular content */}
                {compareMode && compareRegions.length > 0 ? (
                  <ErrorBoundary title="Comparison Error">
                    <RegionComparison
                      regionIds={compareRegions}
                      onRemoveRegion={handleRemoveCompareRegion}
                      onClose={handleCloseComparison}
                    />
                  </ErrorBoundary>
                ) : !compareMode ? (
                  <>
                    <ErrorBoundary title="Statistics Loading Error">
                      <StatisticsPanel 
                        viewMode={viewMode} 
                        year={year} 
                        currentCountry={currentCountry}
                      />
                    </ErrorBoundary>
                  </>
                ) : null}

                {/* Analytics Toggle */}
                <Collapsible open={showAnalytics} onOpenChange={setShowAnalytics}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between w-full p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Advanced Analytics</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showAnalytics ? 'rotate-180' : ''}`} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <ErrorBoundary title="Analytics Error">
                      <AnalyticsDashboard 
                        viewMode={viewMode} 
                        year={year} 
                        currentCountry={currentCountry}
                      />
                    </ErrorBoundary>
                  </CollapsibleContent>
                </Collapsible>

                {!compareMode && (
                  <ErrorBoundary title="Region Details Error">
                    <RegionDetails 
                      data={selectedRegion} 
                      aiInsight={aiInsight}
                      isLoadingInsight={isLoadingInsight}
                      isBookmarked={selectedRegion ? isBookmarked(selectedRegion.region_code) : false}
                      onToggleBookmark={() => selectedRegion && toggleBookmark(selectedRegion.region_code)}
                    />
                  </ErrorBoundary>
                )}
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
          {compareMode && (
            <div className="absolute top-4 left-4 z-10 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium shadow-lg">
              Click regions to add them to comparison ({compareRegions.length}/4)
            </div>
          )}
          <CompactInitProgress />
          <ErrorBoundary title="Map Visualization Error">
            <MapContainer
              onRegionClick={handleRegionClick} 
              selectedRegion={selectedH3Index}
              mapboxToken={mapboxToken}
              onTokenError={handleTokenError}
              onDataLoaded={handleMapDataLoaded}
              viewMode={viewMode}
              year={year}
              filters={filters}
              onFilteredCountChange={setFilteredCount}
              currentCountry={currentCountry}
            />
            <MapLegend />
          </ErrorBoundary>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Index;
