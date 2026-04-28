'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SosButton } from '@/components/sos/SosButton';
import { LocationConsent } from '@/components/sos/LocationConsent';
import { useGeolocation } from '@/hooks/useGeolocation';
import * as jose from 'jose';

export default function SosPage() {
  const router = useRouter();
  const { getPosition, loading: geoLoading, error: geoError } = useGeolocation();
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null);
  const [granted, setGranted] = useState(false);

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

  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md mx-auto flex flex-col items-center text-center">
        
        <div className="mb-12">
          <h1 className="text-4xl font-black tracking-tight text-foreground uppercase mb-2">EvacuAid</h1>
          <p className="text-muted-foreground font-medium">Emergency Response System</p>
        </div>

        {!granted ? (
          <LocationConsent onGrant={handleGrantLocation} loading={geoLoading} />
        ) : (
          <SosButton onActivate={executeSos} />
        )}

        {geoError && !granted && (
          <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
            {geoError}. Please enable location permissions in your browser settings to continue.
          </div>
        )}

      </div>
    </main>
  );
}
