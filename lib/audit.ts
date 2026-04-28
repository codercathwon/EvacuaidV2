import { createAdminClient } from '@/lib/supabase/server'

export async function logAuditEvent(
  actorId: string | null,
  eventType: string,
  targetId: string | null,
  meta?: Record<string, any>
) {
  const supabase = createAdminClient()

  await supabase.from('audit_events').insert({
    actor_id: actorId,
    event_type: eventType,
    target_id: targetId,
    meta: meta || null
  })
}
