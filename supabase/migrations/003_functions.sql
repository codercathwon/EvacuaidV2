CREATE OR REPLACE FUNCTION find_municipality(p_lat FLOAT, p_lng FLOAT)
RETURNS TABLE(id UUID, name TEXT, border_proximity BOOL) AS $$
  SELECT id, name,
  ST_Distance(boundary::geography, ST_SetSRID(ST_MakePoint(p_lng, p_lat),4326)::geography) < 200 AS border_proximity
  FROM municipalities
  WHERE ST_Contains(boundary, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326))
  ORDER BY border_proximity ASC
  LIMIT 1;
$$ LANGUAGE sql STABLE;
