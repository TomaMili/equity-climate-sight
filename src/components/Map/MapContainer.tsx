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
  viewMode?: 'countries' | 'regions';
  year?: number;
  filters?: FilterState;
  onFilteredCountChange?: (count: number) => void;
}

export const MapContainer = ({ onRegionClick, selectedRegion, mapboxToken, onTokenError, onDataLoaded, viewMode = 'regions', year = 2024, filters, onFilteredCountChange }: MapContainerProps) => {
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
      
      // Add source for regions
      if (map.current && regionsData) {
        map.current.addSource('regions', {
          type: 'geojson',
          data: regionsData
        });

        // Countries fill (below)
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
            'fill-opacity': 0.6
          }
        });

        map.current.addLayer({
          id: 'country-outline',
          type: 'line',
          source: 'regions',
          filter: ['==', ['get', 'region_type'], 'country'],
          paint: {
            'line-color': '#2b2b2b',
            'line-width': 1
          }
        });

        // Regions fill (above)
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
            'fill-opacity': 0.8
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
              '#333333'
            ],
            'line-width': [
              'case',
              ['==', ['get', 'region_code'], selectedRegion || ''],
              3,
              1
            ]
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

        // Apply initial visibility based on viewMode
        const setVisibility = (mode: 'countries' | 'regions') => {
          if (!map.current) return;
          const regionVis = mode === 'regions' ? 'visible' : 'none';
          const countryVis = mode === 'countries' ? 'visible' : 'none';
          map.current.setLayoutProperty('region-fill', 'visibility', regionVis);
          map.current.setLayoutProperty('region-outline', 'visibility', regionVis);
          map.current.setLayoutProperty('country-fill', 'visibility', countryVis);
          map.current.setLayoutProperty('country-outline', 'visibility', countryVis);
        };
        setVisibility(viewMode);

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

  // Apply filters and update data source
  useEffect(() => {
    if (map.current && isLoaded && regionsData && map.current.getSource('regions')) {
      const source = map.current.getSource('regions') as mapboxgl.GeoJSONSource;
      if (source && filters) {
        // Apply filters
        const filteredFeatures = regionsData.features.filter((feature: any) => {
          const props = feature.properties;
          
          // Search query
          if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            if (!props.region_name.toLowerCase().includes(query) && 
                !props.country.toLowerCase().includes(query)) {
              return false;
            }
          }
          
          // CII score range
          const ciiPercent = (props.cii_score || 0) * 100;
          if (ciiPercent < filters.ciiRange[0] || ciiPercent > filters.ciiRange[1]) {
            return false;
          }
          
          // Population range
          if (props.population !== null && props.population !== undefined) {
            if (props.population < filters.populationRange[0] || 
                props.population > filters.populationRange[1]) {
              return false;
            }
          }
          
          // Data quality
          if (filters.dataQuality !== 'all') {
            const hasRealData = props.data_sources && 
                               Array.isArray(props.data_sources) && 
                               props.data_sources.some((s: string) => s !== 'Synthetic');
            const isSynthetic = !hasRealData;
            
            if (filters.dataQuality === 'real' && isSynthetic) return false;
            if (filters.dataQuality === 'synthetic' && !isSynthetic) return false;
          }
          
          return true;
        });

        const filteredGeoJSON: any = {
          type: 'FeatureCollection',
          features: filteredFeatures
        };

        source.setData(filteredGeoJSON);
        onFilteredCountChange?.(filteredFeatures.length);
        console.log('Applied filters:', filteredFeatures.length, 'features');
      } else if (source) {
        source.setData(regionsData);
        onFilteredCountChange?.(regionsData.features.length);
      }
    }
  }, [regionsData, isLoaded, filters]);

  // Update layer visibility when viewMode changes
  useEffect(() => {
    if (!map.current || !isLoaded || !map.current.isStyleLoaded()) return;
    const regionVis = viewMode === 'regions' ? 'visible' : 'none';
    const countryVis = viewMode === 'countries' ? 'visible' : 'none';
    if (map.current.getLayer('region-fill')) map.current.setLayoutProperty('region-fill', 'visibility', regionVis);
    if (map.current.getLayer('region-outline')) map.current.setLayoutProperty('region-outline', 'visibility', regionVis);
    if (map.current.getLayer('country-fill')) map.current.setLayoutProperty('country-fill', 'visibility', countryVis);
    if (map.current.getLayer('country-outline')) map.current.setLayoutProperty('country-outline', 'visibility', countryVis);
  }, [viewMode, isLoaded]);

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