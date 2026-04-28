'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Incident } from '@/types';

// Tagum City boundary — wider polygon per requirements
const TAGUM_BOUNDARY: google.maps.LatLngLiteral[] = [
  { lat: 7.30, lng: 125.70 },
  { lat: 7.30, lng: 125.98 },
  { lat: 7.62, lng: 125.98 },
  { lat: 7.62, lng: 125.70 },
];

const TAGUM_CENTER: google.maps.LatLngLiteral = { lat: 7.44, lng: 125.81 };

const STATUS_COLORS: Record<string, string> = {
  pending: '#FF4B4B',
  acknowledged: '#FFB547',
  dispatched: '#00C48C',
  resolved: '#9CA3AF',
  cancelled: '#9CA3AF',
};

interface LiveMapProps {
  incidents: Incident[];
  showMyLocation?: boolean;
  onMarkerClick?: (incidentId: string) => void;
  showBoundary?: boolean;
  height?: string;
  selectedId?: string | null;
  className?: string;
}

export function LiveMap({
  incidents,
  showMyLocation = false,
  onMarkerClick,
  showBoundary = true,
  height = '100%',
  selectedId = null,
  className = '',
}: LiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const boundaryRef = useRef<google.maps.Polygon | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const initedRef = useRef(false);

  const getMarkerIcon = useCallback(
    (incident: Incident, selected: boolean): google.maps.Symbol => {
      const color = STATUS_COLORS[incident.status] ?? '#9CA3AF';
      return {
        path: google.maps.SymbolPath.CIRCLE,
        scale: selected ? 12 : 9,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: selected ? 3 : 2,
      };
    },
    []
  );

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || initedRef.current) return;
    if (typeof google === 'undefined') return;

    initedRef.current = true;

    const map = new google.maps.Map(mapRef.current, {
      center: TAGUM_CENTER,
      zoom: 12,
      mapTypeId: 'roadmap',
      styles: [
        { featureType: 'all', elementType: 'geometry', stylers: [{ saturation: -20 }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#bde0fb' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
        { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#E5E7EB' }] },
        { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#F8F9FA' }] },
        { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#E8F5E9' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    googleMapRef.current = map;

    // Boundary overlay
    if (showBoundary) {
      boundaryRef.current = new google.maps.Polygon({
        paths: TAGUM_BOUNDARY,
        strokeColor: '#FF4B4B',
        strokeOpacity: 0.6,
        strokeWeight: 2,
        fillColor: '#FF4B4B',
        fillOpacity: 0.08,
        map,
      });
    }
  }, [showBoundary]);

  // Update markers when incidents change
  useEffect(() => {
    if (!googleMapRef.current || typeof google === 'undefined') return;

    const map = googleMapRef.current;
    const currentIds = new Set(incidents.map((i) => i.id));

    // Remove stale markers
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    });

    // Add/update markers
    incidents.forEach((incident) => {
      const isSelected = incident.id === selectedId;

      if (markersRef.current.has(incident.id)) {
        const marker = markersRef.current.get(incident.id)!;
        marker.setPosition({ lat: incident.lat, lng: incident.lng });
        marker.setIcon(getMarkerIcon(incident, isSelected));
        if (isSelected) marker.setZIndex(999);
      } else {
        const marker = new google.maps.Marker({
          position: { lat: incident.lat, lng: incident.lng },
          map,
          icon: getMarkerIcon(incident, isSelected),
          title: `Incident ${incident.id.slice(0, 8)} — ${incident.status}`,
          animation: incident.status === 'pending' ? google.maps.Animation.BOUNCE : undefined,
          zIndex: isSelected ? 999 : 1,
        });

        // Stop bounce after 1.5s for pending
        if (incident.status === 'pending') {
          setTimeout(() => {
            if (marker.getMap()) marker.setAnimation(null);
          }, 1500);
        }

        marker.addListener('click', () => {
          onMarkerClick?.(incident.id);
        });

        markersRef.current.set(incident.id, marker);
      }
    });
  }, [incidents, selectedId, getMarkerIcon, onMarkerClick]);

  // Center on selected incident
  useEffect(() => {
    if (!selectedId || !googleMapRef.current) return;
    const inc = incidents.find((i) => i.id === selectedId);
    if (inc) {
      googleMapRef.current.panTo({ lat: inc.lat, lng: inc.lng });
    }
  }, [selectedId, incidents]);

  // User location dot
  useEffect(() => {
    if (!showMyLocation || !googleMapRef.current || typeof google === 'undefined') return;

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      if (userMarkerRef.current) {
        userMarkerRef.current.setPosition({ lat, lng });
      } else {
        userMarkerRef.current = new google.maps.Marker({
          position: { lat, lng },
          map: googleMapRef.current!,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#4F8EF7',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 3,
          },
          title: 'Your location',
          zIndex: 100,
        });
      }
    });
  }, [showMyLocation]);

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%' }}
      className={`rounded-xl overflow-hidden ${className}`}
    />
  );
}
