-- Add Germany and France regions
INSERT INTO climate_inequality_regions (region_code, region_name, country, region_type, cii_score, climate_risk_score, infrastructure_score, socioeconomic_score, population, data_year, air_quality_pm25, air_quality_no2, geometry, centroid) VALUES
('DE-BY', 'Bavaria', 'Germany', 'state', 0.32, 0.42, 0.24, 0.30, 13200000, 2024, 12.0, 18.0,
 ST_GeomFromGeoJSON('{"type":"MultiPolygon","coordinates":[[[[ 8.9,47.3],[13.8,47.3],[13.8,50.6],[8.9,50.6],[8.9,47.3]]]]}'),
 ST_GeomFromGeoJSON('{"type":"Point","coordinates":[11.5,48.8]}')),
('DE-NW', 'North Rhine-Westphalia', 'Germany', 'state', 0.38, 0.48, 0.30, 0.36, 18000000, 2024, 12.0, 18.0,
 ST_GeomFromGeoJSON('{"type":"MultiPolygon","coordinates":[[[[ 5.9,50.3],[9.5,50.3],[9.5,52.5],[5.9,52.5],[5.9,50.3]]]]}'),
 ST_GeomFromGeoJSON('{"type":"Point","coordinates":[7.5,51.5]}')),
('FR-IDF', 'Île-de-France', 'France', 'region', 0.40, 0.52, 0.32, 0.38, 12300000, 2024, 12.0, 18.0,
 ST_GeomFromGeoJSON('{"type":"MultiPolygon","coordinates":[[[[ 1.4,48.1],[3.6,48.1],[3.6,49.2],[1.4,49.2],[1.4,48.1]]]]}'),
 ST_GeomFromGeoJSON('{"type":"Point","coordinates":[2.3,48.9]}')),
('FR-ARA', 'Auvergne-Rhône-Alpes', 'France', 'region', 0.34, 0.46, 0.26, 0.32, 8100000, 2024, 12.0, 18.0,
 ST_GeomFromGeoJSON('{"type":"MultiPolygon","coordinates":[[[[ 2.2,44.1],[7.2,44.1],[7.2,46.5],[2.2,46.5],[2.2,44.1]]]]}'),
 ST_GeomFromGeoJSON('{"type":"Point","coordinates":[4.8,45.5]}'));