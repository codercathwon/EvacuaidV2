'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AuditEvent } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

export default function AuditLogPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    supabase
      .from('audit_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (data) setEvents(data as AuditEvent[]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6 text-slate-200">System Audit Log</h1>
      
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg text-slate-300">Recent Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-slate-500 text-sm">Loading audit logs...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-slate-950 text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-semibold rounded-tl-lg">Time</th>
                    <th className="px-4 py-3 font-semibold">Event Type</th>
                    <th className="px-4 py-3 font-semibold">Actor ID</th>
                    <th className="px-4 py-3 font-semibold">Target ID</th>
                    <th className="px-4 py-3 font-semibold rounded-tr-lg">Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((evt) => (
                    <tr key={evt.id} className="border-b border-slate-800 last:border-0">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDistanceToNow(new Date(evt.created_at), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3 text-white uppercase text-xs">
                        {evt.event_type}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{evt.actor_id || 'system/anon'}</td>
                      <td className="px-4 py-3 font-mono text-xs">{evt.target_id || '-'}</td>
                      <td className="px-4 py-3 font-mono text-xs overflow-hidden text-ellipsis max-w-[200px]">
                        {evt.meta ? JSON.stringify(evt.meta) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
