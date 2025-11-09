import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Search, X, Bookmark, Clock, Filter } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';

export interface FilterState {
  searchQuery: string;
  ciiRange: [number, number];
  populationRange: [number, number];
  dataQuality: 'all' | 'real' | 'synthetic';
}

interface SearchFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  onBookmarkClick: (regionCode: string) => void;
  onRecentClick: (regionCode: string) => void;
  bookmarks: string[];
  recentRegions: Array<{ code: string; name: string; country: string }>;
  totalResults: number;
  currentCountry?: string | null;
}

export const SearchFilters = ({
  onFilterChange,
  onBookmarkClick,
  onRecentClick,
  bookmarks,
  recentRegions,
  totalResults,
  currentCountry
}: SearchFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    ciiRange: [0, 100],
    populationRange: [0, 500000000],
    dataQuality: 'all'
  });
  const [bookmarkedRegions, setBookmarkedRegions] = useState<any[]>([]);

  // Load bookmarked region details
  useEffect(() => {
    const loadBookmarkedRegions = async () => {
      if (bookmarks.length === 0) {
        setBookmarkedRegions([]);
        return;
      }

      try {
        let query = supabase
          .from('climate_inequality_regions')
          .select('region_code, region_name, country')
          .in('region_code', bookmarks)
          .limit(10);

        // Filter by current country if drilling down
        if (currentCountry) {
          query = query.eq('country', currentCountry);
        }

        const { data, error } = await query;

        if (error) throw error;
        setBookmarkedRegions(data || []);
      } catch (error) {
        console.error('Error loading bookmarks:', error);
      }
    };

    loadBookmarkedRegions();
  }, [bookmarks, currentCountry]);

  const updateFilter = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const defaultFilters: FilterState = {
      searchQuery: '',
      ciiRange: [0, 100],
      populationRange: [0, 500000000],
      dataQuality: 'all'
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const hasActiveFilters = 
    filters.searchQuery !== '' || 
    filters.ciiRange[0] !== 0 || 
    filters.ciiRange[1] !== 100 ||
    filters.populationRange[0] !== 0 ||
    filters.populationRange[1] !== 500000000 ||
    filters.dataQuality !== 'all';

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search regions or countries..."
          value={filters.searchQuery}
          onChange={(e) => updateFilter('searchQuery', e.target.value)}
          className="pl-10 bg-background"
        />
      </div>

      {/* Advanced Filters Toggle */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Advanced Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1">Active</Badge>
              )}
            </span>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4 pt-4">
          {/* CII Score Range */}
          <div className="space-y-2">
            <Label className="text-sm">
              CII Score: {filters.ciiRange[0]}% - {filters.ciiRange[1]}%
            </Label>
            <Slider
              value={filters.ciiRange}
              onValueChange={(value) => updateFilter('ciiRange', value)}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          {/* Population Range */}
          <div className="space-y-2">
            <Label className="text-sm">
              Population: {(filters.populationRange[0] / 1000000).toFixed(1)}M - {(filters.populationRange[1] / 1000000).toFixed(1)}M
            </Label>
            <Slider
              value={filters.populationRange}
              onValueChange={(value) => updateFilter('populationRange', value)}
              min={0}
              max={500000000}
              step={1000000}
              className="w-full"
            />
          </div>

          {/* Data Quality Filter */}
          <div className="space-y-2">
            <Label className="text-sm">Data Quality</Label>
            <div className="flex gap-2">
              <Button
                variant={filters.dataQuality === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFilter('dataQuality', 'all')}
                className="flex-1"
              >
                All
              </Button>
              <Button
                variant={filters.dataQuality === 'real' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFilter('dataQuality', 'real')}
                className="flex-1"
              >
                Real Data
              </Button>
              <Button
                variant={filters.dataQuality === 'synthetic' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFilter('dataQuality', 'synthetic')}
                className="flex-1"
              >
                Synthetic
              </Button>
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="w-full"
            >
              <X className="w-4 h-4 mr-2" />
              Clear All Filters
            </Button>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground text-center py-1">
        {totalResults.toLocaleString()} {currentCountry ? `regions in ${currentCountry}` : 'regions'} found
      </div>

      {/* Bookmarks Section */}
      {bookmarkedRegions.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Bookmark className="w-4 h-4" />
            Bookmarks
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {bookmarkedRegions.map((region) => (
              <button
                key={region.region_code}
                onClick={() => onBookmarkClick(region.region_code)}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-sm"
              >
                <div className="font-medium text-foreground">{region.region_name}</div>
                <div className="text-xs text-muted-foreground">{region.country}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Regions Section */}
      {recentRegions.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Clock className="w-4 h-4" />
            Recent
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {recentRegions.slice(0, 5).map((region) => (
              <button
                key={region.code}
                onClick={() => onRecentClick(region.code)}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-sm"
              >
                <div className="font-medium text-foreground">{region.name}</div>
                <div className="text-xs text-muted-foreground">{region.country}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};