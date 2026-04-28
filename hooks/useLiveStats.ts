'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { IncidentStats } from '@/types';

const DEFAULT_STATS: IncidentStats = {
  total_today: 0,
  active_now: 0,
  resolved_today: 0,
  avg_ack_seconds: null,
};

export function useLiveStats(): IncidentStats {
  const [stats, setStats] = useState<IncidentStats>(DEFAULT_STATS);

  const fetchStats = useCallback(async () => {
    const supabase = createClient();

    // Try the RPC first
    const { data, error } = await supabase.rpc('get_incident_stats');
    if (!error && data) {
      setStats(data as IncidentStats);
      return;
    }

    // Fallback: compute from incidents table directly
    const { data: incidents } = await supabase
      .from('incidents')
      .select('status, created_at')
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

    if (incidents) {
      const total_today = incidents.length;
      const active_now = incidents.filter(
        (i) => i.status === 'pending' || i.status === 'acknowledged'
      ).length;
      const resolved_today = incidents.filter((i) => i.status === 'resolved').length;
      setStats({ total_today, active_now, resolved_today, avg_ack_seconds: null });
    }
  }, []);

  useEffect(() => {
    fetchStats();

    const supabase = createClient();
    const channel = supabase
      .channel('stats:incidents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
        fetchStats();
      })
      .subscribe();

    const interval = setInterval(fetchStats, 30_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchStats]);

  return stats;
}
