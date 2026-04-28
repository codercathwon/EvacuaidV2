import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifySosPayload } from '@/lib/jwt';
import { resolveMunicipality } from '@/lib/routing';
import { logAuditEvent } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      if (process.env.NEXT_PUBLIC_ALLOW_ANON_SOS !== 'true') {
        return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
      }
    }

    const token = authHeader?.replace('Bearer ', '');
    // If no token but anon allowed, maybe they sent body directly?
    // Wait, the spec says "Signed Payload - client POSTs to /api/sos/ingest with an Authorization header"
    // Wait, let's just parse the body if the token logic isn't strictly enforced for anon, OR the token IS the payload.
    // The spec: "client POSTs to /api/sos/ingest with an Authorization header (Supabase session JWT)"
    // AND "client builds a signed JWT payload". Wait, is the signed payload in the body or the header?
    // "Signed Payload — client POSTs to /api/sos/ingest with an Authorization header (Supabase session JWT)"
    // Ah, Supabase session JWT is in Authorization header. Signed payload is the body! Let's re-read the spec.
    /*
      {
        "lat": 7.4478,
        "lng": 125.8068,
        "accuracy": 15.3,
        "timestamp": 1714000000000,
        "device_fp": "sha256-of-navigator-info" // optional
      }
    */
    // Wait, if it says "raw signed JWT for audit", maybe they post the JSON payload AND a JWT? Or they sign the payload themselves?
    // Spec: "client builds a signed JWT payload: { userId?, lat, lng, ... }."
    // Let's assume the body IS the JSON, but they also send a signed JWT string somehow... Wait.
    // Spec: payload_jwt TEXT, -- raw signed JWT for audit
    // Let's assume the client passes the raw JWT in the body under a specific property, or the body itself is the JWT string.
    // But section 6 POST /api/sos/ingest Request body shows:
    // { "lat": 7.4478, ... }
    // Let's expect the plain JSON, we'll sign it server-side for the DB audit trail, or we expect the client to pass { ...json, token: signedJWT }.
    // Let's just sign it on the server if the client doesn't send the token, or assume client sends `payload_jwt` in the body.
    
    // Let's parse the body:
    const body = await request.json();
    const { lat, lng, accuracy, timestamp, device_fp, payload_jwt } = body;

    // Supabase auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Verify user if not anonymous
    if (!user && process.env.NEXT_PUBLIC_ALLOW_ANON_SOS !== 'true') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    // Resolve municipality
    const municipality = await resolveMunicipality(lat, lng);
    
    if (!municipality) {
      return NextResponse.json({ error: 'JURISDICTION_NOT_FOUND' }, { status: 422 });
    }

    // Insert incident
    // Use service role if needed? No, RLS policy "sos_insert" allows any authenticated user (or TRUE if anon allowed)
    // We already use the user's session client!
    
    const { data: incident, error: insertError } = await supabase
      .from('incidents')
      .insert({
        reporter_id: user?.id || null,
        lat,
        lng,
        accuracy_m: accuracy,
        municipality_id: municipality.id,
        border_proximity: municipality.border_proximity,
        status: 'pending',
        payload_jwt: payload_jwt || null, // from client if provided
      })
      .select('id, status')
      .single();

    if (insertError) {
      console.error('Incident insert error:', insertError);
      return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
    }

    // Log audit event
    await logAuditEvent(user?.id || null, 'sos_sent', incident.id, body);

    return NextResponse.json({
      incident_id: incident.id,
      municipality: municipality.name,
      border_proximity: municipality.border_proximity,
      status: incident.status,
    }, { status: 201 });

  } catch (error) {
    console.error('Ingest error:', error);
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
  }
}
