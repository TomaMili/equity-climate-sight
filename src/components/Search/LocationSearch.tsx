import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';

interface LocationSearchProps {
  year: number;
  onLocationSelect: (region: any) => void;
  currentCountry?: string | null;
}

export function LocationSearch({ year, onLocationSelect, currentCountry }: LocationSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const searchLocations = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        let query = supabase
          .from('climate_inequality_regions')
          .select('*')
          .eq('data_year', year)
          .or(`region_name.ilike.%${searchQuery}%,country.ilike.%${searchQuery}%`)
          .order('cii_score', { ascending: false })
          .limit(10);

        if (currentCountry) {
          query = query.eq('country', currentCountry);
        }

        const { data, error } = await query;

        if (error) throw error;
        setSearchResults(data || []);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchLocations, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, year, currentCountry]);

  const handleSelect = (region: any) => {
    onLocationSelect(region);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-start text-left font-normal"
        >
          <Search className="mr-2 h-4 w-4 shrink-0" />
          <span className="text-muted-foreground">Search locations...</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search country or region..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isSearching ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : searchQuery.length < 2 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search
              </div>
            ) : searchResults.length === 0 ? (
              <CommandEmpty>No locations found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {searchResults.map((region) => (
                  <CommandItem
                    key={region.region_code}
                    value={region.region_code}
                    onSelect={() => handleSelect(region)}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{region.region_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {region.country} • CII: {(region.cii_score * 100).toFixed(1)}%
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
