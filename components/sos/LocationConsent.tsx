'use client';

import { AlertCircle, MapPin, Loader2 } from 'lucide-react';

interface LocationConsentProps {
  onGrant: () => void;
  loading?: boolean;
}

export function LocationConsent({ onGrant, loading }: LocationConsentProps) {
  return (
    <div
      className="w-full max-w-sm mx-auto p-6 text-center rounded-2xl"
      style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-md)' }}
    >
      <div
        className="mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--accent-blue-soft)' }}
      >
        <MapPin className="w-8 h-8" style={{ color: 'var(--accent-blue)' }} />
      </div>

      <h3 className="font-display font-bold text-xl text-[var(--text-primary)] mb-2">
        Location Required
      </h3>
      <p className="font-ui text-sm leading-relaxed text-[var(--text-secondary)] mb-6">
        EvacuAid needs your location to send emergency responders to your exact position.
        Your location is sent securely and only when you activate an SOS.
      </p>

      <button
        type="button"
        onClick={onGrant}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-display font-semibold text-base text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: 'var(--accent-primary)', boxShadow: 'var(--shadow-red)' }}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Requesting…
          </>
        ) : (
          'Allow Location Access'
        )}
      </button>

      <p className="mt-4 flex items-center justify-center gap-2 font-ui text-xs text-[var(--text-secondary)]">
        <AlertCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-amber)' }} />
        Click &quot;Allow&quot; when prompted by your browser
      </p>
    </div>
  );
}
