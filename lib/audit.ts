import { createClient } from '@/lib/supabase/server'

export async function logAuditEvent(
  actorId: string | null,
  eventType: string,
  targetId: string | null,
  meta?: Record<string, any>
) {
  try {
    const supabase = await createClient();
    await supabase.from('audit_events').insert({
      actor_id: actorId,
      event_type: eventType,
      target_id: targetId,
      meta: meta || null,
    });
  } catch {
    // non-critical in anon SOS flow
  }
}
