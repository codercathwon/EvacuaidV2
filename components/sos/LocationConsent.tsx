'use client';
import { AlertCircle, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationConsentProps {
  onGrant: () => void;
  loading?: boolean;
}

export function LocationConsent({ onGrant, loading }: LocationConsentProps) {
  return (
    <div className="w-full max-w-md mx-auto border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-6 sm:p-7 text-center">
      <div className="mx-auto mb-4 w-16 h-16 border border-[color:var(--border-bright)] bg-[color:var(--bg-elevated)] flex items-center justify-center">
        <MapPin className="w-8 h-8 text-[color:var(--accent-blue)]" />
      </div>
      <h3 className="font-display text-xl font-bold tracking-wide text-[color:var(--text-primary)] mb-2">Location Required</h3>
      <p className="font-ui text-[12px] leading-relaxed text-[color:var(--text-secondary)] mb-6">
        EvacuAid needs your location to send emergency responders to your exact position. Your location is sent securely and only when you activate an SOS.
      </p>
      <Button 
        size="lg" 
        className="w-full font-ui font-semibold bg-[color:var(--accent-blue)] hover:bg-[color:var(--accent-blue)]/90 text-[color:var(--text-primary)] py-6 text-[12px] uppercase tracking-[0.2em] transition-colors duration-[150ms] ease-out"
        onClick={onGrant}
        disabled={loading}
      >
        {loading ? 'Requesting...' : 'Allow Location Access'}
      </Button>
      <p className="mt-4 flex items-center justify-center gap-2 font-ui text-[11px] text-[color:var(--text-secondary)]">
        <AlertCircle className="w-4 h-4 text-[color:var(--accent-amber)]" /> Please click &quot;Allow&quot; when prompted
      </p>
    </div>
  );
}
