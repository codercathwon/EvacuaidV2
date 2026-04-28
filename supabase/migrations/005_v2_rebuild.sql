-- EvacuAid v2 Rebuild Migration
-- Run this against your Supabase project

-- 1. Add incident_type column to incidents table
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS incident_type TEXT
    CHECK (incident_type IN ('injury','accident','fire','other'));

-- 2. Update Tagum City boundary to wider polygon
UPDATE municipalities
SET boundary = ST_SetSRID(
  ST_GeomFromText(
    'POLYGON((125.70 7.30, 125.98 7.30, 125.98 7.62, 125.70 7.62, 125.70 7.30))'
  ),
  4326
)
WHERE LOWER(name) LIKE '%tagum%';

-- 3. Add find_nearest_municipality RPC (fallback for points outside any boundary)
CREATE OR REPLACE FUNCTION find_nearest_municipality(p_lat FLOAT, p_lng FLOAT)
RETURNS TABLE(id UUID, name TEXT) AS $$
  SELECT id, name
  FROM municipalities
  ORDER BY ST_Distance(
    boundary::geography,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  ) ASC
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- 4. Active incidents view for map (last 24 hours, not resolved/cancelled)
CREATE OR REPLACE VIEW active_incidents_map AS
SELECT
  id,
  lat,
  lng,
  status,
  incident_type,
  municipality_id,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) AS age_seconds
FROM incidents
WHERE status NOT IN ('resolved', 'cancelled')
  AND created_at > NOW() - INTERVAL '24 hours';

-- 5. Live stats function
CREATE OR REPLACE FUNCTION get_incident_stats()
RETURNS JSON AS $$
  SELECT json_build_object(
    'total_today',
    COUNT(*) FILTER (WHERE created_at > CURRENT_DATE),
    'active_now',
    COUNT(*) FILTER (WHERE status IN ('pending', 'acknowledged')),
    'resolved_today',
    COUNT(*) FILTER (WHERE status = 'resolved' AND created_at > CURRENT_DATE),
    'avg_ack_seconds',
    AVG(
      EXTRACT(EPOCH FROM (a.ack_at - i.created_at))
    ) FILTER (WHERE a.ack_at IS NOT NULL)
  )
  FROM incidents i
  LEFT JOIN acknowledgements a ON a.incident_id = i.id;
$$ LANGUAGE sql STABLE;

-- 6. Allow anon users to read active incidents for public map
-- (adjust RLS to your project's security requirements)
-- CREATE POLICY "Public can view active incidents"
--   ON incidents FOR SELECT
--   TO anon
--   USING (status NOT IN ('resolved','cancelled') AND created_at > NOW() - INTERVAL '24 hours');
