-- FIX 1: Rolling 24-hour stats window
CREATE OR REPLACE FUNCTION get_incident_stats()
RETURNS JSON LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT json_build_object(
    'total_today',     COUNT(*) FILTER (WHERE i.created_at > NOW() - INTERVAL '24 hours'),
    'active_now',      COUNT(*) FILTER (WHERE i.status IN ('pending','acknowledged','dispatched')),
    'resolved_today',  COUNT(*) FILTER (
      WHERE i.status IN ('resolved','cancelled')
      AND i.updated_at > NOW() - INTERVAL '24 hours'
    ),
    'avg_ack_seconds', ROUND(AVG(
      EXTRACT(EPOCH FROM (a.ack_at - i.created_at))
    ) FILTER (WHERE a.ack_at IS NOT NULL))
  )
  FROM incidents i
  LEFT JOIN acknowledgements a ON a.incident_id = i.id
  WHERE i.created_at > NOW() - INTERVAL '24 hours';
$$;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS incidents_updated_at ON incidents;
CREATE TRIGGER incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- FIX 5: Safety places table
CREATE TABLE IF NOT EXISTS safety_places (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN (
    'hospital','police','fire_station','evacuation_center',
    'barangay_hall','school','church','health_center'
  )),
  address     TEXT,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  phone       TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE safety_places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_safety_places" ON safety_places;
CREATE POLICY "public_read_safety_places"
  ON safety_places FOR SELECT USING (TRUE);

INSERT INTO safety_places (name, category, address, lat, lng, phone) VALUES
-- HOSPITALS
('Tagum City General Hospital', 'hospital', 'Tagum City', 7.4478, 125.8068, '(084) 400-0000'),
('Region XI Medical Center Annex Tagum', 'hospital', 'Tagum City', 7.4502, 125.8091, NULL),
('Tagum Doctors Hospital', 'hospital', 'Tagum City', 7.4455, 125.8044, NULL),
('Davao del Norte Provincial Hospital', 'hospital', 'Tagum City', 7.4521, 125.8112, NULL),
('Saint Jude Medical Center Tagum', 'hospital', 'Tagum City', 7.4439, 125.8028, NULL),

-- HEALTH CENTERS
('Apokon Rural Health Unit', 'health_center', 'Apokon, Tagum City', 7.4380, 125.7980, NULL),
('La Filipina Health Center', 'health_center', 'La Filipina, Tagum City', 7.4620, 125.8140, NULL),
('Libuganon Health Center', 'health_center', 'Libuganon, Tagum City', 7.4720, 125.8200, NULL),
('Cuambog Health Center', 'health_center', 'Cuambog, Tagum City', 7.4320, 125.7920, NULL),
('Canocotan Barangay Health Center', 'health_center', 'Canocotan, Tagum City', 7.4580, 125.8160, NULL),
('New Balamban Health Center', 'health_center', 'New Balamban, Tagum City', 7.4200, 125.8050, NULL),
('Magugpo Health Center', 'health_center', 'Magugpo, Tagum City', 7.4490, 125.8080, NULL),
('Visayan Village Health Center', 'health_center', 'Visayan Village, Tagum City', 7.4445, 125.8055, NULL),

-- POLICE STATIONS
('Tagum City Police Station Main', 'police', 'Tagum City Hall Area', 7.4478, 125.8070, '(084) 218-0700'),
('PNP Tagum City Station 1 - Apokon', 'police', 'Apokon, Tagum City', 7.4375, 125.7975, NULL),
('PNP Tagum City Station 2 - Magugpo', 'police', 'Magugpo, Tagum City', 7.4495, 125.8085, NULL),
('PNP Tagum City Station 3 - La Filipina', 'police', 'La Filipina, Tagum City', 7.4625, 125.8145, NULL),
('PNP Tagum City Station 4 - Libuganon', 'police', 'Libuganon, Tagum City', 7.4718, 125.8198, NULL),
('PNP Canocotan Substation', 'police', 'Canocotan, Tagum City', 7.4575, 125.8155, NULL),
('PNP Cuambog Substation', 'police', 'Cuambog, Tagum City', 7.4315, 125.7918, NULL),
('PNP New Balamban Substation', 'police', 'New Balamban, Tagum City', 7.4195, 125.8045, NULL),
('PNP Camp Castrence Substation', 'police', 'Tagum City', 7.4540, 125.8120, NULL),

