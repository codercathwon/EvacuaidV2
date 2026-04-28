'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useIncidentChannel } from '@/hooks/useIncidentChannel';
import { IncidentQueue } from '@/components/console/IncidentQueue';
import { ConsoleMap } from '@/components/console/ConsoleMap';
import { Incident } from '@/types';
import { AlertBanner } from '@/components/console/AlertBanner';
import { MapPin, ShieldCheck, Send, User } from 'lucide-react';

export default function ConsolePage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [municipalityId, setMunicipalityId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [operatorLabel, setOperatorLabel] = useState<string>('OPERATOR');
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [mobileTab, setMobileTab] = useState<'queue' | 'map'>('queue');
  const [banner, setBanner] = useState<{
    open: boolean;
    variant: 'incident' | 'border';
    title: string;
    description: string;
    incidentId?: string;
  }>({ open: false, variant: 'incident', title: '', description: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function loadInitialData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setOperatorLabel(user.email || user.id.slice(0, 8));

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, municipality_id')
        .eq('id', user.id)
        .single();
      
      if (!profile) return;
      const mId = profile.municipality_id;
      setMunicipalityId(mId);
      setRole(profile.role || null);

      // Load existing active incidents
      let query = supabase
        .from('incidents')
        .select('*')
        .in('status', ['pending', 'acknowledged', 'dispatched'])
        .order('created_at', { ascending: false });

      if (profile.role !== 'admin' && mId) {
        query = query.eq('municipality_id', mId);
      }

      const { data } = await query;
      if (data) setIncidents(data as Incident[]);
    }

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useIncidentChannel(
    municipalityId,
    (newIncident) => {
      setIncidents((prev) => [newIncident, ...prev]);

      setNewIds((prev) => {
        const next = new Set(prev);
        next.add(newIncident.id);
        return next;
      });
      window.setTimeout(() => {
        setNewIds((prev) => {
          const next = new Set(prev);
          next.delete(newIncident.id);
          return next;
        });
      }, 2500);

      const border = !!newIncident.border_proximity;
      setBanner({
        open: true,
        variant: border ? 'border' : 'incident',
        title: border ? 'BORDER ALERT — verify jurisdiction' : `NEW INCIDENT — ${municipalityId || 'municipality'}`,
        description: `${new Date(newIncident.created_at).toLocaleTimeString()} · ${newIncident.lat.toFixed(4)}, ${newIncident.lng.toFixed(4)}`,
        incidentId: newIncident.id,
      });
      window.setTimeout(() => {
        setBanner((b) => (b.incidentId === newIncident.id ? { ...b, open: false } : b));
      }, 10000);
    },
    (updatedIncident) => {
      setIncidents((prev) =>
        prev.map((i) => (i.id === updatedIncident.id ? updatedIncident : i))
      );

      setBanner((b) => {
        if (!b.open || b.incidentId !== updatedIncident.id) return b;
        if (updatedIncident.status !== 'pending') return { ...b, open: false };
        return b;
      });
    }
  );

  const activeIncident = incidents.find((i) => i.id === activeId) || null;

  const handleAck = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${id}/ack`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to acknowledge');
      setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'acknowledged' } : i)));
      setBanner((b) => (b.incidentId === id ? { ...b, open: false } : b));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatch = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Actioned via console' }),
      });
      if (!res.ok) throw new Error('Failed to dispatch');
      setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'dispatched' } : i)));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-[color:var(--bg-base)] text-[color:var(--text-primary)]">
      <AlertBanner
        open={banner.open}
        variant={banner.variant}
        title={banner.title}
        description={banner.description}
        playSound
        onClose={() => setBanner((b) => ({ ...b, open: false }))}
      />

      <div className="h-full flex">
        {/* Left column */}
        <aside className="hidden md:flex w-[380px] shrink-0 border-r border-[color:var(--border)] bg-[color:var(--bg-surface)] flex-col">
          <div className="px-4 py-4 border-b border-[color:var(--border)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display font-bold text-[16px] tracking-[0.08em]">EVACUAID CONSOLE</div>
                <div className="mt-1 font-ui text-[11px] text-[color:var(--text-secondary)]">
                  MUNICIPALITY {municipalityId ? municipalityId.slice(0, 8) : '—'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5"
                  style={{
                    background: 'var(--accent-green)',
                    boxShadow: '0 0 0 6px color-mix(in srgb, var(--accent-green) 20%, transparent)',
                    animation: 'evacuaid-pulse-ring 2s infinite',
                  }}
                />
                <span className="font-ui text-[10px] uppercase tracking-[0.24em] text-[color:var(--accent-green)]">
                  LIVE
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <IncidentQueue
              incidents={incidents}
              activeId={activeId}
              onSelect={(id) => setActiveId(id)}
              onAck={(id) => handleAck(id)}
              newIds={newIds}
            />
          </div>

          <div className="px-4 py-4 border-t border-[color:var(--border)] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[color:var(--text-secondary)]">
                <User className="w-4 h-4" />
                <div className="font-ui text-[12px] truncate">{operatorLabel}</div>
              </div>
              <div className="mt-1 font-ui text-[10px] uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
                Shift: ACTIVE
              </div>
            </div>
            <span className="px-2 py-1 border border-[color:var(--border-bright)] bg-black/20 font-ui text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-secondary)]">
              {role || 'responder'}
            </span>
          </div>
        </aside>

        {/* Mobile header + tabs */}
        <div className="md:hidden w-full flex flex-col">
          <div className="px-4 py-3 border-b border-[color:var(--border)] bg-[color:var(--bg-surface)] flex items-center justify-between">
            <div>
              <div className="font-display font-bold tracking-[0.08em]">EVACUAID CONSOLE</div>
              <div className="font-ui text-[11px] text-[color:var(--text-secondary)]">
                {municipalityId ? `MUNICIPALITY ${municipalityId.slice(0, 8)}` : 'MUNICIPALITY —'}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMobileTab('queue')}
                className={[
                  'px-3 py-2 border border-[color:var(--border-bright)] font-ui text-[10px] uppercase tracking-[0.22em] transition-colors duration-[150ms] ease-out',
                  mobileTab === 'queue' ? 'bg-[color:var(--accent-blue)]/15 text-[color:var(--text-primary)]' : 'bg-black/15 text-[color:var(--text-secondary)]',
                ].join(' ')}
              >
                Queue
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('map')}
                className={[
                  'px-3 py-2 border border-[color:var(--border-bright)] font-ui text-[10px] uppercase tracking-[0.22em] transition-colors duration-[150ms] ease-out',
                  mobileTab === 'map' ? 'bg-[color:var(--accent-blue)]/15 text-[color:var(--text-primary)]' : 'bg-black/15 text-[color:var(--text-secondary)]',
                ].join(' ')}
              >
                Map
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {mobileTab === 'queue' ? (
              <div className="h-full overflow-y-auto bg-[color:var(--bg-base)]">
                <IncidentQueue
                  incidents={incidents}
                  activeId={activeId}
                  onSelect={(id) => setActiveId(id)}
                  onAck={(id) => handleAck(id)}
                  newIds={newIds}
                />
              </div>
            ) : (
              <div className="h-full">
                <ConsoleMap incidents={incidents} activeIncidentId={activeId} onMarkerClick={(id) => setActiveId(id)} />
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <main className="hidden md:flex flex-1 min-w-0 flex-col bg-[color:var(--bg-base)]">
          {/* Top bar */}
          <div className="h-12 px-4 border-b border-[color:var(--border)] flex items-center justify-between">
            <div className="min-w-0">
              <div className="font-ui text-[10px] uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
                Selected
              </div>
              <div className="font-ui text-[12px] text-[color:var(--text-secondary)] truncate">
                {activeIncident ? `${activeIncident.id} · ${activeIncident.status}` : '—'}
              </div>
            </div>

            {activeIncident && (
              <div className="flex items-center gap-2">
                {activeIncident.status === 'pending' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleAck(activeIncident.id)}
                    className="px-3 py-2 border border-[color:var(--accent-green)]/60 bg-[color:var(--accent-green)] hover:bg-[color:var(--accent-green)]/90 text-[color:var(--text-primary)] font-ui text-[10px] uppercase tracking-[0.22em] transition-colors duration-[150ms] ease-out disabled:opacity-60"
                  >
                    <ShieldCheck className="w-4 h-4 inline-block mr-2" />
                    ACK
                  </button>
                )}
                {(activeIncident.status === 'pending' || activeIncident.status === 'acknowledged') && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleDispatch(activeIncident.id)}
                    className="px-3 py-2 border border-[color:var(--accent-blue)]/60 bg-[color:var(--accent-blue)] hover:bg-[color:var(--accent-blue)]/90 text-[color:var(--text-primary)] font-ui text-[10px] uppercase tracking-[0.22em] transition-colors duration-[150ms] ease-out disabled:opacity-60"
                  >
                    <Send className="w-4 h-4 inline-block mr-2" />
                    DISPATCH
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Map */}
          <div className="flex-[0_0_60%] min-h-[360px] border-b border-[color:var(--border)]">
            <ConsoleMap incidents={incidents} activeIncidentId={activeId} onMarkerClick={(id) => setActiveId(id)} />
          </div>

          {/* Detail pane */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-4">
              {!activeIncident ? (
                <div className="border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-6">
                  <div className="font-display font-bold tracking-[0.08em]">No incident selected</div>
                  <div className="mt-2 font-ui text-[12px] text-[color:var(--text-secondary)]">
                    Select an incident from the queue to view details and take action.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4">
                    <div className="font-display font-bold tracking-[0.08em]">Incident Details</div>
                    <div className="mt-3 space-y-2 font-ui text-[12px] text-[color:var(--text-secondary)]">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[color:var(--accent-blue)]" />
                        {activeIncident.lat.toFixed(5)}, {activeIncident.lng.toFixed(5)}
                      </div>
                      <div>Accuracy: ±{Math.round(activeIncident.accuracy_m || 0)} meters</div>
                      <div>Time: {new Date(activeIncident.created_at).toLocaleString()}</div>
                      <div>Status: {activeIncident.status}</div>
                      {activeIncident.border_proximity && (
                        <div className="text-[color:var(--accent-amber)]">Border proximity flag: verify jurisdiction</div>
                      )}
                    </div>
                  </div>

                  <div className="border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4">
                    <div className="font-display font-bold tracking-[0.08em]">Audit Trail</div>
                    <div className="mt-3 border border-[color:var(--border)] bg-black/20 p-3 font-ui text-[11px] text-[color:var(--text-secondary)] space-y-1">
                      <div>[{new Date(activeIncident.created_at).toLocaleTimeString()}] incident.created</div>
                      {activeIncident.status !== 'pending' && (
                        <div>[{new Date().toLocaleTimeString()}] incident.status → {activeIncident.status}</div>
                      )}
                      <div className="text-[color:var(--text-muted)] animate-pulse">_</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
