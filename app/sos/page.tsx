'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SosButton } from '@/components/sos/SosButton';
import { LocationConsent } from '@/components/sos/LocationConsent';
import { useGeolocation } from '@/hooks/useGeolocation';

export default function SosPage() {
  const router = useRouter();
  const { getPosition, loading: geoLoading, error: geoError } = useGeolocation();
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null);
  const [granted, setGranted] = useState(false);
  const [sosUiStatus, setSosUiStatus] = useState<'idle' | 'holding' | 'loading' | 'success' | 'error'>('idle');
  const [timelineStep, setTimelineStep] = useState<0 | 1 | 2>(0);

  // When user clicks 'Allow'
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
    if (!coords) throw new Error("Location not available");

    // We build the body payload
    const payloadInfo = {
      lat: coords.latitude,
      lng: coords.longitude,
      accuracy: coords.accuracy,
      timestamp: Date.now(),
      device_fp: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    };

    // Client posts to /api/sos/ingest
    const response = await fetch('/api/sos/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadInfo),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      if (response.status === 422) {
        throw new Error('JURISDICTION_NOT_FOUND: Your location is outside the supported coverage area.');
      }
      throw new Error(errorData?.error || 'Failed to submit SOS');
    }

    const data = await response.json();
    
    // Redirect to status timeline shortly after
    setTimeout(() => {
      router.push(`/sos/status/${data.incident_id}`);
    }, 2000);

  }, [coords, router]);

  useEffect(() => {
    if (sosUiStatus === 'success') {
      setTimelineStep(0);
      const t1 = window.setTimeout(() => setTimelineStep(1), 500);
      const t2 = window.setTimeout(() => setTimelineStep(2), 1150);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }
  }, [sosUiStatus]);

  const showTimeline = useMemo(() => sosUiStatus === 'success', [sosUiStatus]);

  return (
    <main className="min-h-[100dvh] bg-[color:var(--bg-base)] text-[color:var(--text-primary)]">
      <div className="mx-auto w-full max-w-5xl min-h-[100dvh] px-4 sm:px-6 flex flex-col">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between">
          <div className="font-display font-bold text-[20px] tracking-[0.08em]">
            EVACUAID
          </div>
          <Link
            href="/login"
            className="font-ui text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)] transition-colors duration-[150ms] ease-out"
          >
            Sign in
          </Link>
        </header>

        {/* Hero */}
        <section className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <div className="w-full max-w-xl flex flex-col items-center justify-center gap-7" style={{ minHeight: '70dvh' }}>
            <div className="font-ui text-[11px] uppercase tracking-[0.35em] text-[color:var(--text-secondary)]">
              EMERGENCY RESPONSE SYSTEM
            </div>

            {!granted ? (
              <LocationConsent onGrant={handleGrantLocation} loading={geoLoading} />
            ) : (
              <SosButton
                onActivate={executeSos}
                onStatusChange={setSosUiStatus}
              />
            )}

            {geoError && !granted && (
              <div className="w-full max-w-md border border-[color:var(--accent-red)]/40 bg-[color:var(--bg-surface)] p-4 text-left">
                <div className="font-display font-bold tracking-wide text-[color:var(--accent-red-glow)]">
                  LOCATION ERROR
                </div>
                <div className="mt-1 font-ui text-[12px] text-[color:var(--text-secondary)]">
                  {geoError}. Please enable location permissions in your browser settings to continue.
                </div>
              </div>
            )}

            {showTimeline && (
              <StatusTimeline step={timelineStep} />
            )}
          </div>
        </section>

        {/* Bottom */}
        <footer className="pb-6 pt-2 flex flex-col items-center gap-2 text-center">
          <div className="font-ui text-[11px] text-[color:var(--text-muted)]">
            Location consent required on activation
          </div>
          <Link
            href="/login"
            className="font-ui text-[11px] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors duration-[150ms] ease-out"
          >
            Are you a responder? Sign in to console →
          </Link>
        </footer>
      </div>
    </main>
  );
}

function StatusTimeline({ step }: { step: 0 | 1 | 2 }) {
  const steps = [
    { label: 'SENT', reached: true },
    { label: 'ROUTED', reached: step >= 1 },
    { label: 'ACKNOWLEDGED', reached: step >= 2 },
  ] as const;

  return (
    <div className="w-full max-w-xl mt-2">
      <div className="font-ui text-[11px] uppercase tracking-[0.24em] text-[color:var(--text-muted)] mb-3">
        Status
      </div>
      <div className="relative flex items-center justify-between gap-4">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-[color:var(--border-bright)]" />
        {steps.map((s) => (
          <div key={s.label} className="relative flex flex-col items-center gap-2">
            <div
              className="w-3.5 h-3.5 border border-[color:var(--border-bright)] bg-[color:var(--bg-base)]"
              style={{
                backgroundColor: s.reached ? 'var(--accent-green)' : 'var(--bg-base)',
                transition: 'background-color 300ms ease, border-color 300ms ease',
                borderColor: s.reached ? 'color-mix(in srgb, var(--accent-green) 55%, var(--border-bright))' : 'var(--border-bright)',
              }}
            />
            <div className="font-ui text-[10px] uppercase tracking-[0.22em] text-[color:var(--text-secondary)]">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
