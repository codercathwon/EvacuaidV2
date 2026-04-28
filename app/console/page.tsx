'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useIncidentChannel, useAllIncidentsChannel } from '@/hooks/useIncidentChannel';
import type { ConnectionStatus } from '@/hooks/useIncidentChannel';
import { Incident } from '@/types';
import { Shield, CheckCircle, Truck, MapPin, Clock, Tag, AlertCircle, User, LogIn, Layers, Crosshair, RefreshCw, X, Activity } from 'lucide-react';
import { ConnectionBadge } from '@/components/console/ConnectionBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { APIProvider } from '@vis.gl/react-google-maps';
import { LiveMap } from '@/components/map/LiveMap';
import { LiveStats } from '@/components/stats/LiveStats';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: 'Pending', color: '#FF4B4B', bg: '#FFF0F0', border: '#FF4B4B' },
  acknowledged: { label: 'Acknowledged', color: '#FFB547', bg: '#FFF8ED', border: '#FFB547' },
  dispatched: { label: 'Dispatched', color: '#00C48C', bg: '#E8FBF5', border: '#00C48C' },
  resolved: { label: 'Resolved', color: '#9CA3AF', bg: '#F3F4F6', border: '#9CA3AF' },
  cancelled: { label: 'Cancelled', color: '#9CA3AF', bg: '#F3F4F6', border: '#9CA3AF' },
};

type FilterType = 'all' | 'pending' | 'active' | 'done';

