'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Map, User, HeartPulse, Car, Flame, HelpCircle, Activity, Clock, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SosButton } from '@/components/sos/SosButton';
import { LocationConsent } from '@/components/sos/LocationConsent';
import { NearbyAlert } from '@/components/map/NearbyAlert';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNearbyIncidents } from '@/hooks/useNearbyIncidents';
import { useLiveStats } from '@/hooks/useLiveStats';
import { useAllIncidentsChannel } from '@/hooks/useIncidentChannel';
import { Incident, IncidentType } from '@/types';
import { createClient } from '@/lib/supabase/client';

const INCIDENT_TYPES: { type: IncidentType; label: string; icon: React.ReactNode }[] = [
  { type: 'injury', label: "I'm injured", icon: <HeartPulse className="w-4 h-4" /> },
  { type: 'accident', label: 'Accident', icon: <Car className="w-4 h-4" /> },
  { type: 'fire', label: 'Fire', icon: <Flame className="w-4 h-4" /> },
  { type: 'other', label: 'Other emergency', icon: <HelpCircle className="w-4 h-4" /> },
];

export default function SosPage() {
  const router = useRouter();
  const { getPosition, loading: geoLoading } = useGeolocation();
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null);
  const [granted, setGranted] = useState(false);
  const [sosStatus, setSosStatus] = useState<'idle' | 'holding' | 'loading' | 'success' | 'error'>('idle');
  const [incidentType, setIncidentType] = useState<IncidentType>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const stats = useLiveStats();

  // Load initial incidents for nearby check
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('incidents')
      .select('*')
      .in('status', ['pending', 'acknowledged', 'dispatched'])
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setIncidents(data as Incident[]);
      });
  }, []);

  useAllIncidentsChannel(
    (newInc) => setIncidents((prev) => [newInc, ...prev]),
    (upd) => setIncidents((prev) => prev.map((i) => (i.id === upd.id ? upd : i)))
  );

  const nearby = useNearbyIncidents(
    coords?.latitude ?? null,
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

    const response = await fetch('/api/sos/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy,
        timestamp: Date.now(),
        device_fp: navigator.userAgent,
        incident_type: incidentType,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.error || 'Failed to submit SOS');
    }

    const data = await response.json();
    setTimeout(() => {
      router.push(`/sos/status/${data.incident_id}`);
    }, 2000);
  }, [coords, router, incidentType]);

  return (
    <main
      className="min-h-[100dvh] flex flex-col"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Top bar */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 h-14"
        style={{
          background: 'var(--bg-surface)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
          <span className="font-display font-bold text-lg text-[var(--text-primary)]">EvacuAid</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/map"
            className="p-2 rounded-xl hover:bg-[var(--bg-base)] transition-colors"
            aria-label="Live Map"
          >
            <Map className="w-5 h-5 text-[var(--text-secondary)]" />
          </Link>
          <Link
            href="/login"
            className="p-2 rounded-xl hover:bg-[var(--bg-base)] transition-colors"
            aria-label="Profile"
          >
            <User className="w-5 h-5 text-[var(--text-secondary)]" />
          </Link>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 flex flex-col gap-4 pb-24 lg:pb-6">
        {/* Desktop: two-column */}
        <div className="lg:grid lg:grid-cols-[480px_1fr] lg:gap-0 lg:min-h-[calc(100dvh-3.5rem)] lg:h-[calc(100dvh-3.5rem)]">
          {/* Left column */}
          <div className="flex flex-col gap-4 pt-4 overflow-y-auto lg:overflow-y-auto lg:h-full lg:border-r lg:border-[var(--border)]">
            {/* Hero card */}
            <div
              className="mx-4 px-5 py-5 rounded-2xl"
              style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-md)' }}
            >
              <h1 className="font-display font-extrabold text-3xl text-[var(--text-primary)] leading-tight">
                Emergency Help Needed?
              </h1>
              <p className="font-ui text-sm text-[var(--text-secondary)] mt-2">
                Hold the button and help reaches you.
              </p>
            </div>

            {/* Nearby alert */}
            {granted && nearby.length > 0 && (
              <NearbyAlert nearby={nearby} />
            )}

            {/* SOS Button */}
            <div className="flex flex-col items-center py-6">
              <AnimatePresence mode="wait">
                {!granted ? (
                  <motion.div
                    key="consent"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <LocationConsent onGrant={handleGrantLocation} loading={geoLoading} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="sos"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <SosButton onActivate={executeSos} onStatusChange={setSosStatus} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Incident type selector */}
            <AnimatePresence>
              {granted && sosStatus !== 'success' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mx-4"
                >
                  <p className="font-ui text-xs text-[var(--text-muted)] mb-2 font-medium uppercase tracking-wide">
                    What happened?
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {INCIDENT_TYPES.map(({ type, label, icon }) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setIncidentType(incidentType === type ? null : type)}
                        className="flex items-center gap-2 px-3 py-2 rounded-full whitespace-nowrap shrink-0 font-ui text-sm font-medium transition-all duration-200"
                        style={{
                          background: incidentType === type
                            ? 'var(--accent-primary)'
                            : 'var(--bg-surface)',
                          color: incidentType === type
                            ? '#FFFFFF'
                            : 'var(--text-secondary)',
                          boxShadow: 'var(--shadow-sm)',
                          border: incidentType === type
                            ? '1px solid var(--accent-primary)'
                            : '1px solid var(--border)',
                        }}
                      >
                        {icon}
                        {label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Live stats */}
            <div className="mx-4">
              <p className="font-ui text-xs text-[var(--text-muted)] mb-2 font-medium uppercase tracking-wide">
                Live Status
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <StatPill
                  icon={<Activity className="w-3.5 h-3.5" />}
                  value={stats.active_now}
                  label="active now"
                  color="var(--accent-primary)"
                  soft="var(--accent-primary-soft)"
                />
                <StatPill
                  icon={<Clock className="w-3.5 h-3.5" />}
                  value={stats.avg_ack_seconds != null ? `${stats.avg_ack_seconds.toFixed(1)}s` : '—'}
                  label="avg response"
                  color="var(--accent-amber)"
                  soft="var(--accent-amber-soft)"
                />
                <StatPill
                  icon={<CheckCircle className="w-3.5 h-3.5" />}
                  value={stats.resolved_today}
                  label="resolved today"
                  color="var(--accent-green)"
                  soft="var(--accent-green-soft)"
                />
              </div>
            </div>

            {/* Footer links */}
            <div className="mx-4 pb-4">
              <div className="font-ui text-xs text-[var(--text-muted)] text-center space-y-2 mt-2">
                <p>Location consent required on activation</p>
                <Link
                  href="/console"
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Are you a responder? Open Console →
                </Link>
              </div>
            </div>
          </div>

          {/* Right column: embedded map (desktop only) */}
          <div className="hidden lg:block relative">
            <EmbeddedMapPlaceholder />
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around px-4 py-2"
        style={{
          background: 'var(--bg-surface)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
          borderTop: '1px solid var(--border)',
        }}
      >
        <BottomNavItem href="/" label="Home" icon={<Shield className="w-5 h-5" />} active />
        <BottomNavItem href="/map" label="Live Map" icon={<Map className="w-5 h-5" />} />
        <BottomNavItem href="/login" label="Profile" icon={<User className="w-5 h-5" />} />
      </nav>
    </main>
  );
}

function StatPill({
  icon,
  value,
  label,
  color,
  soft,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string;
  soft: string;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-full whitespace-nowrap shrink-0"
      style={{
        background: soft,
        border: `1px solid ${color}30`,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <span style={{ color }}>{icon}</span>
      <span className="font-display font-bold text-sm text-[var(--text-primary)]">{value}</span>
      <span className="font-ui text-xs text-[var(--text-secondary)]">{label}</span>
    </div>
  );
}

function BottomNavItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 px-4 py-1"
      style={{ color: active ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
    >
      {icon}
      <span className="font-ui text-xs font-medium">{label}</span>
    </Link>
  );
}

function EmbeddedMapPlaceholder() {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-4"
      style={{ background: 'var(--bg-base)' }}
    >
      <div
        className="p-6 rounded-2xl text-center max-w-xs"
        style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-md)' }}
      >
        <Map className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--accent-primary)' }} />
        <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">Live Incident Map</h3>
        <p className="font-ui text-sm text-[var(--text-secondary)] mt-2">
          Real-time emergency incidents in Tagum City
        </p>
        <Link
          href="/map"
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-ui text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--accent-primary)' }}
        >
          Open Full Map
        </Link>
      </div>
    </div>
  );
}
