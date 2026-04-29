import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { notes } = body as { notes?: string };

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
    if (incident.status !== 'pending' && incident.status !== 'acknowledged') {
      return NextResponse.json({ error: 'CONFLICT', current_status: incident.status }, { status: 409 });
    }

    await admin.from('incidents').update({ status: 'dispatched' }).eq('id', id);

    const { data: dispatch } = await admin
      .from('dispatch_actions')
      .insert({ incident_id: id, operator_id: user.id, notes: notes || null })
      .select('dispatched_at')
      .single();

    await admin.from('audit_events').insert({
      actor_id: user.id,
      event_type: 'dispatch',
      target_id: id,
      meta: { notes },
    });

    return NextResponse.json({ success: true, dispatched_at: dispatch?.dispatched_at, status: 'dispatched' });
  } catch (e) {
    console.error('Dispatch error:', e);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}
