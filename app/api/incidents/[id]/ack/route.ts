import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    // Acknowledge logic: operator clicks ACK
    // insert into acknowledgements, update incident status to 'acknowledged'
    
    // Check if operator is authorized for this incident's municipality
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

    // Perform updates
    const { error: updateError } = await supabase
      .from('incidents')
      .update({ status: 'acknowledged' })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { data: ackData, error: ackError } = await supabase
      .from('acknowledgements')
      .insert({
        incident_id: id,
        operator_id: user.id
      })
      .select('ack_at')
      .single();

    if (ackError) {
      return NextResponse.json({ error: ackError.message }, { status: 500 });
    }

    await logAuditEvent(user.id, 'ack', id);

    return NextResponse.json({ ack_at: ackData.ack_at }, { status: 200 });
  } catch (error) {
    console.error('Ack error:', error);
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
