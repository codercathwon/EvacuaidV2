// Uses @vis.gl/react-google-maps
'use client';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { Incident } from '@/types';
import { useMemo } from 'react';

const DEFAULT_CENTER = { lat: 12.8797, lng: 121.774 };

interface ConsoleMapProps {
  incidents: Incident[];
  activeIncidentId: string | null;
  onMarkerClick: (id: string) => void;
  municipalityGeoJSON?: any;
}

export function ConsoleMap({ incidents, activeIncidentId, onMarkerClick, municipalityGeoJSON }: ConsoleMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  
  const center = useMemo(() => {
    const pending = incidents.filter((i) => i.status === 'pending');
    if (pending.length > 0) return { lat: pending[0].lat, lng: pending[0].lng };
    if (incidents.length > 0) return { lat: incidents[0].lat, lng: incidents[0].lng };
    return DEFAULT_CENTER;
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
              {activeIncidentId === inc.id ? (
                <div className="relative">
                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      transform: 'translate(-50%, -50%)',
                      left: '50%',
                      top: '50%',
                      width: 54,
                      height: 54,
                      border: '1px solid rgba(59,130,246,0.55)',
                      animation: 'evacuaid-pulse-ring 2s infinite',
                    }}
                  />
                  <Pin
                    scale={1.2}
                    background={inc.status === 'pending' ? '#DC2626' : '#6B7280'}
                    borderColor={inc.status === 'pending' ? '#7F1D1D' : '#374151'}
                    glyphColor="#ffffff"
                  />
                </div>
              ) : (
                <Pin
                  background={inc.status === 'pending' ? '#DC2626' : '#6B7280'}
                  borderColor={inc.status === 'pending' ? '#7F1D1D' : '#374151'}
                  glyphColor="#ffffff"
                />
              )}
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
