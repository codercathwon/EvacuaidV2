// Uses @vis.gl/react-google-maps
'use client';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { Incident } from '@/types';
import { useEffect, useState } from 'react';

interface ConsoleMapProps {
  incidents: Incident[];
  activeIncidentId: string | null;
  onMarkerClick: (id: string) => void;
  municipalityGeoJSON?: any;
}

export function ConsoleMap({ incidents, activeIncidentId, onMarkerClick, municipalityGeoJSON }: ConsoleMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  
  // Default to Philippines if no incidents
  const defaultCenter = { lat: 12.8797, lng: 121.7740 };
  const [center, setCenter] = useState(defaultCenter);

  // Auto-pan to newest unacknowledged if array changes
  useEffect(() => {
    const pending = incidents.filter(i => i.status === 'pending');
    if (pending.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCenter({ lat: pending[0].lat, lng: pending[0].lng });
    } else if (incidents.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCenter({ lat: incidents[0].lat, lng: incidents[0].lng });
    }
  }, [incidents]);

  if (!apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400">
        Google Maps API key not configured.
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <span className="bg-zinc-950/80 backdrop-blur border border-zinc-700 px-3 py-1 rounded text-xs font-mono text-zinc-300 pointer-events-none">ConsoleMap.tsx</span>
        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 px-3 py-1 rounded text-xs pointer-events-none">Coverage Zone</span>
      </div>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultZoom={13}
          center={center}
          mapId="EVACUAID_CONSOLE_MAP"
          disableDefaultUI={false}
          className="w-full h-full"
        >
          {incidents.map((inc) => (
            <AdvancedMarker
              key={inc.id}
              position={{ lat: inc.lat, lng: inc.lng }}
              onClick={() => onMarkerClick(inc.id)}
              zIndex={inc.status === 'pending' ? 100 : 1}
            >
              <Pin
                background={inc.status === 'pending' ? '#ef4444' : '#71717a'}
                borderColor={inc.status === 'pending' ? '#991b1b' : '#3f3f46'}
                glyphColor="#ffffff"
              />
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
