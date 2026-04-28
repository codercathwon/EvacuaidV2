-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Incident INSERT: any authenticated user (or anon if you allow public SOS)
CREATE POLICY "sos_insert" ON incidents FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL OR TRUE); -- adjust for anon SOS

-- Incident SELECT: only responders of that municipality
CREATE POLICY "responder_read" ON incidents FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM profiles
    WHERE role IN ('responder','admin')
    AND (municipality_id = incidents.municipality_id OR role = 'admin')
  )
);

-- Incident UPDATE (status): only responders
CREATE POLICY "responder_update_status" ON incidents FOR UPDATE
USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('responder','admin'))
)
WITH CHECK (TRUE);

-- Profiles: users see own row; admins see all
CREATE POLICY "own_profile" ON profiles FOR ALL
USING (auth.uid() = id OR
auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Municipalities: public read
CREATE POLICY "public_municipalities" ON municipalities FOR SELECT
USING (TRUE);

-- Acknowledgements: Responders insert
CREATE POLICY "responder_ack_insert" ON acknowledgements FOR INSERT
WITH CHECK (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('responder','admin'))
);

-- Acknowledgements: Responders select
CREATE POLICY "responder_ack_select" ON acknowledgements FOR SELECT
USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('responder','admin'))
);

-- Dispatch Actions: Responders insert
CREATE POLICY "responder_dispatch_insert" ON dispatch_actions FOR INSERT
WITH CHECK (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('responder','admin'))
);

-- Dispatch Actions: Responders select
CREATE POLICY "responder_dispatch_select" ON dispatch_actions FOR SELECT
USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('responder','admin'))
);

-- Audit Events: App can insert
CREATE POLICY "audit_insert" ON audit_events FOR INSERT
WITH CHECK (TRUE);

-- Audit Events: Admins read
CREATE POLICY "admin_audit_read" ON audit_events FOR SELECT
USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
