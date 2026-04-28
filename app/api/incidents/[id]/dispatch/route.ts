import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { notes } = body;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { data: incident, error: incidentError } = await supabase
      .from('incidents')
      .select('municipality_id')
      .eq('id', id)
      .single();

    if (incidentError || !incident) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, municipality_id')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.municipality_id !== incident.municipality_id)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const { error: updateError } = await supabase
      .from('incidents')
      .update({ status: 'dispatched' })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { data: dispatchData, error: dispatchError } = await supabase
      .from('dispatch_actions')
      .insert({
        incident_id: id,
        operator_id: user.id,
        notes: notes || null
      })
      .select('dispatched_at')
      .single();

    if (dispatchError) {
      return NextResponse.json({ error: dispatchError.message }, { status: 500 });
    }

    await logAuditEvent(user.id, 'dispatch', id, { notes });

    return NextResponse.json({ dispatched_at: dispatchData.dispatched_at }, { status: 200 });
  } catch (error) {
    console.error('Dispatch error:', error);
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
