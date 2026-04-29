'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useIncidentChannel, useAllIncidentsChannel } from '@/hooks/useIncidentChannel';
import type { ConnectionStatus } from '@/hooks/useIncidentChannel';
import { Incident } from '@/types';
import {
  CheckCircle, Truck, MapPin, Clock, Tag, AlertCircle,
  Crosshair, RefreshCw, X, Activity, FileText,
  MousePointer, Radio, User, MessageCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { APIProvider } from '@vis.gl/react-google-maps';
import { LiveMap } from '@/components/map/LiveMap';
import { formatDistanceToNow } from 'date-fns';

/* ── Status config ──────────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:      { label: 'Needs Response',     color: '#FF4B4B', bg: '#FFF5F5',  border: '#FF4B4B' },
  acknowledged: { label: 'Responder Notified', color: '#F59E0B', bg: '#FFFBEB',  border: '#F59E0B' },
  dispatched:   { label: 'Help Dispatched',    color: '#3B82F6', bg: '#EFF6FF',  border: '#3B82F6' },
  resolved:     { label: 'Resolved',     color: '#00C48C', bg: '#F0FDF9',  border: '#00C48C' },
  cancelled:    { label: 'Cancelled',    color: '#9CA3AF', bg: '#F9FAFB',  border: '#9CA3AF' },
};

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  injury:   'Injury',
  accident: 'Accident',
  fire:     'Fire',
  other:    'Other / Flood',
};

type FilterType = 'all' | 'pending' | 'active' | 'done';

/* ── Main page ───────────────────────────────────────── */
export default function ConsolePage() {
  const [incidents, setIncidents]           = useState<Incident[]>([]);
  const [activeId, setActiveId]             = useState<string | null>(null);
  const [municipalityId, setMunicipalityId] = useState<string | null>(null);
  const [operatorEmail, setOperatorEmail]   = useState<string | null>(null);
  const [operatorName, setOperatorName]     = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [newIds, setNewIds]                 = useState<Set<string>>(new Set());
  const [filter, setFilter]                 = useState<FilterType>('all');
  const [mobileTab, setMobileTab]           = useState<'list' | 'map' | 'detail'>('list');
  const [actionLoading, setActionLoading]   = useState(false);
  const [latestBanner, setLatestBanner]     = useState<Incident | null>(null);
  const [noteOpen, setNoteOpen]             = useState(false);
  const [noteText, setNoteText]             = useState('');
  const [isLoggedIn, setIsLoggedIn]         = useState(false);
  const seenIdsRef = useRef(new Set<string>());

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setIsLoggedIn(true);
        setOperatorEmail(data.user.email ?? data.user.id.slice(0, 8));
        const { data: profile } = await supabase
          .from('profiles')
          .select('municipality_id, full_name')
          .eq('id', data.user.id)
          .single();
        if (profile) {
          setMunicipalityId((profile as { municipality_id: string | null; full_name?: string | null }).municipality_id ?? null);
          setOperatorName((profile as { municipality_id: string | null; full_name?: string | null }).full_name ?? null);
        }
      }
      // Load all statuses so the 'done' filter works
      const { data: rows } = await supabase
        .from('incidents').select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (rows) {
        const loaded = rows as Incident[];
        loaded.forEach((r) => seenIdsRef.current.add(r.id));
        setIncidents(loaded);
      }
    });
  }, []);

  const handleNew = useCallback((inc: Incident) => {
    if (seenIdsRef.current.has(inc.id)) return; // truly new only — no duplicate bells/banners
    if (inc.status !== 'pending') return;        // banner/bell only for fresh unactioned incidents
    seenIdsRef.current.add(inc.id);
    setIncidents((prev) => [inc, ...prev]);
    setNewIds((prev) => {
      const next = new Set(prev);
      next.add(inc.id);
      setTimeout(() => setNewIds((p) => { const n = new Set(p); n.delete(inc.id); return n; }), 3000);
      return next;
    });
    setLatestBanner(inc);
    setTimeout(() => setLatestBanner(null), 10000);
  }, []);

  const handleUpdate = useCallback((inc: Incident) => {
    setIncidents((prev) => prev.map((i) => (i.id === inc.id ? inc : i)));
  }, []);

  // Municipality-specific channel when logged in AND has a municipality assigned
  useIncidentChannel(isLoggedIn && municipalityId ? municipalityId : null, handleNew, handleUpdate, setConnectionStatus);
  // All-incidents channel when NOT logged in, OR logged in but no municipality assigned yet
  useAllIncidentsChannel(handleNew, handleUpdate, setConnectionStatus, !isLoggedIn || (isLoggedIn && !municipalityId));

  const handleAck = useCallback(async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${id}/ack`, { method: 'POST' });
      if (res.ok) {
        setIncidents((prev) => prev.map((i) => i.id === id ? { ...i, status: 'acknowledged' as const } : i));
        setFilter('active');
        toast.success('Incident acknowledged');
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('ACK failed:', res.status, err);
        toast.error(`ACK failed (${res.status}): ${err.error ?? 'Unknown error'}`);
      }
    } finally { setActionLoading(false); }
  }, []);

  const handleDispatch = useCallback(async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: noteText || 'Actioned via console' }),
      });
      if (res.ok) {
        setIncidents((prev) => prev.map((i) => i.id === id ? { ...i, status: 'dispatched' as const } : i));
        setNoteOpen(false);
        setNoteText('');
        setFilter('active');
        toast.success('Responders dispatched');
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('Dispatch failed:', res.status, err);
        toast.error(`Dispatch failed (${res.status}): ${err.error ?? 'Unknown error'}`);
      }
    } finally { setActionLoading(false); }
  }, [noteText]);

  const handleRefresh = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from('incidents').select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (data) setIncidents(data as Incident[]);
  }, []);

  const handleResolveIncident = useCallback(async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${id}/resolve`, { method: 'POST' });
      if (res.ok) {
        setIncidents((prev) => prev.map((i) => i.id === id ? { ...i, status: 'resolved' as const } : i));
        toast.success('Incident resolved');
      } else {
        toast.error('Failed to resolve incident');
      }
    } finally { setActionLoading(false); }
  }, []);

  const handleResolveDispatched = useCallback(async () => {
    const dispatchedIds = incidents.filter((i) => i.status === 'dispatched').map((i) => i.id);
    if (dispatchedIds.length === 0) return;
    if (!window.confirm(`Mark ${dispatchedIds.length} dispatched incident(s) as resolved?`)) return;
    const res = await fetch('/api/incidents/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolve', ids: dispatchedIds }),
    });
    if (res.ok) {
      setIncidents((prev) => prev.map((i) =>
        dispatchedIds.includes(i.id) ? { ...i, status: 'resolved' as const } : i
      ));
      toast.success(`${dispatchedIds.length} incident(s) marked resolved`);
    } else {
      toast.error('Failed to resolve incidents');
    }
  }, [incidents]);

  const handleClearDone = useCallback(() => {
    const doneIds = incidents
      .filter((i) => i.status === 'resolved' || i.status === 'cancelled')
      .map((i) => i.id);
    if (doneIds.length === 0) return;
    setIncidents((prev) => prev.filter((i) => !doneIds.includes(i.id)));
    toast.success(`${doneIds.length} resolved incident(s) cleared from view`);
  }, [incidents]);

  const filteredIncidents = incidents.filter((i) => {
    if (filter === 'pending') return i.status === 'pending';
    if (filter === 'active')  return i.status === 'acknowledged' || i.status === 'dispatched';
    if (filter === 'done')    return i.status === 'resolved' || i.status === 'cancelled';
    return true;
  });

  const activeIncident = incidents.find((i) => i.id === activeId) ?? null;
  const pendingCount   = incidents.filter((i) => i.status === 'pending').length;
  const ackCount       = incidents.filter((i) => i.status === 'acknowledged').length;
  const dispCount      = incidents.filter((i) => i.status === 'dispatched').length;

  const tabCounts = useMemo(() => ({
    all:     incidents.length,
    pending: pendingCount,
    active:  ackCount + dispCount,
    done:    incidents.filter((i) => i.status === 'resolved' || i.status === 'cancelled').length,
  }), [incidents, pendingCount, ackCount, dispCount]);

  const raw = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  const mapsKey = raw && !raw.startsWith('__') ? raw : '';

  const displayName = operatorName || operatorEmail || 'Operator';

  const content = (
    <div className="h-[100dvh] overflow-hidden flex flex-col" style={{ background: 'var(--bg-base)' }}>

      {/* ── New incident banner ────────────────────────── */}
      <AnimatePresence>
        {latestBanner && (
          <motion.div
            initial={{ opacity: 0, y: -56 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -56 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
          >
            <div
              className="rounded-2xl border-l-4 p-4 flex items-start justify-between gap-3"
              style={{
                background: 'var(--bg-surface)',
                boxShadow: 'var(--shadow-lg)',
                borderLeftColor: latestBanner.source === 'chatbot' ? 'var(--accent-blue)' : 'var(--accent-primary)',
              }}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {latestBanner.source === 'chatbot'
                  ? <MessageCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--accent-blue)' }} />
                  : <AlertCircle  className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
                }
                <div className="min-w-0">
                  <p className="font-ui font-semibold text-sm text-[var(--text-primary)]">
                    {latestBanner.source === 'chatbot' ? 'AI Chat Incident' : 'New Incident'}
                  </p>
                  {latestBanner.incident_type && (
                    <p className="font-ui text-xs font-semibold mt-0.5" style={{ color: latestBanner.source === 'chatbot' ? 'var(--accent-blue)' : 'var(--accent-primary)' }}>
                      {INCIDENT_TYPE_LABELS[latestBanner.incident_type] ?? latestBanner.incident_type}
                    </p>
                  )}
                  {latestBanner.source === 'chatbot' && latestBanner.chat_summary && (
                    <p className="font-ui text-xs italic text-[var(--text-secondary)] mt-0.5 truncate">
                      &ldquo;{latestBanner.chat_summary}&rdquo;
                    </p>
                  )}
                  <p className="font-mono text-xs text-[var(--text-muted)] truncate">
                    {latestBanner.lat.toFixed(4)}, {latestBanner.lng.toFixed(4)}
                  </p>
                  <p className="font-ui text-xs text-[var(--text-muted)] mt-0.5">Just now</p>
                  <button
                    type="button"
                    onClick={() => { setLatestBanner(null); setActiveId(latestBanner.id); setFilter('all'); }}
                    className="mt-2 font-ui text-xs font-semibold"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    View →
                  </button>
                </div>
              </div>
              <button type="button" onClick={() => setLatestBanner(null)} className="shrink-0 p-1 rounded-lg hover:bg-[var(--bg-base)] transition-colors">
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
              <div className="absolute bottom-0 left-4 right-4 h-[3px] rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
                <div className="h-full rounded-full" style={{ background: 'var(--accent-primary)', animation: 'toast-progress 10s linear forwards' }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Desktop top bar ──────────────────────────────── */}
      <header
        className="hidden md:flex items-center justify-between px-5 h-14 shrink-0"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)', boxShadow: 'var(--shadow-xs)' }}
      >
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="EvacuAid" className="w-6 h-6" />
          <span className="font-ui font-semibold text-base text-[var(--text-primary)]">EvacuAid Console</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: connectionStatus === 'connected' ? 'var(--accent-green)' : connectionStatus === 'connecting' ? 'var(--accent-amber)' : 'var(--text-muted)' }}
          />
          <span className="font-ui font-medium text-[var(--text-secondary)]">
            {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? 'Connecting' : 'Offline'}
          </span>
          <span className="text-[var(--text-muted)]">·</span>
          <span className="font-ui text-[var(--text-muted)]">Tagum City</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs font-ui">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-primary)' }} />
              <span className="text-[var(--text-secondary)] font-medium">{pendingCount} pending</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-amber)' }} />
              <span className="text-[var(--text-secondary)] font-medium">{ackCount} ack&apos;d</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-blue)' }} />
              <span className="text-[var(--text-secondary)] font-medium">{dispCount} dispatched</span>
            </span>
          </div>
          <div className="w-px h-4 bg-[var(--border)]" />
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-ui font-bold text-sm text-white shrink-0"
              style={{ background: 'var(--accent-primary)' }}
            >
              {displayName[0].toUpperCase()}
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-ui text-sm font-semibold text-[var(--text-primary)]">{displayName}</span>
              {operatorName && operatorEmail && (
                <span className="font-ui text-xs text-[var(--text-muted)]">{operatorEmail}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main layout ─────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* LEFT: incident sidebar */}
        <aside
          className="hidden md:flex w-[300px] shrink-0 flex-col"
          style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-light)' }}
        >
          <div className="px-4 py-3 border-b shrink-0 sticky top-0 z-10" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-surface)' }}>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-ui font-semibold text-sm text-[var(--text-primary)] uppercase tracking-wide">Incidents</span>
                <span className="px-2 py-0.5 rounded-full font-ui font-bold text-xs text-white" style={{ background: 'var(--accent-primary)' }}>
                  {pendingCount}
                </span>
              </div>
              <button type="button" onClick={handleRefresh} className="p-1 rounded-lg hover:bg-[var(--bg-base)] transition-colors" title="Refresh">
                <RefreshCw className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </button>
            </div>
            <div className="flex gap-1">
              {(['all', 'pending', 'active', 'done'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className="px-2.5 py-1 rounded-full font-ui text-xs font-medium capitalize transition-all"
                  style={{
                    background: filter === f ? 'var(--accent-primary-soft)' : 'transparent',
                    color:      filter === f ? 'var(--accent-primary)'      : 'var(--text-muted)',
                  }}
                >
                  {f}{tabCounts[f] > 0 ? ` (${tabCounts[f]})` : ''}
                </button>
              ))}
            </div>
            {(dispCount > 0 || tabCounts.done > 0) && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {dispCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResolveDispatched}
                    className="px-2.5 py-1 rounded-full font-ui text-xs font-medium transition-colors hover:bg-[var(--accent-green-soft)]"
                    style={{ color: 'var(--accent-green)', border: '1px solid var(--border-medium)' }}
                  >
                    Resolve dispatched ({dispCount})
                  </button>
                )}
                {tabCounts.done > 0 && (
                  <button
                    type="button"
                    onClick={handleClearDone}
                    className="px-2.5 py-1 rounded-full font-ui text-xs font-medium transition-colors hover:bg-[var(--bg-base)]"
                    style={{ color: 'var(--text-muted)', border: '1px solid var(--border-medium)' }}
                  >
                    Clear done
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1.5">
            {filteredIncidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-16">
                <Radio className="w-8 h-8 text-[var(--text-muted)]" />
                <p className="font-ui font-medium text-sm text-[var(--text-muted)]">No incidents</p>
                <p className="font-ui text-xs text-[var(--text-muted)]">New incidents appear here in real-time</p>
              </div>
            ) : (
              filteredIncidents.map((inc) => (
                <IncidentCard
                  key={inc.id}
                  incident={inc}
                  isNew={newIds.has(inc.id)}
                  isSelected={activeId === inc.id}
                  onSelect={() => setActiveId(inc.id)}
                  onAck={() => handleAck(inc.id)}
                  disabled={actionLoading}
                />
              ))
            )}
          </div>
        </aside>

        {/* RIGHT: main area */}
        <main className="hidden md:flex flex-1 min-w-0 flex-col overflow-hidden bg-[var(--bg-base)]">
          {!activeIncident ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <MousePointer className="w-8 h-8 text-[var(--text-muted)]" />
              <p className="font-ui font-medium text-sm text-[var(--text-muted)]">Select an incident</p>
              <p className="font-ui text-sm text-[var(--text-muted)]">Click any incident on the left to view details</p>
            </div>
          ) : (
            <motion.div
              key={activeIncident.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3"
            >
              {/* Map */}
              <div className="h-64 rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
                {mapsKey ? (
                  <LiveMap
                    incidents={[activeIncident]}
                    selectedId={activeIncident.id}
                    showBoundary={false}
                    height="100%"
                    className="rounded-none"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#F0F4F8]">
                    <MapPin className="w-8 h-8 text-[var(--text-muted)]" />
                  </div>
                )}
              </div>

              {/* Header row */}
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-ui text-xs font-semibold"
                  style={{ background: STATUS_CONFIG[activeIncident.status]?.bg, color: STATUS_CONFIG[activeIncident.status]?.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_CONFIG[activeIncident.status]?.color }} />
                  {STATUS_CONFIG[activeIncident.status]?.label}
                </span>
                {activeIncident.incident_type && (
                  <span
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-ui text-xs font-semibold"
                    style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                  >
                    <Tag className="w-3 h-3" />
                    {INCIDENT_TYPE_LABELS[activeIncident.incident_type] ?? activeIncident.incident_type}
                  </span>
                )}
                <span className="font-mono text-xs text-[var(--text-muted)]">#{activeIncident.id.slice(0, 12)}…</span>
                <span className="font-ui text-xs text-[var(--text-muted)] ml-auto">
                  {formatDistanceToNow(new Date(activeIncident.created_at), { addSuffix: true })}
                </span>
              </div>

              {/* Details */}
              <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-xs)', border: '1px solid var(--border-light)' }}>
                <div className="grid grid-cols-2 gap-3">
                  <DetailRow icon={<MapPin className="w-3.5 h-3.5" />} label="Location">
                    <span className="font-mono text-xs">{activeIncident.lat.toFixed(5)}, {activeIncident.lng.toFixed(5)}</span>
                  </DetailRow>
                  {activeIncident.accuracy_m != null && (
                    <DetailRow icon={<Activity className="w-3.5 h-3.5" />} label="Accuracy">
                      ±{Math.round(activeIncident.accuracy_m)}m
                    </DetailRow>
                  )}
                  <DetailRow icon={<Clock className="w-3.5 h-3.5" />} label="Time">
                    {formatDistanceToNow(new Date(activeIncident.created_at), { addSuffix: true })}
                  </DetailRow>
                  {activeIncident.incident_type && (
                    <DetailRow icon={<Tag className="w-3.5 h-3.5" />} label="Type">
                      <span className="font-semibold">{INCIDENT_TYPE_LABELS[activeIncident.incident_type] ?? activeIncident.incident_type}</span>
                    </DetailRow>
                  )}
                  <DetailRow icon={<User className="w-3.5 h-3.5" />} label="Reporter">
                    {activeIncident.reporter_id ? `User ${activeIncident.reporter_id.slice(0, 8)}` : 'Anonymous'}
                  </DetailRow>
                </div>
                {activeIncident.border_proximity && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--accent-amber-soft)', color: 'var(--accent-amber)' }}>
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-ui text-xs font-medium">Border proximity — verify jurisdiction</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {activeIncident.status === 'pending' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleAck(activeIncident.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full font-ui text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'var(--accent-green)' }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Acknowledge
                  </button>
                )}
                {(activeIncident.status === 'pending' || activeIncident.status === 'acknowledged') && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleDispatch(activeIncident.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full font-ui text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'var(--accent-blue)' }}
                  >
                    <Truck className="w-4 h-4" />
                    Dispatch
                  </button>
                )}
                {activeIncident.status === 'dispatched' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleResolveIncident(activeIncident.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full font-ui text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ color: 'var(--accent-green)', border: '1px solid var(--accent-green)', background: 'var(--accent-green-soft)' }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark resolved
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setNoteOpen(!noteOpen)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full font-ui text-sm font-medium transition-colors hover:bg-[var(--bg-base)]"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  <FileText className="w-4 h-4" />
                  Add Note
                </button>
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  className="ml-auto p-2 rounded-full hover:bg-[var(--bg-base)] transition-colors"
                >
                  <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              </div>

              {/* Note input */}
              <AnimatePresence>
                {noteOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="space-y-2">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Add a note…"
                        rows={3}
                        className="w-full px-3 py-2.5 rounded-xl font-ui text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none resize-none transition-all"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)'; }}
                        onBlur={(e)  => { e.target.style.borderColor = 'var(--border)'; }}
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setNoteOpen(false); setNoteText(''); }} className="px-3 py-1.5 rounded-full font-ui text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-base)] transition-colors border border-[var(--border)]">
                          Cancel
                        </button>
                        <button type="button" onClick={() => setNoteOpen(false)} className="px-3 py-1.5 rounded-full font-ui text-xs font-medium text-white transition-opacity hover:opacity-90" style={{ background: 'var(--accent-primary)' }}>
                          Save Note
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Activity log */}
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-xs)', border: '1px solid var(--border-light)' }}>
                <p className="font-ui font-semibold text-sm text-[var(--text-primary)] mb-3">Activity</p>
                <div className="space-y-1.5">
                  <LogRow ts={new Date(activeIncident.created_at).toLocaleTimeString()} action="incident.created" />
                  {activeIncident.status !== 'pending' && (
                    <LogRow ts={new Date().toLocaleTimeString()} action={`incident.status → ${activeIncident.status}`} />
                  )}
                  <div className="flex items-center gap-2 py-1">
                    <span className="font-mono text-xs text-[var(--text-muted)] w-20 shrink-0">{new Date().toLocaleTimeString()}</span>
                    <span className="font-ui text-xs text-[var(--text-muted)] animate-pulse">_</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </main>

        {/* ── Mobile layout ───────────────────────────────── */}
        <div className="md:hidden w-full flex flex-col overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between shrink-0" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)' }}>
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="EvacuAid" className="w-6 h-6" />
              <span className="font-ui font-semibold text-base text-[var(--text-primary)]">Console</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: connectionStatus === 'connected' ? 'var(--accent-green)' : 'var(--text-muted)' }} />
              <span className="font-ui text-xs text-[var(--text-muted)]">{connectionStatus === 'connected' ? 'Live' : 'Offline'}</span>
              <span className="font-ui text-xs font-semibold text-[var(--text-secondary)] ml-2">{displayName}</span>
            </div>
          </div>

          <div className="flex shrink-0" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)' }}>
            {(['list', 'map', 'detail'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMobileTab(tab)}
                className="flex-1 py-2.5 font-ui text-sm font-medium capitalize transition-colors min-h-[44px]"
                style={{
                  color:        mobileTab === tab ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  borderBottom: `2px solid ${mobileTab === tab ? 'var(--accent-primary)' : 'transparent'}`,
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {mobileTab === 'list' && (
              <div className="h-full overflow-y-auto px-3 py-2 space-y-1.5">
                <div className="flex gap-1 pt-1 pb-2">
                  {(['all', 'pending', 'active', 'done'] as FilterType[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      className="px-2.5 py-1 rounded-full font-ui text-xs font-medium capitalize transition-all"
                      style={{
                        background: filter === f ? 'var(--accent-primary-soft)' : 'transparent',
                        color:      filter === f ? 'var(--accent-primary)'      : 'var(--text-muted)',
                      }}
                    >
                      {f}{tabCounts[f] > 0 ? ` (${tabCounts[f]})` : ''}
                    </button>
                  ))}
                </div>
                {filteredIncidents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-16">
                    <Radio className="w-8 h-8 text-[var(--text-muted)]" />
                    <p className="font-ui text-sm text-[var(--text-muted)]">No incidents right now</p>
                  </div>
                ) : (
                  filteredIncidents.map((inc) => (
                    <IncidentCard
                      key={inc.id}
                      incident={inc}
                      isNew={newIds.has(inc.id)}
                      isSelected={activeId === inc.id}
                      onSelect={() => { setActiveId(inc.id); setMobileTab('detail'); }}
                      onAck={() => handleAck(inc.id)}
                      disabled={actionLoading}
                    />
                  ))
                )}
              </div>
            )}
            {mobileTab === 'map' && (
              <div className="h-full">
                {mapsKey ? (
                  <LiveMap
                    incidents={incidents}
                    showMyLocation
                    onMarkerClick={(id) => { setActiveId(id); setMobileTab('detail'); }}
                    showBoundary
                    height="100%"
                    className="rounded-none"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center p-8 text-center bg-[#F0F4F8]">
                    <div>
                      <MapPin className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)]" />
                      <p className="font-ui text-sm text-[var(--text-muted)]">Map not configured</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {mobileTab === 'detail' && (
              <div className="h-full overflow-y-auto p-3">
                {activeIncident ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-ui text-xs font-semibold"
                        style={{ background: STATUS_CONFIG[activeIncident.status]?.bg, color: STATUS_CONFIG[activeIncident.status]?.color }}
                      >
                        {STATUS_CONFIG[activeIncident.status]?.label}
                      </span>
                      {activeIncident.incident_type && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full font-ui text-xs font-semibold" style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                          <Tag className="w-3 h-3" />
                          {INCIDENT_TYPE_LABELS[activeIncident.incident_type] ?? activeIncident.incident_type}
                        </span>
                      )}
                      <span className="font-mono text-xs text-[var(--text-muted)]">#{activeIncident.id.slice(0, 10)}…</span>
                    </div>
                    <div className="flex gap-2">
                      {activeIncident.status === 'pending' && (
                        <button type="button" disabled={actionLoading} onClick={() => handleAck(activeIncident.id)}
                          className="flex-1 py-2.5 rounded-full font-ui text-sm font-medium text-white min-h-[44px]"
                          style={{ background: 'var(--accent-green)' }}>
                          Acknowledge
                        </button>
                      )}
                      {(activeIncident.status === 'pending' || activeIncident.status === 'acknowledged') && (
                        <button type="button" disabled={actionLoading} onClick={() => handleDispatch(activeIncident.id)}
                          className="flex-1 py-2.5 rounded-full font-ui text-sm font-medium text-white min-h-[44px]"
                          style={{ background: 'var(--accent-blue)' }}>
                          Dispatch
                        </button>
                      )}
                      {activeIncident.status === 'dispatched' && (
                        <button type="button" disabled={actionLoading} onClick={() => handleResolveIncident(activeIncident.id)}
                          className="flex-1 py-2.5 rounded-full font-ui text-sm font-medium min-h-[44px]"
                          style={{ color: 'var(--accent-green)', border: '1px solid var(--accent-green)', background: 'var(--accent-green-soft)' }}>
                          Mark resolved
                        </button>
                      )}
                    </div>
                    <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)' }}>
                      <p className="font-mono text-xs text-[var(--text-muted)]">{activeIncident.lat.toFixed(5)}, {activeIncident.lng.toFixed(5)}</p>
                      <p className="font-ui text-xs text-[var(--text-secondary)]">{formatDistanceToNow(new Date(activeIncident.created_at), { addSuffix: true })}</p>
                      {activeIncident.incident_type && (
                        <p className="font-ui text-xs font-semibold text-[var(--text-primary)]">
                          Type: {INCIDENT_TYPE_LABELS[activeIncident.incident_type] ?? activeIncident.incident_type}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-16">
                    <Crosshair className="w-8 h-8 text-[var(--text-muted)]" />
                    <p className="font-ui text-sm text-[var(--text-muted)]">Select an incident from the list</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  return mapsKey ? <APIProvider apiKey={mapsKey}>{content}</APIProvider> : content;
}

/* ── Sub-components ──────────────────────────────────── */

function ageMinutes(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000);
}

function urgencyLevel(incident: Incident): 'normal' | 'urgent' | 'critical' {
  if (incident.status !== 'pending') return 'normal';
  const age = ageMinutes(incident.created_at);
  if (age >= 5) return 'critical';
  if (age >= 3) return 'urgent';
  return 'normal';
}

function IncidentCard({
  incident, isNew, isSelected, onSelect, onAck, disabled,
}: {
  incident: Incident;
  isNew: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onAck: () => void;
  disabled?: boolean;
}) {
  const conf    = STATUS_CONFIG[incident.status] ?? STATUS_CONFIG.pending;
  const urgency = urgencyLevel(incident);

  const borderLeftColor = urgency === 'critical' ? '#FF4B4B'
    : urgency === 'urgent' ? '#F59E0B'
    : conf.border;

  const glowShadow = urgency === 'critical'
    ? 'var(--shadow-sm), 0 0 0 2px rgba(255,75,75,0.35)'
    : isNew ? `var(--shadow-sm), 0 0 0 2px ${conf.color}30`
    : isSelected ? 'var(--shadow-sm)' : 'var(--shadow-xs)';

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, y: -10 } : false}
      animate={{ opacity: 1, y: 0 }}
      onClick={onSelect}
      className="rounded-xl p-3 cursor-pointer transition-all duration-150 relative overflow-hidden"
      style={{
        background:   isSelected ? 'var(--accent-blue-soft)' : 'var(--bg-surface)',
        borderTop:    isSelected ? '1.5px solid var(--accent-blue)' : '1px solid var(--border-light)',
        borderRight:  isSelected ? '1.5px solid var(--accent-blue)' : '1px solid var(--border-light)',
        borderBottom: isSelected ? '1.5px solid var(--accent-blue)' : '1px solid var(--border-light)',
        borderLeft:   `4px solid ${borderLeftColor}`,
        boxShadow:    glowShadow,
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: conf.color }} />
          <span className="font-ui text-xs font-semibold" style={{ color: conf.color }}>{conf.label}</span>
          {urgency === 'critical' && (
            <span
              className="px-1.5 py-0.5 rounded font-ui text-[10px] font-bold text-white animate-pulse"
              style={{ background: '#FF4B4B' }}
            >
              CRITICAL
            </span>
          )}
          {urgency === 'urgent' && (
            <span
              className="px-1.5 py-0.5 rounded font-ui text-[10px] font-semibold"
              style={{ background: '#FFFBEB', color: '#F59E0B' }}
            >
              ⚠ {ageMinutes(incident.created_at)}m
            </span>
          )}
        </div>
        <span className="font-ui text-xs text-[var(--text-muted)]">
          {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
        </span>
      </div>
      {incident.incident_type && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <Tag className="w-3 h-3 shrink-0 text-[var(--text-muted)]" />
          <span className="font-ui text-xs font-semibold text-[var(--text-primary)]">
            {INCIDENT_TYPE_LABELS[incident.incident_type] ?? incident.incident_type}
          </span>
        </div>
      )}
      {incident.source === 'chatbot' && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <MessageCircle className="w-3 h-3 shrink-0" style={{ color: 'var(--accent-blue)' }} />
          <span className="font-ui text-xs font-semibold" style={{ color: 'var(--accent-blue)' }}>AI Chat</span>
        </div>
      )}
      {incident.source === 'chatbot' && incident.chat_summary && (
        <p className="font-ui text-xs italic text-[var(--text-muted)] mb-1.5 truncate">
          &ldquo;{incident.chat_summary}&rdquo;
        </p>
      )}
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
        <MapPin className="w-3 h-3 shrink-0 text-[var(--text-muted)]" />
        <span className="font-mono truncate">{incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}</span>
      </div>
      {incident.status === 'pending' && (
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => { e.stopPropagation(); onAck(); }}
          className="mt-2 w-full py-1.5 rounded-full font-ui text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 min-h-[32px]"
          style={{ background: 'var(--accent-primary-soft)', color: 'var(--accent-primary)' }}
        >
          Acknowledge
        </button>
      )}
    </motion.div>
  );
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-[var(--text-muted)]">{icon}</span>
      <div>
        <p className="font-ui text-xs text-[var(--text-muted)]">{label}</p>
        <p className="font-ui text-sm text-[var(--text-primary)] mt-0.5">{children}</p>
      </div>
    </div>
  );
}

function LogRow({ ts, action }: { ts: string; action: string }) {
  return (
    <div className="flex items-center gap-2 py-1 border-b last:border-0" style={{ borderColor: 'var(--border-light)' }}>
      <span className="font-mono text-xs text-[var(--text-muted)] w-20 shrink-0">{ts}</span>
      <span className="font-ui text-xs text-[var(--text-secondary)]">{action}</span>
    </div>
  );
}
