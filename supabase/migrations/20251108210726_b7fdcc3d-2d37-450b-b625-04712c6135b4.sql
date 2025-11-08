-- Add Canada provinces
INSERT INTO climate_inequality_regions (region_code, region_name, country, region_type, cii_score, climate_risk_score, infrastructure_score, socioeconomic_score, population, data_year, air_quality_pm25, air_quality_no2, geometry, centroid) VALUES
('CA-ON', 'Ontario', 'Canada', 'province', 0.38, 0.52, 0.28, 0.34, 15000000, 2024, 12.0, 18.0,
 ST_GeomFromGeoJSON('{"type":"MultiPolygon","coordinates":[[[[-95.2,41.7],[-74.3,41.7],[-74.3,56.9],[-95.2,56.9],[-95.2,41.7]]]]}'),
 ST_GeomFromGeoJSON('{"type":"Point","coordinates":[-85.0,51.0]}')),
('CA-QC', 'Quebec', 'Canada', 'province', 0.35, 0.48, 0.25, 0.32, 8600000, 2024, 12.0, 18.0,
 ST_GeomFromGeoJSON('{"type":"MultiPolygon","coordinates":[[[[-79.8,45.0],[-57.1,45.0],[-57.1,62.6],[-79.8,62.6],[-79.8,45.0]]]]}'),
 ST_GeomFromGeoJSON('{"type":"Point","coordinates":[-71.2,52.5]}')),
('CA-BC', 'British Columbia', 'Canada', 'province', 0.36, 0.50, 0.26, 0.33, 5200000, 2024, 12.0, 18.0,
 ST_GeomFromGeoJSON('{"type":"MultiPolygon","coordinates":[[[[-139.1,48.3],[-114.0,48.3],[-114.0,60.0],[-139.1,60.0],[-139.1,48.3]]]]}'),
 ST_GeomFromGeoJSON('{"type":"Point","coordinates":[-125.0,53.7]}'));