export default function ConsolePage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [municipalityId, setMunicipalityId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [operatorEmail, setOperatorEmail] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterType>('all');
  const [mobileTab, setMobileTab] = useState<'list' | 'map' | 'detail'>('list');
  const [actionLoading, setActionLoading] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [latestBanner, setLatestBanner] = useState<Incident | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setIsLoggedIn(true);
        setOperatorEmail(data.user.email ?? data.user.id.slice(0, 8));

        const { data: profile } = await supabase
          .from('profiles')
          .select('municipality_id, role')
          .eq('id', data.user.id)
          .single();

        if (profile) setMunicipalityId(profile.municipality_id ?? null);
      }

      // Load incidents regardless of auth
      let query = supabase
        .from('incidents')
        .select('*')
        .in('status', ['pending', 'acknowledged', 'dispatched'])
        .order('created_at', { ascending: false });

      const { data: rows } = await query;
      if (rows) setIncidents(rows as Incident[]);
    });
  }, []);

  const handleNew = useCallback((inc: Incident) => {
    setIncidents((prev) => [inc, ...prev]);
    setNewIds((prev) => {
      const next = new Set(prev);
      next.add(inc.id);
      setTimeout(() => setNewIds((p) => { const n = new Set(p); n.delete(inc.id); return n; }), 3000);
      return next;
    });
    setLatestBanner(inc);
    setTimeout(() => setLatestBanner(null), 8000);
  }, []);

  const handleUpdate = useCallback((inc: Incident) => {
    setIncidents((prev) => prev.map((i) => (i.id === inc.id ? inc : i)));
  }, []);

  // Use municipality-scoped or all-incidents channel based on auth
  useIncidentChannel(
    isLoggedIn ? municipalityId : null,
    handleNew,
    handleUpdate,
    setConnectionStatus
  );

  useAllIncidentsChannel(
    isLoggedIn ? () => {} : handleNew,
    isLoggedIn ? () => {} : handleUpdate,
    isLoggedIn ? undefined : setConnectionStatus
  );

  const handleAck = useCallback(async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${id}/ack`, { method: 'POST' });
      if (res.ok) setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'acknowledged' as const } : i)));
    } finally {
      setActionLoading(false);
    }
  }, []);

  const handleDispatch = useCallback(async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Actioned via console' }),
      });
      if (res.ok) setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'dispatched' as const } : i)));
    } finally {
      setActionLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('incidents')
      .select('*')
      .in('status', ['pending', 'acknowledged', 'dispatched'])
      .order('created_at', { ascending: false });
    if (data) setIncidents(data as Incident[]);
  }, []);

  const filteredIncidents = incidents.filter((i) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return i.status === 'pending';
    if (filter === 'active') return i.status === 'acknowledged' || i.status === 'dispatched';
    if (filter === 'done') return i.status === 'resolved' || i.status === 'cancelled';
    return true;
  });

  const activeIncident = incidents.find((i) => i.id === activeId) ?? null;
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  return (
    <div
      className="h-[100dvh] overflow-hidden flex flex-col"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* New incident banner */}
      <AnimatePresence>
        {latestBanner && (
          <motion.div
            initial={{ opacity: 0, y: -48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -48 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
          >
            <div
              className="px-4 py-3 rounded-2xl flex items-center justify-between gap-3"
              style={{
                background: 'var(--accent-primary)',
                boxShadow: 'var(--shadow-red)',
              }}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-white shrink-0" />
                <span className="font-ui text-sm font-semibold text-white">
                  New incident — {latestBanner.lat.toFixed(4)}, {latestBanner.lng.toFixed(4)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => { setLatestBanner(null); setActiveId(latestBanner.id); }}
                className="shrink-0 font-ui text-xs text-white underline"
              >
                View
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop top navbar */}
      <header
        className="hidden md:flex items-center justify-between px-6 h-14 shrink-0"
        style={{
          background: 'var(--bg-surface)',
          boxShadow: 'var(--shadow-sm)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
          <span className="font-display font-bold text-lg text-[var(--text-primary)]">EvacuAid</span>
        </div>

        <div className="flex items-center gap-3">
          <ConnectionBadge status={connectionStatus} />
          <span className="text-xs font-ui text-[var(--text-muted)]">Tagum City</span>
        </div>

        <div className="flex items-center gap-3">
          <LiveStats variant="bar" className="hidden lg:flex" />
          {isLoggedIn ? (
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <User className="w-4 h-4" />
              <span className="font-ui">{operatorEmail}</span>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-full font-ui text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-primary)' }}
            >
              <LogIn className="w-4 h-4" />
              Login
            </Link>
          )}
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* LEFT: Incident sidebar (desktop) */}
        <aside
          className="hidden md:flex w-80 shrink-0 flex-col"
          style={{
            background: 'var(--bg-surface)',
            borderRight: '1px solid var(--border)',
          }}
        >
          {/* Sidebar header */}
          <div
            className="px-4 py-3 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm text-[var(--text-primary)] uppercase tracking-wide">
                  Incidents
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                  style={{ background: 'var(--accent-primary)' }}
                >
                  {incidents.filter((i) => i.status === 'pending').length}
                </span>
              </div>
              <ConnectionBadge status={connectionStatus} compact />
            </div>

            {/* Filters */}
            <div className="flex gap-1.5">
              {(['all', 'pending', 'active', 'done'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className="px-2.5 py-1 rounded-full font-ui text-xs font-medium capitalize transition-all"
                  style={{
                    background: filter === f ? 'var(--accent-primary)' : 'var(--bg-base)',
                    color: filter === f ? '#FFFFFF' : 'var(--text-secondary)',
                    border: `1px solid ${filter === f ? 'var(--accent-primary)' : 'var(--border)'}`,
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Incident list */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
            {filteredIncidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
                <Activity className="w-10 h-10 text-[var(--text-muted)]" />
                <div>
                  <p className="font-display font-bold text-base text-[var(--text-primary)]">
                    No incidents right now
                  </p>
                  <p className="font-ui text-sm text-[var(--text-secondary)] mt-1">
                    New incidents will appear here in real-time
                  </p>
                </div>
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

        {/* RIGHT: Main area (desktop) */}
        <main className="hidden md:flex flex-1 min-w-0 flex-col">
          {/* Action bar */}
          <div
            className="h-12 px-4 flex items-center justify-between shrink-0"
            style={{
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              {activeIncident ? (
                <>
                  <span
                    className="px-2 py-0.5 rounded-full font-ui text-xs font-semibold"
                    style={{
                      background: STATUS_CONFIG[activeIncident.status]?.bg,
                      color: STATUS_CONFIG[activeIncident.status]?.color,
                    }}
                  >
                    {STATUS_CONFIG[activeIncident.status]?.label}
                  </span>
                  <span className="font-code text-xs text-[var(--text-muted)] truncate">
                    #{activeIncident.id.slice(0, 16)}…
                  </span>
                </>
              ) : (
                <span className="font-ui text-sm text-[var(--text-muted)]">
                  Select an incident to view details
                </span>
              )}
            </div>

            {activeIncident && (
              <div className="flex items-center gap-2">
                {activeIncident.status === 'pending' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleAck(activeIncident.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-ui text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'var(--accent-green)' }}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Acknowledge
                  </button>
                )}
                {(activeIncident.status === 'pending' || activeIncident.status === 'acknowledged') && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleDispatch(activeIncident.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-ui text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'var(--accent-blue)' }}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    Dispatch
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  className="p-1.5 rounded-xl hover:bg-[var(--bg-base)] transition-colors"
                >
                  <X className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
              </div>
            )}
          </div>

          {/* Map section */}
          <div className="flex-[0_0_55%] min-h-0 relative" style={{ borderBottom: '1px solid var(--border)' }}>
            {mapsKey ? (
              <APIProvider apiKey={mapsKey}>
                <LiveMap
                  incidents={incidents}
                  showMyLocation
                  onMarkerClick={(id) => setActiveId(id)}
                  showBoundary
                  height="100%"
                  selectedId={activeId}
                  className="rounded-none"
                />
              </APIProvider>
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: '#F0F4F8' }}
              >
                <div className="text-center">
                  <MapPin className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)]" />
                  <p className="font-ui text-sm text-[var(--text-muted)]">
                    Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable map
                  </p>
                </div>
              </div>
            )}

            {/* Map controls overlay */}
            <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
              <MapControl
                icon={<Layers className="w-4 h-4" />}
                title="Toggle heatmap"
                active={showHeatmap}
                onClick={() => setShowHeatmap(!showHeatmap)}
              />
              <MapControl
                icon={<Crosshair className="w-4 h-4" />}
                title="Center on latest"
                onClick={() => {
                  const latest = incidents[0];
                  if (latest) setActiveId(latest.id);
                }}
              />
              <MapControl
                icon={<RefreshCw className="w-4 h-4" />}
                title="Refresh markers"
                onClick={handleRefresh}
              />
            </div>
          </div>

          {/* Detail panel */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {!activeIncident ? (
              <div
                className="p-6 rounded-2xl text-center"
                style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-sm)' }}
              >
                <Crosshair className="w-8 h-8 mx-auto mb-3 text-[var(--text-muted)]" />
                <p className="font-display font-bold text-base text-[var(--text-primary)]">
                  No incident selected
                </p>
                <p className="font-ui text-sm text-[var(--text-secondary)] mt-1">
                  Select an incident from the list to view details and take action.
                </p>
              </div>
            ) : (
              <IncidentDetail
                incident={activeIncident}
                onAck={() => handleAck(activeIncident.id)}
                onDispatch={() => handleDispatch(activeIncident.id)}
                disabled={actionLoading}
              />
            )}
          </div>
        </main>

        {/* MOBILE layout */}
        <div className="md:hidden w-full flex flex-col">
          {/* Mobile header */}
          <div
            className="px-4 py-3 flex items-center justify-between shrink-0"
            style={{
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
              <span className="font-display font-bold text-base text-[var(--text-primary)]">Console</span>
            </div>
            <ConnectionBadge status={connectionStatus} compact />
          </div>

          {/* Mobile tab bar */}
          <div
            className="flex shrink-0"
            style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
          >
            {(['list', 'map', 'detail'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMobileTab(tab)}
                className="flex-1 py-2.5 font-ui text-sm font-medium capitalize transition-colors"
                style={{
                  color: mobileTab === tab ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  borderBottom: `2px solid ${mobileTab === tab ? 'var(--accent-primary)' : 'transparent'}`,
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Mobile tab content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {mobileTab === 'list' && (
              <div className="h-full overflow-y-auto p-3 space-y-2">
                {filteredIncidents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
                    <Activity className="w-10 h-10 text-[var(--text-muted)]" />
                    <p className="font-display font-bold text-base text-[var(--text-primary)]">
                      No incidents right now
                    </p>
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
                  <APIProvider apiKey={mapsKey}>
                    <LiveMap
                      incidents={incidents}
                      showMyLocation
                      onMarkerClick={(id) => { setActiveId(id); setMobileTab('detail'); }}
                      showBoundary
                      height="100%"
                      selectedId={activeId}
                      className="rounded-none"
                    />
                  </APIProvider>
                ) : (
                  <div className="h-full flex items-center justify-center p-8 text-center">
                    <div>
                      <MapPin className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)]" />
                      <p className="font-ui text-sm text-[var(--text-muted)]">Map not configured</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {mobileTab === 'detail' && (
              <div className="h-full overflow-y-auto p-4">
                {activeIncident ? (
                  <IncidentDetail
                    incident={activeIncident}
                    onAck={() => handleAck(activeIncident.id)}
                    onDispatch={() => handleDispatch(activeIncident.id)}
                    disabled={actionLoading}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
                    <Crosshair className="w-8 h-8 text-[var(--text-muted)]" />
                    <p className="font-ui text-sm text-[var(--text-secondary)]">
                      Select an incident from the list
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function IncidentCard({
  incident,
  isNew,
  isSelected,
  onSelect,
  onAck,
  disabled,
}: {
  incident: Incident;
  isNew: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onAck: () => void;
  disabled?: boolean;
}) {
  const conf = STATUS_CONFIG[incident.status] ?? STATUS_CONFIG.pending;

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, y: -12 } : false}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-3 cursor-pointer transition-all duration-200"
      style={{
        background: isSelected ? 'var(--accent-blue-soft)' : 'var(--bg-surface)',
        borderLeft: `4px solid ${conf.border}`,
        boxShadow: isNew
          ? `var(--shadow-md), 0 0 0 2px ${conf.color}40`
          : isSelected
          ? 'var(--shadow-md)'
          : 'var(--shadow-sm)',
        border: isSelected ? `1px solid var(--accent-blue)` : `1px solid var(--border)`,
        borderLeftColor: conf.border,
        borderLeftWidth: '4px',
      }}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: conf.color }} />
          <span className="font-ui text-xs font-semibold" style={{ color: conf.color }}>
            {conf.label}
          </span>
        </div>
        <span className="font-ui text-xs text-[var(--text-muted)]">
          {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
        <MapPin className="w-3 h-3 shrink-0" />
        <span className="font-code">
          {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
        </span>
      </div>

      {incident.incident_type && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <Tag className="w-3 h-3" />
          <span className="font-ui capitalize">{incident.incident_type}</span>
        </div>
      )}

      {incident.status === 'pending' && (
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => { e.stopPropagation(); onAck(); }}
          className="mt-2 w-full py-1.5 rounded-full font-ui text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--accent-primary)' }}
        >
          Acknowledge
        </button>
      )}
    </motion.div>
  );
}

function IncidentDetail({
  incident,
  onAck,
  onDispatch,
  disabled,
}: {
  incident: Incident;
  onAck: () => void;
  onDispatch: () => void;
  disabled?: boolean;
}) {
  const conf = STATUS_CONFIG[incident.status] ?? STATUS_CONFIG.pending;
  const elapsed = formatDistanceToNow(new Date(incident.created_at), { addSuffix: true });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="p-4 rounded-2xl"
        style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-ui text-xs font-semibold"
            style={{ background: conf.bg, color: conf.color }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: conf.color }} />
            {conf.label}
          </span>
          <span className="font-code text-xs text-[var(--text-muted)]">
            #{incident.id.slice(0, 12)}…
          </span>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-2">
          <DetailRow icon={<MapPin className="w-4 h-4" />} label="Coordinates">
            <span className="font-code text-xs">{incident.lat.toFixed(5)}, {incident.lng.toFixed(5)}</span>
          </DetailRow>
          <DetailRow icon={<Clock className="w-4 h-4" />} label="Time">
            {elapsed}
          </DetailRow>
          {incident.accuracy_m != null && (
            <DetailRow icon={<AlertCircle className="w-4 h-4" />} label="Accuracy">
              ±{Math.round(incident.accuracy_m)}m
            </DetailRow>
          )}
          {incident.incident_type && (
            <DetailRow icon={<Tag className="w-4 h-4" />} label="Type">
              <span className="capitalize">{incident.incident_type}</span>
            </DetailRow>
          )}
        </div>

        {incident.border_proximity && (
          <div
            className="mt-3 px-3 py-2 rounded-xl flex items-center gap-2"
            style={{ background: 'var(--accent-amber-soft)', color: 'var(--accent-amber)' }}
          >
            <AlertCircle className="w-4 h-4" />
            <span className="font-ui text-xs font-semibold">
              Border proximity — verify jurisdiction
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        className="p-4 rounded-2xl"
        style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-sm)' }}
      >
        <h3 className="font-display font-bold text-sm text-[var(--text-primary)] mb-3">Actions</h3>
        <div className="flex gap-2">
          {incident.status === 'pending' && (
            <button
              type="button"
              disabled={disabled}
              onClick={onAck}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full font-ui text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--accent-green)' }}
            >
              <CheckCircle className="w-4 h-4" />
              Acknowledge
            </button>
          )}
          {(incident.status === 'pending' || incident.status === 'acknowledged') && (
            <button
              type="button"
              disabled={disabled}
              onClick={onDispatch}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full font-ui text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--accent-blue)' }}
            >
              <Truck className="w-4 h-4" />
              Dispatch
            </button>
          )}
        </div>
      </div>

      {/* Audit log */}
      <div
        className="p-4 rounded-2xl"
        style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-sm)' }}
      >
        <h3 className="font-display font-bold text-sm text-[var(--text-primary)] mb-3">
          Activity Log
        </h3>
        <div
          className="rounded-xl p-3 space-y-1.5 font-code text-xs text-[var(--text-secondary)]"
          style={{ background: 'var(--bg-base)' }}
        >
          <div>[{new Date(incident.created_at).toLocaleTimeString()}] incident.created</div>
          {incident.status !== 'pending' && (
            <div>[{new Date().toLocaleTimeString()}] incident.status → {incident.status}</div>
          )}
          <div className="text-[var(--text-muted)] animate-pulse">_</div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-[var(--text-muted)]">{icon}</span>
      <div>
        <div className="font-ui text-xs text-[var(--text-muted)]">{label}</div>
        <div className="font-ui text-sm text-[var(--text-primary)] mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function MapControl({
  icon,
  title,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
      style={{
        background: active ? 'var(--accent-primary)' : 'rgba(255,255,255,0.9)',
        boxShadow: 'var(--shadow-sm)',
        color: active ? '#FFFFFF' : 'var(--text-secondary)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {icon}
    </button>
  );
}
