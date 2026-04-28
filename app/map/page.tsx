'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Filter, RefreshCw, MapPin, Clock, Navigation2, AlertTriangle, X, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { APIProvider } from '@vis.gl/react-google-maps';
import { LiveMap } from '@/components/map/LiveMap';
import { LiveStats } from '@/components/stats/LiveStats';
import { useAllIncidentsChannel } from '@/hooks/useIncidentChannel';
import { useNearbyIncidents, haversineMeters } from '@/hooks/useNearbyIncidents';
import { Incident } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#FF4B4B', bg: '#FFF0F0' },
  acknowledged: { label: 'Acknowledged', color: '#FFB547', bg: '#FFF8ED' },
  dispatched: { label: 'Dispatched', color: '#00C48C', bg: '#E8FBF5' },
  resolved: { label: 'Resolved', color: '#9CA3AF', bg: '#F3F4F6' },
  cancelled: { label: 'Cancelled', color: '#9CA3AF', bg: '#F3F4F6' },
};

const FILTER_OPTIONS = ['all', 'pending', 'acknowledged', 'dispatched'] as const;
type FilterOption = (typeof FILTER_OPTIONS)[number];

export default function MapPage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterOption>('all');
  const [showFilter, setShowFilter] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('incidents')
      .select('*')
      .in('status', ['pending', 'acknowledged', 'dispatched'])
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setIncidents(data as Incident[]);
        setLoading(false);
      });

    navigator.geolocation?.getCurrentPosition((pos) => {
      setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('incidents')
      .select('*')
      .in('status', ['pending', 'acknowledged', 'dispatched'])
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    if (data) setIncidents(data as Incident[]);
    setLoading(false);
  }, []);

  useAllIncidentsChannel(
    (newInc) => setIncidents((prev) => [newInc, ...prev]),
    (upd) => setIncidents((prev) => prev.map((i) => (i.id === upd.id ? upd : i)))
  );

  const nearbyIncidents = useNearbyIncidents(
    userCoords?.lat ?? null,
    userCoords?.lng ?? null,
    incidents,
    500
  );

  const filteredIncidents = filter === 'all'
    ? incidents
    : incidents.filter((i) => i.status === filter);

  const activeCount = incidents.filter((i) => ['pending', 'acknowledged', 'dispatched'].includes(i.status)).length;
  const selectedIncident = incidents.find((i) => i.id === selectedId) ?? null;

  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  return (
    <main
      className="h-[100dvh] flex flex-col overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Overlay top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
        <div className="mx-4 mt-4 pointer-events-auto">
          <div
            className="rounded-2xl px-4 py-3"
            style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(12px)',
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="p-1.5 rounded-xl hover:bg-[var(--bg-base)] transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
                </button>
                <span className="font-display font-bold text-lg text-[var(--text-primary)]">
                  Live Map
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilter(!showFilter)}
                  className="p-2 rounded-xl hover:bg-[var(--bg-base)] transition-colors"
                  title="Filter incidents"
                >
                  <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="p-2 rounded-xl hover:bg-[var(--bg-base)] transition-colors"
                  title="Refresh"
                  disabled={loading}
                >
                  <RefreshCw
                    className={`w-4 h-4 text-[var(--text-secondary)] ${loading ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-2 flex items-center gap-3 text-xs font-ui text-[var(--text-secondary)]">
              <span className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'var(--accent-primary)' }}
                />
                {incidents.filter((i) => i.status === 'pending').length} pending
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'var(--accent-amber)' }}
                />
                {incidents.filter((i) => i.status === 'acknowledged').length} acknowledged
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'var(--accent-green)' }}
                />
                {incidents.filter((i) => i.status === 'dispatched').length} dispatched
              </span>
            </div>

            {/* Filter pills */}
            <AnimatePresence>
              {showFilter && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                    {FILTER_OPTIONS.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFilter(f)}
                        className="px-3 py-1.5 rounded-full font-ui text-xs font-medium capitalize transition-all"
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Active count badge (top right) */}
      <div className="absolute top-4 right-4 z-30 mt-[5.5rem] pointer-events-none">
        <div
          className="px-3 py-1.5 rounded-full font-display font-bold text-sm text-white flex items-center gap-2"
          style={{ background: 'var(--accent-primary)', boxShadow: 'var(--shadow-red)' }}
        >
          <Activity className="w-3.5 h-3.5" />
          {activeCount} live incident{activeCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Nearby alert banner */}
      <AnimatePresence>
        {nearbyIncidents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-30"
            style={{ top: '5rem', left: '1rem', right: '1rem' }}
          >
            <div
              className="mt-2 px-4 py-3 rounded-2xl flex items-center gap-3"
              style={{
                background: 'rgba(255,181,71,0.95)',
                backdropFilter: 'blur(8px)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <AlertTriangle className="w-5 h-5 text-white shrink-0" />
              <span className="font-ui text-sm font-semibold text-white">
                Emergency reported {Math.round(nearbyIncidents[0].distanceMeters)}m from your location
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map (full screen) */}
      <div className="flex-1 relative">
        {mapsKey ? (
          <APIProvider apiKey={mapsKey}>
            <LiveMap
              incidents={filteredIncidents}
              showMyLocation
              onMarkerClick={(id) => setSelectedId(id)}
              showBoundary
              height="100%"
              selectedId={selectedId}
              className="rounded-none"
            />
          </APIProvider>
        ) : (
          <MapPlaceholder incidents={filteredIncidents} />
        )}
      </div>

      {/* Bottom sheet / incident detail */}
      <AnimatePresence>
        {selectedIncident && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute bottom-0 left-0 right-0 z-40 rounded-t-3xl"
            style={{
              background: 'var(--bg-surface)',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.12)',
            }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="w-8 h-1 rounded-full bg-[var(--border-medium)] mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="ml-auto p-1.5 rounded-xl hover:bg-[var(--bg-base)] transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            <IncidentDetail
              incident={selectedIncident}
              userCoords={userCoords}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function IncidentDetail({
  incident,
  userCoords,
}: {
  incident: Incident;
  userCoords: { lat: number; lng: number } | null;
}) {
  const statusConf = STATUS_LABELS[incident.status] ?? STATUS_LABELS.pending;
  const distM = userCoords
    ? Math.round(haversineMeters(userCoords.lat, userCoords.lng, incident.lat, incident.lng))
    : null;
  const distStr = distM != null
    ? distM >= 1000
      ? `${(distM / 1000).toFixed(1)}km from you`
      : `${distM}m from you`
    : null;

  return (
    <div className="px-5 pb-8">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-ui text-xs font-semibold mb-2"
            style={{ background: statusConf.bg, color: statusConf.color }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: statusConf.color }}
            />
            {statusConf.label}
          </div>
          <div className="font-code text-xs text-[var(--text-muted)]">
            #{incident.id.slice(0, 12)}...
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <InfoRow icon={<Clock className="w-4 h-4" />} label={formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })} />
        {distStr && <InfoRow icon={<MapPin className="w-4 h-4" />} label={distStr} />}
        {incident.incident_type && (
          <InfoRow icon={<AlertTriangle className="w-4 h-4" />} label={incident.incident_type} />
        )}
        <InfoRow
          icon={<Navigation2 className="w-4 h-4" />}
          label={`${incident.lat.toFixed(4)}, ${incident.lng.toFixed(4)}`}
        />
      </div>
    </div>
  );
}

function InfoRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
      <span className="text-[var(--text-muted)]">{icon}</span>
      <span className="font-ui capitalize">{label}</span>
    </div>
  );
}

function MapPlaceholder({ incidents }: { incidents: Incident[] }) {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-4 p-8"
      style={{ background: '#F0F4F8' }}
    >
      <MapPin className="w-12 h-12 text-[var(--text-muted)]" />
      <div className="text-center">
        <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">
          Map not configured
        </h3>
        <p className="font-ui text-sm text-[var(--text-secondary)] mt-1">
          Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the map.
        </p>
        <p className="font-ui text-sm text-[var(--text-muted)] mt-3">
          {incidents.length} incident{incidents.length !== 1 ? 's' : ''} loaded
        </p>
      </div>
    </div>
  );
}
