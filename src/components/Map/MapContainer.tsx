import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapErrorFallback } from './MapErrorFallback';
import { MapLoadingSkeleton } from './MapLoadingSkeleton';
import { MapLoadingOverlay } from './MapLoadingOverlay';
import { FilterState } from '@/components/Search/SearchFilters';

interface MapContainerProps {
  onRegionClick: (data: any) => void;
  selectedRegion: string | null;
  mapboxToken: string;
  onTokenError?: () => void;
  onDataLoaded?: () => void;
  year?: number;
  filters?: FilterState;
  onFilteredCountChange?: (count: number) => void;
  currentCountry?: string | null;
}

export const MapContainer = ({ onRegionClick, selectedRegion, mapboxToken, onTokenError, onDataLoaded, year = 2024, filters, onFilteredCountChange, currentCountry = null }: MapContainerProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapError, setMapError] = useState<Error | null>(null);
  const [regionsData, setRegionsData] = useState<any>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // Load region data from backend FIRST, before map initialization
  useEffect(() => {
    const loadRegionData = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');

        const pageSize = 1000;
        let from = 0;
        let allRows: any[] = [];

        while (true) {
          const { data, error } = await supabase
            .from('climate_inequality_regions')
            .select('*')
            .eq('data_year', year)
            .range(from, from + pageSize - 1);

          if (error) throw error;

          const rows = data || [];
          allRows = allRows.concat(rows);

          if (rows.length < pageSize) break;
          from += pageSize;
        }

        // Convert to GeoJSON
        const features = allRows.map((item: any) => ({
          type: 'Feature',
          properties: {
            region_code: item.region_code,
            region_name: item.region_name,
            region_type: item.region_type,
            country: item.country,
            data_year: item.data_year,
            cii_score: item.cii_score,
            climate_risk_score: item.climate_risk_score,
            infrastructure_score: item.infrastructure_score,
            socioeconomic_score: item.socioeconomic_score,
            population: item.population,
            air_quality_pm25: item.air_quality_pm25,
            air_quality_no2: item.air_quality_no2,
            internet_speed_download: item.internet_speed_download,
            internet_speed_upload: item.internet_speed_upload,
            temperature_avg: item.temperature_avg,
            precipitation_avg: item.precipitation_avg,
            drought_index: item.drought_index,
            flood_risk_score: item.flood_risk_score,
            gdp_per_capita: item.gdp_per_capita,
            urban_population_percent: item.urban_population_percent,
            data_sources: item.data_sources,
          },
          geometry: item.geometry
        }));

        const geojsonData = {
          type: 'FeatureCollection',
          features: features
        };

        setRegionsData(geojsonData);
        setIsDataLoaded(true);
        console.log('Region data loaded:', features.length, 'features');
      } catch (error) {
        console.error('Error loading region data:', error);
        setMapError(error instanceof Error ? error : new Error('Failed to load region data'));
        setIsDataLoaded(true); // Still set to true to allow map to initialize
      }
    };

    loadRegionData();
  }, [year]);

  // Initialize map only after data is loaded and when token is available
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || !isDataLoaded) return;

    // Prevent re-initialization if map already exists
    if (map.current) return;

    try {
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [15, 45], // Central Europe
        zoom: 4,
        pitch: 0,
      });
    } catch (error) {
      console.error('Error initializing Mapbox:', error);
      setMapError(error instanceof Error ? error : new Error('Failed to initialize map'));
      return;
    }

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Error handler
    map.current.on('error', (e) => {
      console.error('Mapbox error:', e);
      setMapError(new Error(e.error?.message || 'Map loading error'));
    });

    map.current.on('load', () => {
      setIsLoaded(true);
      setMapError(null); // Clear any previous errors
      
        // Add source for all data
        if (map.current && regionsData) {
          map.current.addSource('regions', {
            type: 'geojson',
            data: regionsData
          });

          // Countries fill - always visible
          map.current.addLayer({
            id: 'country-fill',
            type: 'fill',
            source: 'regions',
            filter: ['==', ['get', 'region_type'], 'country'],
            paint: {
              'fill-color': [
                'interpolate',
                ['linear'],
                ['get', 'cii_score'],
                0, '#08519c',
                0.2, '#3182bd',
                0.3, '#6baed6',
                0.4, '#bdd7e7',
                0.5, '#eff3ff',
                0.6, '#fee5d9',
                0.7, '#fcae91',
                0.8, '#fb6a4a',
                0.9, '#de2d26',
                1, '#a50f15'
              ],
              'fill-opacity': 0.7
            }
          });

          map.current.addLayer({
            id: 'country-outline',
            type: 'line',
            source: 'regions',
            filter: ['==', ['get', 'region_type'], 'country'],
            paint: {
              'line-color': '#2b2b2b',
              'line-width': 1.5
            }
          });

          // Regions fill - only visible when drilling into a country
          map.current.addLayer({
            id: 'region-fill',
            type: 'fill',
            source: 'regions',
            filter: ['!=', ['get', 'region_type'], 'country'],
            paint: {
              'fill-color': [
                'interpolate',
                ['linear'],
                ['get', 'cii_score'],
                0, '#08519c',
                0.2, '#3182bd',
                0.3, '#6baed6',
                0.4, '#bdd7e7',
                0.5, '#eff3ff',
                0.6, '#fee5d9',
                0.7, '#fcae91',
                0.8, '#fb6a4a',
                0.9, '#de2d26',
                1, '#a50f15'
              ],
              'fill-opacity': 0.85
            },
            layout: {
              'visibility': 'none' // Start hidden
            }
          });

          map.current.addLayer({
            id: 'region-outline',
            type: 'line',
            source: 'regions',
            filter: ['!=', ['get', 'region_type'], 'country'],
            paint: {
              'line-color': [
                'case',
                ['==', ['get', 'region_code'], selectedRegion || ''],
                '#ffffff',
                '#444444'
              ],
              'line-width': [
                'case',
                ['==', ['get', 'region_code'], selectedRegion || ''],
                3,
                1
              ]
            },
            layout: {
              'visibility': 'none' // Start hidden
            }
          });

        // Click handlers
        map.current.on('click', 'region-fill', (e) => {
          if (e.features && e.features[0]) {
            onRegionClick(e.features[0].properties);
          }
        });
        map.current.on('click', 'country-fill', (e) => {
          if (e.features && e.features[0]) {
            onRegionClick(e.features[0].properties);
          }
        });

        // Hover cursor
        map.current.on('mouseenter', 'region-fill', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseenter', 'country-fill', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });

        // Create popup for hover tooltips
        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          className: 'map-tooltip'
        });

        // Add hover tooltips for regions
        map.current.on('mouseenter', 'region-fill', (e) => {
          if (!map.current || !e.features || !e.features[0]) return;
          
          const feature = e.features[0];
          const { region_name, country, cii_score } = feature.properties;
          
          popup
            .setLngLat(e.lngLat)
            .setHTML(`
              <div class="p-2">
                <div class="font-semibold text-sm">${region_name}</div>
                <div class="text-xs text-muted-foreground">${country}</div>
                <div class="text-xs mt-1">
                  <span class="font-medium">CII:</span> ${(cii_score * 100).toFixed(1)}%
                </div>
              </div>
            `)
            .addTo(map.current);
        });

        map.current.on('mouseleave', 'region-fill', () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = '';
            popup.remove();
          }
        });

        // Add hover tooltips for countries
        map.current.on('mouseenter', 'country-fill', (e) => {
          if (!map.current || !e.features || !e.features[0]) return;
          
          const feature = e.features[0];
          const { region_name, cii_score } = feature.properties;
          
          popup
            .setLngLat(e.lngLat)
            .setHTML(`
              <div class="p-2">
                <div class="font-semibold text-sm">${region_name}</div>
                <div class="text-xs mt-1">
                  <span class="font-medium">CII:</span> ${(cii_score * 100).toFixed(1)}%
                </div>
              </div>
            `)
            .addTo(map.current);
        });

        map.current.on('mouseleave', 'country-fill', () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = '';
            popup.remove();
          }
        });

        // Notify parent and mark map ready
        onDataLoaded && onDataLoaded();
        setIsMapReady(true);

      }
    });

    return () => {
      try {
        if (map.current) {
          map.current.remove();
          map.current = null;
        }
      } catch (error) {
        console.error('Error cleaning up map:', error);
      }
    };
  }, [mapboxToken, onRegionClick, isDataLoaded]); // Removed regionsData and selectedRegion from dependencies

  // Apply filters and update layer filters (not data source)
  useEffect(() => {
    if (map.current && isLoaded && regionsData && map.current.getSource('regions')) {
      if (!filters) return;
      
      // Build filter expressions for search, CII, population, and data quality
      const buildLayerFilter = (isRegionLayer: boolean) => {
        const conditions: any[] = [];
        
        // Base type filter
        if (isRegionLayer) {
          conditions.push(['!=', ['get', 'region_type'], 'country']);
          // When drilling into a country, filter regions by country (case-insensitive)
          if (currentCountry) {
            const cc = currentCountry.toLowerCase();
            conditions.push([
              'any',
              ['==', ['downcase', ['get', 'country']], cc],
              ['>=', ['index-of', cc, ['downcase', ['get', 'country']]], 0]
            ]);
          }
        } else {
          conditions.push(['==', ['get', 'region_type'], 'country']);
        }
        
        // Search query filter
        if (filters.searchQuery) {
          const query = filters.searchQuery.toLowerCase();
          conditions.push([
            'any',
            ['>=', ['index-of', query, ['downcase', ['get', 'region_name']]], 0],
            ['>=', ['index-of', query, ['downcase', ['get', 'country']]], 0]
          ]);
        }
        
        // CII score filter
        const ciiMin = filters.ciiRange[0] / 100;
        const ciiMax = filters.ciiRange[1] / 100;
        if (ciiMin > 0 || ciiMax < 1) {
          conditions.push(['>=', ['get', 'cii_score'], ciiMin]);
          conditions.push(['<=', ['get', 'cii_score'], ciiMax]);
        }
        
        // Population filter
        if (filters.populationRange[0] > 0 || filters.populationRange[1] < 500000000) {
          conditions.push([
            'all',
            ['has', 'population'],
            ['>=', ['get', 'population'], filters.populationRange[0]],
            ['<=', ['get', 'population'], filters.populationRange[1]]
          ]);
        }
        
        return ['all', ...conditions];
      };
      
      // Apply filters to layers
      if (map.current.getLayer('country-fill')) {
        map.current.setFilter('country-fill', buildLayerFilter(false));
      }
      if (map.current.getLayer('country-outline')) {
        map.current.setFilter('country-outline', buildLayerFilter(false));
      }
      if (map.current.getLayer('region-fill')) {
        map.current.setFilter('region-fill', buildLayerFilter(true));
      }
      if (map.current.getLayer('region-outline')) {
        map.current.setFilter('region-outline', buildLayerFilter(true));
      }
      
      // Count filtered features for display
      const countFiltered = () => {
        if (!regionsData) return 0;
        return regionsData.features.filter((feature: any) => {
          const props = feature.properties;
          
          // Type filter based on drill-down
          if (currentCountry) {
            if (props.region_type === 'country') return false;
            if (props.country !== currentCountry) return false;
          }
          
          // Search query
          if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            if (!props.region_name.toLowerCase().includes(query) && 
                !props.country.toLowerCase().includes(query)) {
              return false;
            }
          }
          
          // CII score
          const ciiPercent = (props.cii_score || 0) * 100;
          if (ciiPercent < filters.ciiRange[0] || ciiPercent > filters.ciiRange[1]) {
            return false;
          }
          
          // Population
          if (props.population !== null && props.population !== undefined) {
            if (props.population < filters.populationRange[0] || 
                props.population > filters.populationRange[1]) {
              return false;
            }
          }
          
          return true;
        }).length;
      };
      
      onFilteredCountChange?.(countFiltered());
      console.log('Applied layer filters, showing:', countFiltered(), 'features');
    }
  }, [regionsData, isLoaded, filters, currentCountry]);

  // Update region layer visibility when drilling into a country
  useEffect(() => {
    if (!map.current || !isLoaded || !map.current.isStyleLoaded()) return;
    
    const regionVis = currentCountry ? 'visible' : 'none';
    if (map.current.getLayer('region-fill')) {
      map.current.setLayoutProperty('region-fill', 'visibility', regionVis);
    }
    if (map.current.getLayer('region-outline')) {
      map.current.setLayoutProperty('region-outline', 'visibility', regionVis);
    }
  }, [currentCountry, isLoaded]);

  // Dim non-selected countries and highlight selected
  useEffect(() => {
    if (!map.current || !isLoaded || !map.current.isStyleLoaded()) return;

    // Adjust fill opacity
    if (map.current.getLayer('country-fill')) {
      if (currentCountry) {
        const cc = currentCountry.toLowerCase();
        map.current.setPaintProperty('country-fill', 'fill-opacity', [
          'case',
          ['==', ['downcase', ['get', 'country']], cc], 0.8,
          0.25
        ]);
      } else {
        map.current.setPaintProperty('country-fill', 'fill-opacity', 0.7);
      }
    }

    // Adjust outline for highlight
    if (map.current.getLayer('country-outline')) {
      if (currentCountry) {
        const cc = currentCountry.toLowerCase();
        map.current.setPaintProperty('country-outline', 'line-color', [
          'case',
          ['==', ['downcase', ['get', 'country']], cc], '#ffffff',
          '#2b2b2b'
        ]);
        map.current.setPaintProperty('country-outline', 'line-width', [
          'case',
          ['==', ['downcase', ['get', 'country']], cc], 3,
          1.5
        ]);
      } else {
        map.current.setPaintProperty('country-outline', 'line-color', '#2b2b2b');
        map.current.setPaintProperty('country-outline', 'line-width', 1.5);
      }
    }
  }, [currentCountry, isLoaded]);

  // Update selected region outline
  useEffect(() => {
    if (map.current && isLoaded && map.current.isStyleLoaded() && map.current.getLayer('region-outline')) {
      map.current.setPaintProperty('region-outline', 'line-color', [
        'case',
        ['==', ['get', 'region_code'], selectedRegion || ''],
        '#ffffff',
        '#333333'
      ]);
      map.current.setPaintProperty('region-outline', 'line-width', [
        'case',
        ['==', ['get', 'region_code'], selectedRegion || ''],
        3,
        1
      ]);
    }
  }, [selectedRegion, isLoaded]);

  const handleRetry = () => {
    setMapError(null);
    setIsLoaded(false);
    if (map.current) {
      try {
        map.current.remove();
      } catch (e) {
        console.error('Error removing map:', e);
      }
      map.current = null;
    }
  };

  const handleChangeToken = () => {
    if (onTokenError) {
      onTokenError();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Show loading skeleton while map is initializing */}
      {!isMapReady && !mapError && <MapLoadingSkeleton />}
      
      {/* Show loading overlay for data */}
      {!isDataLoaded && !mapError && <MapLoadingOverlay />}
      
      {/* Show error fallback if there's an error */}
      {mapError && (
        <MapErrorFallback 
          error={mapError} 
          onRetry={handleRetry}
          onChangeToken={handleChangeToken}
        />
      )}
    </div>
  );
};