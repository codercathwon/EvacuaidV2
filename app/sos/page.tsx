'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  User, HeartPulse, Car, Flame, Waves, HelpCircle,
  Activity, Clock, CheckCircle, Users, MapPin, Home, Bell, Lock,
  Zap, Radio, Truck, CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { APIProvider } from '@vis.gl/react-google-maps';
import { SosButton } from '@/components/sos/SosButton';
import { LocationConsent } from '@/components/sos/LocationConsent';
import { LiveMap } from '@/components/map/LiveMap';
import { EmergencyChat } from '@/components/chat/EmergencyChat';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNearbyIncidents } from '@/hooks/useNearbyIncidents';
import { useLiveStats } from '@/hooks/useLiveStats';
import { useAllIncidentsChannel } from '@/hooks/useIncidentChannel';
import { createClient } from '@/lib/supabase/client';
import { Incident, IncidentType } from '@/types';

/* ── Constants ──────────────────────────────────────── */

const INCIDENT_TYPES: { type: IncidentType; label: string; icon: React.ReactNode }[] = [
  { type: 'injury',   label: 'Injury',   icon: <HeartPulse className="w-3.5 h-3.5" /> },
  { type: 'accident', label: 'Accident', icon: <Car className="w-3.5 h-3.5" /> },
  { type: 'fire',     label: 'Fire',     icon: <Flame className="w-3.5 h-3.5" /> },
  { type: 'other',    label: 'Flood',    icon: <Waves className="w-3.5 h-3.5" /> },
  { type: 'other',    label: 'Other',    icon: <HelpCircle className="w-3.5 h-3.5" /> },
];

const SOS_STEPS = [
  { key: 'sent',         label: 'Signal Sent',         icon: Zap },
  { key: 'located',      label: 'Location Confirmed',  icon: MapPin },
  { key: 'routed',       label: 'Routed to Tagum City', icon: Radio },
  { key: 'acknowledged', label: 'Responder Notified',  icon: Bell },
  { key: 'dispatched',   label: 'Help Dispatched',     icon: Truck },
] as const;

function getReachedSteps(status: string) {
  if (status === 'pending')     return 3;
  if (status === 'acknowledged') return 4;
  if (status === 'dispatched' || status === 'resolved') return 5;
  return 3;
}

/* ── Main page ───────────────────────────────────────── */