-- FIRE STATIONS
('Tagum City Fire Station Main', 'fire_station', 'Tagum City', 7.4482, 125.8074, '(084) 218-0500'),
('BFP Apokon Fire Sub-Station', 'fire_station', 'Apokon, Tagum City', 7.4372, 125.7972, NULL),
('BFP Magugpo Fire Sub-Station', 'fire_station', 'Magugpo, Tagum City', 7.4498, 125.8088, NULL),
('BFP La Filipina Sub-Station', 'fire_station', 'La Filipina, Tagum City', 7.4628, 125.8148, NULL),

-- EVACUATION CENTERS
('Tagum City Sports Complex', 'evacuation_center', 'Tagum City', 7.4465, 125.8062, NULL),
('Apokon Elementary School Evacuation', 'evacuation_center', 'Apokon, Tagum City', 7.4388, 125.7988, NULL),
('Magugpo Evacuation Center', 'evacuation_center', 'Magugpo, Tagum City', 7.4505, 125.8092, NULL),
('Libuganon Barangay Gym', 'evacuation_center', 'Libuganon, Tagum City', 7.4725, 125.8205, NULL),
('Cuambog Multi-Purpose Hall', 'evacuation_center', 'Cuambog, Tagum City', 7.4325, 125.7925, NULL),
('La Filipina Covered Court', 'evacuation_center', 'La Filipina, Tagum City', 7.4615, 125.8135, NULL),
('Canocotan Evacuation Hall', 'evacuation_center', 'Canocotan, Tagum City', 7.4585, 125.8165, NULL),
('New Balamban Covered Court', 'evacuation_center', 'New Balamban, Tagum City', 7.4205, 125.8055, NULL),
('San Isidro Evacuation Center', 'evacuation_center', 'San Isidro, Tagum City', 7.4550, 125.7950, NULL),
('Visayan Village Barangay Hall Evac', 'evacuation_center', 'Visayan Village, Tagum City', 7.4450, 125.8058, NULL),
('Camp Castrence Evacuation Area', 'evacuation_center', 'Tagum City', 7.4545, 125.8125, NULL),
('Tagum City Convention Center', 'evacuation_center', 'Tagum City', 7.4470, 125.8065, NULL),
('Father Urios College Gymnasium', 'evacuation_center', 'Tagum City', 7.4488, 125.8078, NULL),

