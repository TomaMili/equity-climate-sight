import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cellToBoundary } from 'h3-js';

interface MapContainerProps {
  onRegionClick: (data: any) => void;
  selectedRegion: string | null;
  mapboxToken: string;
}

export const MapContainer = ({ onRegionClick, selectedRegion, mapboxToken }: MapContainerProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [15, 45], // Central Europe
      zoom: 4,
      pitch: 0,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    map.current.on('load', () => {
      setIsLoaded(true);
      
      // Add source for hexagons
      map.current?.addSource('hexagons', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      // Add fill layer
      map.current?.addLayer({
        id: 'hexagon-fill',
        type: 'fill',
        source: 'hexagons',
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
          'fill-opacity': 0.7
        }
      });

      // Add outline layer
      map.current?.addLayer({
        id: 'hexagon-outline',
        type: 'line',
        source: 'hexagons',
        paint: {
          'line-color': ['case',
            ['==', ['get', 'h3_index'], selectedRegion || ''],
            '#ffffff',
            '#000000'
          ],
          'line-width': ['case',
            ['==', ['get', 'h3_index'], selectedRegion || ''],
            3,
            0.5
          ]
        }
      });

      // Click handler
      map.current?.on('click', 'hexagon-fill', (e) => {
        if (e.features && e.features[0]) {
          onRegionClick(e.features[0].properties);
        }
      });

      // Hover cursor
      map.current?.on('mouseenter', 'hexagon-fill', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current?.on('mouseleave', 'hexagon-fill', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, onRegionClick]);

  // Update selected region outline
  useEffect(() => {
    if (map.current && isLoaded && map.current.isStyleLoaded()) {
      map.current.setPaintProperty('hexagon-outline', 'line-color', [
        'case',
        ['==', ['get', 'h3_index'], selectedRegion || ''],
        '#ffffff',
        '#000000'
      ]);
      map.current.setPaintProperty('hexagon-outline', 'line-width', [
        'case',
        ['==', ['get', 'h3_index'], selectedRegion || ''],
        3,
        0.5
      ]);
    }
  }, [selectedRegion, isLoaded]);

  // Load data from backend
  useEffect(() => {
    const loadHexagonData = async () => {
      if (!map.current || !isLoaded) return;

      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase
          .from('climate_inequality_data')
          .select('*')
          .eq('data_year', 2024);

        if (error) throw error;

        const features = (data || []).map((item: any) => {
          const boundary = cellToBoundary(item.h3_index, true);
          return {
            type: 'Feature',
            properties: {
              h3_index: item.h3_index,
              region_name: item.region_name,
              country: item.country,
              cii_score: item.cii_score,
              climate_risk_score: item.climate_risk_score,
              infrastructure_score: item.infrastructure_score,
              socioeconomic_score: item.socioeconomic_score,
              population: item.population,
              air_quality_pm25: item.air_quality_pm25,
              internet_connectivity_mbps: item.internet_connectivity_mbps,
            },
            geometry: {
              type: 'Polygon',
              coordinates: [boundary]
            }
          };
        });

        const source = map.current.getSource('hexagons') as mapboxgl.GeoJSONSource;
        if (source) {
          source.setData({
            type: 'FeatureCollection',
            features: features as any
          });
        }
      } catch (error) {
        console.error('Error loading hexagon data:', error);
      }
    };

    loadHexagonData();
  }, [isLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
};