import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveMunicipality } from '@/lib/routing';
import { logAuditEvent } from '@/lib/audit';
import { signSosPayload } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lat, lng, accuracy, timestamp, device_fp, incident_type, payload_jwt } = body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
    }

    const supabase = await createClient();
    const signed = payload_jwt || (await signSosPayload({ lat, lng, accuracy, timestamp, device_fp }));
    const incidentId = crypto.randomUUID();

    // Resolve municipality via PostGIS RPC — with nearest fallback, never returns JURISDICTION_NOT_FOUND
    let municipality = await resolveMunicipality(lat, lng);

    // Absolute last resort: use any municipality in DB
    if (!municipality) {
      const { data: anyMuni } = await supabase
        .from('municipalities')
        .select('id, name')
        .limit(1)
        .single();
      if (anyMuni) {
        municipality = { municipality_id: anyMuni.id, border_proximity: false };
      }
    }

    const muniId = municipality?.municipality_id ?? null;
    let muniName = 'Unknown';

    if (muniId) {
      const { data: muniRow } = await supabase
        .from('municipalities')
        .select('id, name')
        .eq('id', muniId)
        .single();
      muniName = muniRow?.name ?? 'Unknown';
    }

    // Build insert payload — only include incident_type if provided (column may not exist yet)
    type InsertPayload = {
      id: string;
      reporter_id: null;
      lat: number;
      lng: number;
      accuracy_m: number | null;
      municipality_id: string | null;
      border_proximity: boolean;
      status: 'pending';
      payload_jwt: string;
      incident_type?: string;
    };

    const insertPayload: InsertPayload = {
      id: incidentId,
      reporter_id: null,
      lat,
      lng,
      accuracy_m: accuracy ?? null,
      municipality_id: muniId,
      border_proximity: !!(municipality?.border_proximity),
      status: 'pending',
      payload_jwt: signed,
    };

    if (incident_type) {
      insertPayload.incident_type = incident_type;
    }

    const { error: insertError } = await supabase.from('incidents').insert(insertPayload);

    if (insertError) {
      // If the error is about the incident_type column not existing, retry without it
      if (insertError.message?.includes('incident_type') || insertError.code === '42703') {
        delete insertPayload.incident_type;
        const { error: retryError } = await supabase.from('incidents').insert(insertPayload);
        if (retryError) {
          console.error('Incident insert retry error:', retryError);
          return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
        }
      } else {
        console.error('Incident insert error:', insertError);
        return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
      }
    }

    await logAuditEvent(null, 'sos_sent', incidentId, body);

    return NextResponse.json({
      incident_id: incidentId,
      municipality: muniName,
      border_proximity: !!(municipality?.border_proximity),
      status: 'pending',
    }, { status: 201 });

  } catch (error) {
    console.error('Ingest error:', error);
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
  }
}