-- BARANGAY HALLS (all 23 barangays)
('Apokon Barangay Hall', 'barangay_hall', 'Apokon, Tagum City', 7.4382, 125.7982, NULL),
('Bincungan Barangay Hall', 'barangay_hall', 'Bincungan, Tagum City', 7.4300, 125.8100, NULL),
('Busaon Barangay Hall', 'barangay_hall', 'Busaon, Tagum City', 7.4250, 125.8150, NULL),
('Canocotan Barangay Hall', 'barangay_hall', 'Canocotan, Tagum City', 7.4578, 125.8158, NULL),
('Cuambog Barangay Hall', 'barangay_hall', 'Cuambog, Tagum City', 7.4318, 125.7920, NULL),
('Del Pilar Barangay Hall', 'barangay_hall', 'Del Pilar, Tagum City', 7.4410, 125.8010, NULL),
('Gubatan Barangay Hall', 'barangay_hall', 'Gubatan, Tagum City', 7.4650, 125.7900, NULL),
('Kakar Barangay Hall', 'barangay_hall', 'Kakar, Tagum City', 7.4700, 125.8250, NULL),
('La Filipina Barangay Hall', 'barangay_hall', 'La Filipina, Tagum City', 7.4622, 125.8142, NULL),
('Libuganon Barangay Hall', 'barangay_hall', 'Libuganon, Tagum City', 7.4722, 125.8202, NULL),
('Madaum Barangay Hall', 'barangay_hall', 'Madaum, Tagum City', 7.4180, 125.7950, NULL),
('Magdum Barangay Hall', 'barangay_hall', 'Magdum, Tagum City', 7.4780, 125.8020, NULL),
('Magugpo Poblacion Barangay Hall', 'barangay_hall', 'Magugpo, Tagum City', 7.4492, 125.8082, NULL),
('Mankilam Barangay Hall', 'barangay_hall', 'Mankilam, Tagum City', 7.4420, 125.8030, NULL),
('New Balamban Barangay Hall', 'barangay_hall', 'New Balamban, Tagum City', 7.4198, 125.8048, NULL),
('New Visayas Barangay Hall', 'barangay_hall', 'New Visayas, Tagum City', 7.4350, 125.8200, NULL),
('Pagsabangan Barangay Hall', 'barangay_hall', 'Pagsabangan, Tagum City', 7.4150, 125.8100, NULL),
('Palma Gil Barangay Hall', 'barangay_hall', 'Palma Gil, Tagum City', 7.4600, 125.7850, NULL),
('San Agustin Barangay Hall', 'barangay_hall', 'San Agustin, Tagum City', 7.4520, 125.7920, NULL),
('San Isidro Barangay Hall', 'barangay_hall', 'San Isidro, Tagum City', 7.4548, 125.7948, NULL),
('San Miguel Barangay Hall', 'barangay_hall', 'San Miguel, Tagum City', 7.4380, 125.8120, NULL),
('Tagum Poblacion Barangay Hall', 'barangay_hall', 'Poblacion, Tagum City', 7.4475, 125.8068, NULL),
('Visayan Village Barangay Hall', 'barangay_hall', 'Visayan Village, Tagum City', 7.4448, 125.8056, NULL),

-- SCHOOLS
('Tagum City National High School', 'school', 'Apokon, Tagum City', 7.4390, 125.7990, NULL),
('Tagum City National High School Annex', 'school', 'Tagum City', 7.4462, 125.8060, NULL),
('Tagum City Central Elementary School', 'school', 'Tagum City', 7.4469, 125.8064, NULL),
('Father Urios College', 'school', 'Tagum City', 7.4486, 125.8076, NULL),
('Jose Rizal Memorial College Tagum', 'school', 'Tagum City', 7.4476, 125.8071, NULL),
('Southern Philippines Colleges', 'school', 'Tagum City', 7.4483, 125.8073, NULL),
('Apokon National High School', 'school', 'Apokon, Tagum City', 7.4385, 125.7985, NULL),
('Libuganon Elementary School', 'school', 'Libuganon, Tagum City', 7.4715, 125.8195, NULL),
('La Filipina Elementary School', 'school', 'La Filipina, Tagum City', 7.4618, 125.8138, NULL),
('Cuambog Elementary School', 'school', 'Cuambog, Tagum City', 7.4322, 125.7922, NULL),

-- CHURCHES
('Saint John the Baptist Parish Tagum', 'church', 'Tagum City', 7.4480, 125.8072, NULL),
('Immaculate Conception Parish Apokon', 'church', 'Apokon, Tagum City', 7.4386, 125.7986, NULL),
('San Isidro Parish Church', 'church', 'San Isidro, Tagum City', 7.4552, 125.7952, NULL),
('La Filipina Parish Church', 'church', 'La Filipina, Tagum City', 7.4620, 125.8140, NULL),
('Libuganon Chapel', 'church', 'Libuganon, Tagum City', 7.4720, 125.8200, NULL);
