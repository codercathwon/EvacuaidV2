import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: incident } = await admin
      .from('incidents')
      .select('status')
      .eq('id', id)
      .single();

    if (!incident) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    if (incident.status !== 'pending') {
      return NextResponse.json({ error: 'CONFLICT', current_status: incident.status }, { status: 409 });
    }

    await admin.from('incidents').update({ status: 'acknowledged' }).eq('id', id);

    const { data: ack } = await admin
      .from('acknowledgements')
      .insert({ incident_id: id, operator_id: user.id })
      .select('ack_at')
      .single();

    await admin.from('audit_events').insert({
      actor_id: user.id,
      event_type: 'ack',
      target_id: id,
    });

    return NextResponse.json({ success: true, ack_at: ack?.ack_at, status: 'acknowledged' });
  } catch (e) {
    console.error('ACK error:', e);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}
