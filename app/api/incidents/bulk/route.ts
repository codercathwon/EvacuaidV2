import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { action, ids } = await req.json();

    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    if (!['resolve', 'cancel'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const admin = createAdminClient();
    const newStatus = action === 'resolve' ? 'resolved' : 'cancelled';

    const { error } = await admin
      .from('incidents')
      .update({ status: newStatus })
      .in('id', ids)
      .in('status', ['pending', 'acknowledged', 'dispatched']);

    if (error) {
      return NextResponse.json({ error: 'Failed to update incidents' }, { status: 500 });
    }

    await admin.from('audit_events').insert(
      ids.map((id: string) => ({
        event_type: action === 'resolve' ? 'bulk_resolve' : 'bulk_cancel',
        target_id: id,
        meta: { source: 'console_bulk_action' },
      }))
    );

    return NextResponse.json({ success: true, updated: ids.length, status: newStatus });
  } catch (err) {
    console.error('Bulk action error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
