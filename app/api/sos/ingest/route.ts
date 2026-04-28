import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveMunicipality } from '@/lib/routing';
import { logAuditEvent } from '@/lib/audit';
import { signSosPayload } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    const allowAnon = process.env.NEXT_PUBLIC_ALLOW_ANON_SOS !== 'false';
    if (!allowAnon) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json();
    const { lat, lng, accuracy, timestamp, device_fp, payload_jwt } = body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
    }

    const supabase = await createClient();

    // Resolve municipality via PostGIS RPC
    const municipality = await resolveMunicipality(lat, lng);
    
    if (!municipality) {
      return NextResponse.json({ error: 'JURISDICTION_NOT_FOUND' }, { status: 422 });
    }

    const { data: muniRow, error: muniError } = await supabase
      .from('municipalities')
      .select('id,name')
      .eq('id', municipality.municipality_id)
      .single();

    if (muniError || !muniRow) {
      return NextResponse.json({ error: 'JURISDICTION_NOT_FOUND' }, { status: 422 });
    }

    const signed = payload_jwt || (await signSosPayload({ lat, lng, accuracy, timestamp, device_fp }));

    const { data: incident, error: insertError } = await supabase
      .from('incidents')
      .insert({
        reporter_id: null,
        lat,
        lng,
        accuracy_m: accuracy,
        municipality_id: muniRow.id,
        border_proximity: !!municipality.border_proximity,
        status: 'pending',
        payload_jwt: signed,
      })
      .select('id, status')
      .single();

    if (insertError) {
      console.error('Incident insert error:', insertError);
      return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
    }

    // Log audit event
    await logAuditEvent(null, 'sos_sent', incident.id, body);

    return NextResponse.json({
      incident_id: incident.id,
      municipality: muniRow.name,
      border_proximity: !!municipality.border_proximity,
      status: incident.status,
    }, { status: 201 });

  } catch (error) {
    console.error('Ingest error:', error);
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
  }
}
