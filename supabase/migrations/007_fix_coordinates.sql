-- Fix safety place coordinates based on Google Maps cross-reference

-- Rename Tagum City General Hospital → Davao Regional Medical Center (correct facility on Apokon Road)
UPDATE safety_places
SET name='Davao Regional Medical Center', lat=7.4219, lng=125.8280, address='Apokon Road, Brgy. Apokon, Tagum City'
WHERE name='Tagum City General Hospital';

-- Sports Complex is at Mankilam / Capitol Circumferential Road, not city center
UPDATE safety_places
SET lat=7.4527, lng=125.7893, address='Capitol Circumferential Road, Mankilam, Tagum City'
WHERE name='Tagum City Sports Complex';

-- Apokon Barangay Hall correct coords (Gemini Village area)
UPDATE safety_places
SET lat=7.4237, lng=125.8261
WHERE name='Apokon Barangay Hall';

-- Convention Center / City Hall on Arellano Street
UPDATE safety_places
SET lat=7.4474, lng=125.8041, address='Arellano Street, Tagum City'
WHERE name='Tagum City Convention Center';

-- Police Station Main next to City Hall
UPDATE safety_places
SET lat=7.4472, lng=125.8040, address='G/F City Hall Building, Arellano St, Tagum City'
WHERE name='Tagum City Police Station Main';

-- Tagum Poblacion Barangay Hall slight adjustment
UPDATE safety_places
SET lat=7.4476, lng=125.8066
WHERE name='Tagum Poblacion Barangay Hall';

-- Central Elementary School → correct name is Magugpo Pilot Central Elementary School
UPDATE safety_places
SET name='Magugpo Pilot Central Elementary School', lat=7.4477, lng=125.8023, address='Corner Sobrecary-Mabini Street, Magugpo South, Tagum City'
WHERE name='Tagum City Central Elementary School';

-- Father Urios College is in Butuan City, NOT Tagum — remove
DELETE FROM safety_places WHERE name='Father Urios College';
DELETE FROM safety_places WHERE name='Father Urios College Gymnasium';

-- Saint John the Baptist Parish not confirmed in Tagum → Cathedral of Christ the King (Diocese of Tagum)
UPDATE safety_places
SET name='Cathedral of Christ the King', lat=7.4474, lng=125.8038, address='Tagum City'
WHERE name='Saint John the Baptist Parish Tagum';

-- Verify row count
SELECT COUNT(*) FROM safety_places;
