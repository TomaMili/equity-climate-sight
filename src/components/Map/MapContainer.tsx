import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapErrorFallback } from './MapErrorFallback';

interface MapContainerProps {
  onRegionClick: (data: any) => void;
  selectedRegion: string | null;
  mapboxToken: string;
  onTokenError?: () => void;
}

export const MapContainer = ({ onRegionClick, selectedRegion, mapboxToken, onTokenError }: MapContainerProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapError, setMapError] = useState<Error | null>(null);
  const [regionsData, setRegionsData] = useState<any>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load region data from backend FIRST, before map initialization
  useEffect(() => {
    const loadRegionData = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase
          .from('climate_inequality_regions')
          .select('*')
          .eq('data_year', 2024);

        if (error) throw error;

        // Convert to GeoJSON
        const features = (data || []).map((item: any) => ({
          type: 'Feature',
          properties: {
            region_code: item.region_code,
            region_name: item.region_name,
            country: item.country,
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
          },
          geometry: JSON.parse(item.geometry)
        }));

        const geojsonData = {
          type: 'FeatureCollection',
          features: features
        };

        setRegionsData(geojsonData);
        setIsDataLoaded(true);
      } catch (error) {
        console.error('Error loading region data:', error);
        setMapError(error instanceof Error ? error : new Error('Failed to load region data'));
        setIsDataLoaded(true); // Still set to true to allow map to initialize
      }
    };

    loadRegionData();
  }, []);

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

        // Add fill layer for colored regions
        map.current.addLayer({
          id: 'region-fill',
          type: 'fill',
          source: 'regions',
          paint: {
            'fill-color': [
              'interpolate',
              ['linear'],
              ['get', 'cii_score'],
              0, '#1a9850',
              0.3, '#91cf60',
              0.5, '#ffffbf',
              0.7, '#fc8d59',
              1, '#d73027'
            ],
            'fill-opacity': 0.75
          }
        });

        // Add outline layer
        map.current.addLayer({
          id: 'region-outline',
          type: 'line',
          source: 'regions',
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

        // Click handler
        map.current.on('click', 'region-fill', (e) => {
          if (e.features && e.features[0]) {
            onRegionClick(e.features[0].properties);
          }
        });

        // Hover cursor
        map.current.on('mouseenter', 'region-fill', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });

        map.current.on('mouseleave', 'region-fill', () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
        });
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

  // Update data source when regionsData changes (without reinitializing map)
  useEffect(() => {
    if (map.current && isLoaded && regionsData && map.current.getSource('regions')) {
      const source = map.current.getSource('regions') as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData(regionsData);
        console.log('Updated region data on map');
      }
    }
  }, [regionsData, isLoaded]);

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