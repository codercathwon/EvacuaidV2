-- 1. profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'citizen' -- 'citizen' | 'responder' | 'admin'
  CHECK (role IN ('citizen','responder','admin')),
  municipality_id UUID REFERENCES municipalities(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. municipalities
CREATE TABLE municipalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- e.g. 'tagum-city'
  boundary GEOMETRY(MULTIPOLYGON, 4326) NOT NULL, -- requires PostGIS
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. incidents (core table)
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id), -- null = anonymous
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy_m REAL,
  municipality_id UUID REFERENCES municipalities(id),
  border_proximity BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending','acknowledged','dispatched','resolved','cancelled')),
  payload_jwt TEXT, -- raw signed JWT for audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON incidents (municipality_id, status, created_at DESC);

-- 4. acknowledgements
CREATE TABLE acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES profiles(id),
  ack_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. dispatch_actions
CREATE TABLE dispatch_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES profiles(id),
  notes TEXT,
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. audit_events (append-only)
CREATE TABLE audit_events (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES profiles(id),
  event_type TEXT NOT NULL, -- 'sos_sent' | 'ack' | 'dispatch' | 'login' | etc.
  target_id UUID,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- REVOKE UPDATE, DELETE ON audit_events FROM PUBLIC; -- immutable