export default function SosPage() {
  const { getPosition, loading: geoLoading } = useGeolocation();
  const [coords, setCoords]         = useState<GeolocationCoordinates | null>(null);
  const [granted, setGranted]       = useState(false);
  const [incidentType, setIncidentType] = useState<IncidentType>(null);
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [incidentStatus, setIncidentStatus] = useState<string>('pending');
  const [incidents, setIncidents]   = useState<Incident[]>([]);
  const [showRoute, setShowRoute]       = useState(false);
  const [hospitalInfo, setHospitalInfo] = useState<{ name: string; distance: string; type?: string } | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const stats = useLiveStats();

  /* Fetch logged-in user's real name */
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from('profiles').select('full_name').eq('id', data.user.id).single();
      const name = (profile as { full_name?: string | null } | null)?.full_name;
      setUserDisplayName(name || data.user.email || null);
    });
  }, []);

  /* device_id for anonymous SOS */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('evacuaid_device_id')) {
      localStorage.setItem('evacuaid_device_id', crypto.randomUUID());
    }
  }, []);

  /* Load active incidents */
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('incidents')
      .select('*')
      .in('status', ['pending', 'acknowledged', 'dispatched'])
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { if (data) setIncidents(data as Incident[]); });
  }, []);

  useAllIncidentsChannel(
    (newInc) => setIncidents((prev) => prev.some((i) => i.id === newInc.id) ? prev : [newInc, ...prev]),
    (upd)    => setIncidents((prev) => prev.map((i) => (i.id === upd.id ? upd : i)))
  );

  /* Subscribe to own incident for timeline */
  useEffect(() => {
    if (!incidentId) return;
    const supabase = createClient();
    const ch = supabase
      .channel(`incident:own:${incidentId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'incidents',
        filter: `id=eq.${incidentId}`,
      }, (payload) => setIncidentStatus((payload.new as Incident).status))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [incidentId]);

  const nearby = useNearbyIncidents(
    coords?.latitude  ?? null,
    coords?.longitude ?? null,
    incidents,
    500
  );

  const handleGrantLocation = async () => {
    try {
      const pos = await getPosition();
      setCoords(pos.coords);
      setGranted(true);
    } catch (err) {
      console.error(err);
    }
  };

  const executeSos = useCallback(async () => {
    if (!coords) throw new Error('Location not available');
    const deviceId = (typeof window !== 'undefined' && localStorage.getItem('evacuaid_device_id')) || undefined;

    const res = await fetch('/api/sos/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy,
        timestamp: Date.now(),
        device_id: deviceId,
        device_fp: navigator.userAgent,
        incident_type: incidentType,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || 'Failed to submit SOS');
    }

    const data = await res.json();
    setIncidentId(data.incident_id);
    setIncidentStatus('pending');
    setShowRoute(true);
    if (navigator.vibrate) navigator.vibrate([200]);
  }, [coords, incidentType]);

  const raw = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  const mapsKey = raw && !raw.startsWith('__') ? raw : '';

  const activeCount = incidents.filter(
    (i) => ['pending', 'acknowledged', 'dispatched'].includes(i.status)
  ).length;

  const content = (
    <main className="min-h-[100dvh] lg:h-[100dvh] flex flex-col" style={{ background: 'var(--bg-base)' }}>

      {/* ── Top nav ───────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 h-14 shrink-0"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)', boxShadow: 'var(--shadow-xs)' }}
      >
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="EvacuAid" className="w-7 h-7" />
          <span className="font-ui font-semibold text-base text-[var(--text-primary)]">EvacuAid</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 font-ui text-sm text-[var(--text-muted)]">
            <MapPin className="w-4 h-4" />
            Tagum City
          </span>
          {userDisplayName ? (
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-ui font-bold text-xs text-white shrink-0"
                style={{ background: 'var(--accent-primary)' }}
              >
                {userDisplayName[0].toUpperCase()}
              </div>
              <span className="font-ui text-sm font-medium text-[var(--text-primary)] hidden sm:block">{userDisplayName}</span>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-ui text-sm font-medium transition-colors hover:bg-[var(--bg-base)]"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              <User className="w-3.5 h-3.5" />
              Login
            </Link>
          )}
        </div>
      </header>

      {/* ── Body layout ───────────────────────────────── */}
      <div className="flex-1 lg:grid lg:grid-cols-[500px_1fr] lg:overflow-hidden lg:min-h-0">

        {/* Left column */}
        <div
          className="flex flex-col gap-5 pt-6 pb-24 lg:pb-8 lg:overflow-y-auto lg:h-full"
          style={{ borderRight: '1px solid var(--border-light)' }}
        >
          {/* Hero */}
          <section className="px-4">
            <h1 style={{ lineHeight: 1.15, margin: 0 }}>
              <span
                className="block font-display"
                style={{
                  fontSize: 'clamp(2rem, 5vw, 2.8rem)',
                  fontWeight: 600,
                  letterSpacing: '-0.03em',
                  color: 'var(--text-primary)',
                }}
              >
                You evacuate,
              </span>
              <span
                className="block font-serif"
                style={{
                  fontSize: 'clamp(2rem, 5vw, 2.8rem)',
                  fontWeight: 400,
                  fontStyle: 'italic',
                  letterSpacing: '-0.01em',
                  color: '#FF4B4B',
                }}
              >
                we show aid.
              </span>
            </h1>
            <p className="mt-3 font-ui text-base text-[var(--text-secondary)] leading-relaxed" style={{ maxWidth: 400 }}>
              Instant SOS to Tagum City emergency services.
              Your location is shared only when you activate.
            </p>
          </section>

          {/* Live stats bar */}
          <section className="px-4">
            <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
              <StatCard icon={<Activity className="w-3.5 h-3.5" />} value={stats.active_now} label="active now" color="var(--accent-primary)" />
              <StatCard icon={<Users    className="w-3.5 h-3.5" />} value={nearby.length}    label="within 500m" color="var(--accent-blue)" />
              <StatCard
                icon={<Clock className="w-3.5 h-3.5" />}
                value={stats.avg_ack_seconds != null ? `${stats.avg_ack_seconds.toFixed(1)}s` : '—'}
                label="avg response"
                color="var(--accent-amber)"
              />
              <StatCard icon={<CheckCircle className="w-3.5 h-3.5" />} value={stats.resolved_today} label="resolved today" color="var(--accent-green)" />
            </div>
          </section>

          {/* SOS button */}
          <section className="flex flex-col items-center py-4">
            <AnimatePresence mode="wait">
              {!granted ? (
                <motion.div key="consent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <LocationConsent onGrant={handleGrantLocation} loading={geoLoading} />
                </motion.div>
              ) : incidentId ? (
                <motion.div key="timeline" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm px-4 space-y-3">
                  <StatusTimeline incidentId={incidentId} status={incidentStatus} createdAt={new Date().toISOString()} />
                  {hospitalInfo ? (
                    <div
                      className="rounded-xl p-3 flex items-center gap-3"
                      style={{ background: 'var(--bg-surface)', border: '1px solid rgba(0,196,140,0.4)', boxShadow: 'var(--shadow-xs)' }}
                    >
                      <MapPin className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-green)' }} />
                      <div className="min-w-0">
                        <p className="font-ui font-semibold text-xs" style={{ color: 'var(--accent-green)' }}>
                          Nearest Safety Location{hospitalInfo.type ? ` · ${hospitalInfo.type}` : ''}
                        </p>
                        <p className="font-ui text-sm font-medium text-[var(--text-primary)] truncate">{hospitalInfo.name}</p>
                        <p className="font-ui text-xs text-[var(--text-muted)]">{hospitalInfo.distance} away · route on map</p>
                      </div>
                    </div>
                  ) : (
                    <p className="font-ui text-xs text-center text-[var(--text-muted)] animate-pulse">Finding nearest safety location…</p>
                  )}
                </motion.div>
              ) : (
                <motion.div key="sos" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <SosButton onActivate={executeSos} />
                </motion.div>
              )}
            </AnimatePresence>

            {!incidentId && (
              <div className="flex flex-col items-center gap-2 mt-4">
                <p className="flex items-center gap-1.5 font-ui text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
                  <MapPin className="w-3 h-3" />
                  Tagum City Emergency Services
                </p>
                <p className="flex items-center gap-1.5 font-ui text-xs text-[var(--text-muted)]">
                  <Lock className="w-3 h-3" />
                  Location shared only when you activate
                </p>
              </div>
            )}
          </section>

          {/* Incident type */}
          <AnimatePresence>
            {granted && !incidentId && (
              <motion.section
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="px-4"
              >
                <p className="font-ui font-medium text-sm text-[var(--text-primary)] mb-3">
                  What&rsquo;s your emergency?
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {INCIDENT_TYPES.map(({ type, label, icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setIncidentType(incidentType === type && label === 'Other' ? null : type)}
                      className="flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap shrink-0 font-ui text-sm font-medium transition-all duration-200"
                      style={{
                        background:  incidentType === type ? 'var(--accent-primary)' : 'var(--bg-surface)',
                        color:       incidentType === type ? '#FFFFFF' : 'var(--text-secondary)',
                        border:      `1px solid ${incidentType === type ? 'var(--accent-primary)' : 'var(--border)'}`,
                        boxShadow:   'var(--shadow-xs)',
                      }}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* AI Emergency Guide — inline card */}
          <section className="px-4">
            <EmergencyChat variant="inline" />
          </section>

          {/* Mobile map section */}
          <section id="map-section" className="px-4 lg:hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="font-ui font-semibold text-sm text-[var(--text-primary)]">Live map</span>
              <span
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-ui font-medium text-xs text-white"
                style={{ background: 'var(--accent-primary)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                {activeCount} active
              </span>
            </div>
            <div className="h-[380px] rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
              {mapsKey ? (
                <LiveMap
                  incidents={incidents}
                  showMyLocation
                  showBoundary
                  height="100%"
                  className="rounded-none"
                  showHospitalRoute={showRoute}
                  userCoords={coords ? { lat: coords.latitude, lng: coords.longitude } : null}
                  onHospitalFound={(name, dist, type) => setHospitalInfo({ name, distance: dist, type })}
                />
              ) : (
                <MapPlaceholder />
              )}
            </div>
          </section>

        </div>

        {/* Right column — desktop map (full height sticky) */}
        <div className="hidden lg:flex flex-col" id="map-section-desktop">
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--bg-surface)' }}>
            <span className="font-ui font-semibold text-sm text-[var(--text-primary)]">Live map</span>
            <span
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-ui font-medium text-xs text-white"
              style={{ background: 'var(--accent-primary)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
              {activeCount} active
            </span>
          </div>
          <div className="flex-1 min-h-0">
            {mapsKey ? (
              <LiveMap
                incidents={incidents}
                showMyLocation
                showBoundary
                height="100%"
                className="rounded-none"
                showHospitalRoute={showRoute}
                userCoords={coords ? { lat: coords.latitude, lng: coords.longitude } : null}
                onHospitalFound={(name, dist, type) => setHospitalInfo({ name, distance: dist, type })}
              />
            ) : (
              <MapPlaceholder />
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile bottom nav ─────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around h-16"
        style={{
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-light)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.06)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <BottomNavItem href="/"        label="Home"   icon={<Home   className="w-5 h-5" />} active />
        <BottomNavItem href="#map-section" label="Map" icon={<MapPin className="w-5 h-5" />} scroll />
        <BottomNavItem href="/login"   label="Account" icon={<User  className="w-5 h-5" />} />
      </nav>
    </main>
  );
  return mapsKey ? <APIProvider apiKey={mapsKey} libraries={['places']}>{content}</APIProvider> : content;
}

/* ── Sub-components ──────────────────────────────────── */

function StatCard({
  icon, value, label, color,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <div
      className="flex flex-col gap-1 px-4 py-3 rounded-xl shrink-0 min-w-[120px] snap-start"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-xs)' }}
    >
      <span style={{ color }}>{icon}</span>
      <span className="font-ui font-semibold text-base text-[var(--text-primary)] leading-none">{value}</span>
      <span className="font-ui text-xs text-[var(--text-muted)]">{label}</span>
    </div>
  );
}

function BottomNavItem({
  href, label, icon, active, scroll,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  scroll?: boolean;
}) {
  const style = { color: active ? 'var(--accent-primary)' : 'var(--text-secondary)' };

  if (scroll) {
    return (
      <button
        type="button"
        onClick={() => document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' })}
        className="flex flex-col items-center gap-1 px-4 min-h-[44px] justify-center"
        style={style}
      >
        {icon}
        <span className="font-ui text-xs font-medium">{label}</span>
      </button>
    );
  }

  return (
    <Link href={href} className="flex flex-col items-center gap-1 px-4 min-h-[44px] justify-center" style={style}>
      {icon}
      <span className="font-ui text-xs font-medium">{label}</span>
    </Link>
  );
}

function MapPlaceholder() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8" style={{ background: '#F0F4F8' }}>
      <MapPin className="w-10 h-10 text-[var(--text-muted)]" />
      <div className="text-center">
        <p className="font-ui font-semibold text-sm text-[var(--text-primary)]">Map not configured</p>
        <p className="font-ui text-xs text-[var(--text-secondary)] mt-1">
          Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the live map.
        </p>
      </div>
    </div>
  );
}

function StatusTimeline({ incidentId, status, createdAt }: { incidentId: string; status: string; createdAt: string }) {
  const reachedCount = getReachedSteps(status);
  const isDispatched = status === 'dispatched' || status === 'resolved';

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: isDispatched ? 'var(--accent-green-soft)' : 'var(--accent-primary-soft)' }}
        >
          {isDispatched
            ? <Truck className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
            : <Zap   className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
          }
        </div>
        <div>
          <p className="font-ui font-semibold text-sm text-[var(--text-primary)]">
            {isDispatched ? 'Help is on the way' : 'Signal sent'}
          </p>
          <p className="font-mono text-xs text-[var(--text-muted)]">#{incidentId.slice(0, 12)}…</p>
        </div>
      </div>

      <div className="space-y-3">
        {SOS_STEPS.map((step, idx) => {
          const reached = idx < reachedCount;
          const active  = idx === reachedCount - 1;
          const Icon    = step.icon;
          const ts      = reached
            ? new Date(new Date(createdAt).getTime() + idx * 700).toLocaleTimeString()
            : null;

          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="flex items-center gap-3"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: reached ? (active ? 'var(--accent-primary)' : 'var(--accent-green)') : 'var(--border-light)',
                  border:     reached ? 'none' : '2px solid var(--border)',
                }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: reached ? '#FFFFFF' : 'var(--text-muted)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-ui text-sm font-medium" style={{ color: reached ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {step.label}
                </p>
                {ts ? (
                  <p className="font-mono text-xs text-[var(--text-muted)]">{ts}</p>
                ) : (
                  <p className="font-ui text-xs text-[var(--text-muted)] animate-pulse">Waiting…</p>
                )}
              </div>
              {reached && (
                <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: active ? 'var(--accent-primary)' : 'var(--accent-green)' }} />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
