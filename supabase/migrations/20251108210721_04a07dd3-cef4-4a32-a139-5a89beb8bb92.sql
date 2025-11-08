-- Add United States states
INSERT INTO climate_inequality_regions (region_code, region_name, country, region_type, cii_score, climate_risk_score, infrastructure_score, socioeconomic_score, population, data_year, air_quality_pm25, air_quality_no2, geometry, centroid) VALUES
('US-CA', 'California', 'United States', 'state', 0.45, 0.65, 0.35, 0.35, 39000000, 2024, 12.0, 18.0,
 ST_GeomFromGeoJSON('{"type":"MultiPolygon","coordinates":[[[[-124.4,32.5],[-114.1,32.5],[-114.1,42.0],[-124.4,42.0],[-124.4,32.5]]]]}'),
 ST_GeomFromGeoJSON('{"type":"Point","coordinates":[-119.4,36.8]}')),
('US-TX', 'Texas', 'United States', 'state', 0.52, 0.68, 0.42, 0.46, 30000000, 2024, 12.0, 18.0,
 ST_GeomFromGeoJSON('{"type":"MultiPolygon","coordinates":[[[[-106.6,25.8],[-93.5,25.8],[-93.5,36.5],[-106.6,36.5],[-106.6,25.8]]]]}'),
 ST_GeomFromGeoJSON('{"type":"Point","coordinates":[-99.9,31.5]}')),
('US-FL', 'Florida', 'United States', 'state', 0.58, 0.75, 0.48, 0.51, 22000000, 2024, 12.0, 18.0,
 ST_GeomFromGeoJSON('{"type":"MultiPolygon","coordinates":[[[[-87.6,24.5],[-80.0,24.5],[-80.0,31.0],[-87.6,31.0],[-87.6,24.5]]]]}'),
 ST_GeomFromGeoJSON('{"type":"Point","coordinates":[-81.5,27.8]}')),
('US-NY', 'New York', 'United States', 'state', 0.42, 0.55, 0.32, 0.39, 20000000, 2024, 12.0, 18.0,
 ST_GeomFromGeoJSON('{"type":"MultiPolygon","coordinates":[[[[-79.8,40.5],[-71.9,40.5],[-71.9,45.0],[-79.8,45.0],[-79.8,40.5]]]]}'),
 ST_GeomFromGeoJSON('{"type":"Point","coordinates":[-75.5,43.0]}'));