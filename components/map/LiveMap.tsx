'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useApiIsLoaded } from '@vis.gl/react-google-maps';
import { Incident } from '@/types';
import { Shield } from 'lucide-react';

const TAGUM_BOUNDARY: google.maps.LatLngLiteral[] = [
  { lat: 7.20, lng: 125.60 },
  { lat: 7.20, lng: 126.05 },
  { lat: 7.70, lng: 126.05 },
  { lat: 7.70, lng: 125.60 },
];

const TAGUM_CENTER: google.maps.LatLngLiteral = { lat: 7.4478, lng: 125.8068 };

const STATUS_COLORS: Record<string, string> = {
  pending:      '#FF4B4B',
  acknowledged: '#F59E0B',
  dispatched:   '#00C48C',
  resolved:     '#9CA3AF',
  cancelled:    '#9CA3AF',
};

const STATUS_LABELS: Record<string, string> = {
  pending:      'Pending',
  acknowledged: 'Acknowledged',
  dispatched:   'Dispatched',
  resolved:     'Resolved',
  cancelled:    'Cancelled',
};

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  injury:   'Injury',
  accident: 'Accident',
  fire:     'Fire',
  other:    'Other / Flood',
};

const EVACUATION_SEARCHES: Array<{ keyword: string; label: string; color: string }> = [
  { keyword: 'hospital',          label: 'Hospital',          color: '#EF4444' },
  { keyword: 'barangay hall',     label: 'Barangay Hall',     color: '#22C55E' },
  { keyword: 'school',            label: 'School',            color: '#3B82F6' },
  { keyword: 'evacuation center', label: 'Evacuation Center', color: '#14B8A6' },
  { keyword: 'DRRMO',             label: 'DRRMO Office',      color: '#F97316' },
  { keyword: 'covered court',     label: 'Covered Court',     color: '#A855F7' },
];

const SAFETY_ICONS: Record<string, { color: string; label: string; scale: number }> = {
  hospital:          { color: '#FF4B4B', label: 'Hospital',          scale: 7 },
  police:            { color: '#1A56DB', label: 'Police',            scale: 7 },
  fire_station:      { color: '#E65100', label: 'Fire Station',      scale: 7 },
  evacuation_center: { color: '#00C48C', label: 'Evacuation Center', scale: 7 },
  barangay_hall:     { color: '#7F77DD', label: 'Barangay Hall',     scale: 6 },
  school:            { color: '#EF9F27', label: 'School',            scale: 6 },
  church:            { color: '#888780', label: 'Church',            scale: 5 },
  health_center:     { color: '#FF6B9D', label: 'Health Center',     scale: 6 },
};

interface SafetyPlace {
  id: string;
  name: string;
  category: string;
  address: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  is_active: boolean;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface LiveMapProps {
  incidents: Incident[];
  showMyLocation?: boolean;
  onMarkerClick?: (incidentId: string) => void;
  showBoundary?: boolean;
  height?: string;
  selectedId?: string | null;
  className?: string;
  showHospitalRoute?: boolean;
  userCoords?: { lat: number; lng: number } | null;
  onHospitalFound?: (name: string, distanceText: string, type?: string) => void;
  showSafetyPlaces?: boolean;
}

export function LiveMap({
  incidents,
  showMyLocation = false,
  onMarkerClick,
  showBoundary = true,
  height = '100%',
  selectedId = null,
  className = '',
  showHospitalRoute = false,
  userCoords = null,
  onHospitalFound,
  showSafetyPlaces: showSafetyProp = true,
}: LiveMapProps) {
  const isApiLoaded = useApiIsLoaded();
  const mapRef                   = useRef<HTMLDivElement>(null);
  const googleMapRef             = useRef<google.maps.Map | null>(null);
  const markersRef               = useRef<Map<string, google.maps.Marker>>(new Map());
  const incidentInfoWindowsRef   = useRef<Map<string, google.maps.InfoWindow>>(new Map());
  const boundaryRef              = useRef<google.maps.Polygon | null>(null);
  const userMarkerRef            = useRef<google.maps.Marker | null>(null);
  const initedRef                = useRef(false);
  const routePolylineRef         = useRef<google.maps.Polyline | null>(null);
  const evacuationMarkersRef     = useRef<google.maps.Marker[]>([]);
  const evacuationInfoWindowsRef = useRef<google.maps.InfoWindow[]>([]);
  const safetyMarkersRef         = useRef<google.maps.Marker[]>([]);
  const safetyInfoWindowsRef     = useRef<google.maps.InfoWindow[]>([]);
  const onHospitalFoundRef       = useRef(onHospitalFound);
  onHospitalFoundRef.current     = onHospitalFound;

  const [safetyPlaces, setSafetyPlaces] = useState<SafetyPlace[]>([]);
  const [showSafetyLayer, setShowSafetyLayer] = useState(showSafetyProp);

  const getMarkerIcon = useCallback(
    (incident: Incident, selected: boolean): google.maps.Symbol => {
      const color = STATUS_COLORS[incident.status] ?? '#9CA3AF';
      return {
        path:         google.maps.SymbolPath.CIRCLE,
        scale:        selected ? 13 : 9,
        fillColor:    color,
        fillOpacity:  1,
        strokeColor:  '#FFFFFF',
        strokeWeight: selected ? 3 : 2,
      };
    },
    []
  );

  /* ── Fetch safety places on mount ── */
  useEffect(() => {
    fetch('/api/safety-places')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setSafetyPlaces(data); })
      .catch(() => {});
  }, []);

  /* ── Initialize map ── */
  useEffect(() => {
    if (!isApiLoaded || !mapRef.current || initedRef.current) return;
    initedRef.current = true;

    const map = new google.maps.Map(mapRef.current, {
      center: TAGUM_CENTER,
      zoom: 12,
      mapTypeId: 'roadmap',
      styles: [
        { featureType: 'poi',       stylers: [{ visibility: 'off' }] },
        { featureType: 'transit',   stylers: [{ visibility: 'off' }] },
        { featureType: 'road',      elementType: 'labels.icon',     stylers: [{ visibility: 'off' }] },
        { featureType: 'water',     elementType: 'geometry.fill',   stylers: [{ color: '#c8d7d4' }] },
        { featureType: 'landscape', elementType: 'geometry.fill',   stylers: [{ color: '#f5f5f0' }] },
        { featureType: 'road',      elementType: 'geometry',        stylers: [{ color: '#FFFFFF' }] },
        { featureType: 'road',      elementType: 'geometry.stroke', stylers: [{ color: '#E5E7EB' }] },
        { featureType: 'all',       elementType: 'geometry',        stylers: [{ saturation: -15 }] },
      ],
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    googleMapRef.current = map;

    if (showBoundary) {
      boundaryRef.current = new google.maps.Polygon({
        paths:         TAGUM_BOUNDARY,
        strokeColor:   '#FF4B4B',
        strokeOpacity: 0.4,
        strokeWeight:  1.5,
        fillColor:     '#FF4B4B',
        fillOpacity:   0.06,
        map,
      });
    }
  }, [isApiLoaded, showBoundary]);

  /* ── Sync incident markers ── */
  useEffect(() => {
    if (!isApiLoaded || !googleMapRef.current) return;
    const map = googleMapRef.current;
    const currentIds = new Set(incidents.map((i) => i.id));

    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
        incidentInfoWindowsRef.current.get(id)?.close();
        incidentInfoWindowsRef.current.delete(id);
      }
    });

    incidents.forEach((incident) => {
      const isSelected  = incident.id === selectedId;
      const typeLabel   = incident.incident_type
        ? (INCIDENT_TYPE_LABELS[incident.incident_type] ?? incident.incident_type)
        : null;
      const statusLabel = STATUS_LABELS[incident.status] ?? incident.status;
      const statusColor = STATUS_COLORS[incident.status] ?? '#9CA3AF';

      const infoContent = `
        <div style="font-family:system-ui,sans-serif;padding:4px 2px;font-size:12px;line-height:1.5;min-width:130px">
          ${typeLabel ? `<div style="font-weight:700;color:#111827;margin-bottom:2px">${typeLabel}</div>` : '<div style="font-weight:700;color:#111827;margin-bottom:2px">Incident</div>'}
          <div style="color:#6B7280">User #${incident.id.slice(0, 6)}</div>
          <div style="color:${statusColor};font-weight:600">${statusLabel}</div>
        </div>
      `;

      if (markersRef.current.has(incident.id)) {
        const marker = markersRef.current.get(incident.id)!;
        marker.setPosition({ lat: incident.lat, lng: incident.lng });
        marker.setIcon(getMarkerIcon(incident, isSelected));
        marker.setZIndex(isSelected ? 999 : 1);
        incidentInfoWindowsRef.current.get(incident.id)?.setContent(infoContent);
      } else {
        const marker = new google.maps.Marker({
          position:  { lat: incident.lat, lng: incident.lng },
          map,
          icon:      getMarkerIcon(incident, isSelected),
          title:     `#${incident.id.slice(0, 8)} — ${statusLabel}`,
          animation: incident.status === 'pending' ? google.maps.Animation.BOUNCE : undefined,
          zIndex:    isSelected ? 999 : 1,
        });

        if (incident.status === 'pending') {
          setTimeout(() => { if (marker.getMap()) marker.setAnimation(null); }, 1500);
        }

        const infoWindow = new google.maps.InfoWindow({ content: infoContent });
        incidentInfoWindowsRef.current.set(incident.id, infoWindow);

        marker.addListener('mouseover', () => infoWindow.open(map, marker));
        marker.addListener('mouseout',  () => infoWindow.close());
        marker.addListener('click', () => onMarkerClick?.(incident.id));

        markersRef.current.set(incident.id, marker);
      }
    });
  }, [isApiLoaded, incidents, selectedId, getMarkerIcon, onMarkerClick]);

  /* ── Pan to selected ── */
  useEffect(() => {
    if (!selectedId || !googleMapRef.current) return;
    const inc = incidents.find((i) => i.id === selectedId);
    if (inc) googleMapRef.current.panTo({ lat: inc.lat, lng: inc.lng });
  }, [selectedId, incidents]);

  /* ── User location dot ── */
  useEffect(() => {
    if (!isApiLoaded || !showMyLocation || !googleMapRef.current) return;
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
            path:         google.maps.SymbolPath.CIRCLE,
            scale:        10,
            fillColor:    '#3B82F6',
            fillOpacity:  1,
            strokeColor:  '#FFFFFF',
            strokeWeight: 3,
          },
          title:  'Your location',
          zIndex: 100,
        });
      }
    });
  }, [isApiLoaded, showMyLocation]);

  /* ── Safety places markers ── */
  useEffect(() => {
    if (!isApiLoaded || !googleMapRef.current) return;
    const map = googleMapRef.current;

    safetyMarkersRef.current.forEach((m) => m.setMap(null));
    safetyMarkersRef.current = [];
    safetyInfoWindowsRef.current.forEach((iw) => iw.close());
    safetyInfoWindowsRef.current = [];

    if (!showSafetyLayer || safetyPlaces.length === 0) return;

    safetyPlaces.forEach((place) => {
      const cfg = SAFETY_ICONS[place.category] ?? { color: '#9CA3AF', label: place.category, scale: 6 };

      const marker = new google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        map,
        icon: {
          path:         google.maps.SymbolPath.CIRCLE,
          scale:        cfg.scale,
          fillColor:    cfg.color,
          fillOpacity:  0.85,
          strokeColor:  '#FFFFFF',
          strokeWeight: 1.5,
        },
        title:  place.name,
        zIndex: 50,
      });

      const phoneHtml = place.phone
        ? `<div style="margin-top:3px"><a href="tel:${place.phone}" style="color:#1A56DB;text-decoration:none;font-size:11px">📞 ${place.phone}</a></div>`
        : '';
      const infoContent = `
        <div style="font-family:system-ui,sans-serif;padding:4px 2px;font-size:12px;line-height:1.5;min-width:150px;max-width:200px">
          <div style="font-weight:700;color:#111827;margin-bottom:2px">${place.name}</div>
          <div style="display:inline-block;padding:1px 8px;border-radius:99px;font-size:11px;font-weight:600;color:#fff;background:${cfg.color};margin-bottom:3px">${cfg.label}</div>
          ${place.address ? `<div style="color:#6B7280;font-size:11px">${place.address}</div>` : ''}
          ${phoneHtml}
        </div>
      `;
      const infoWindow = new google.maps.InfoWindow({ content: infoContent });

      marker.addListener('click', () => {
        safetyInfoWindowsRef.current.forEach((iw) => iw.close());
        infoWindow.open(map, marker);
      });

      safetyMarkersRef.current.push(marker);
      safetyInfoWindowsRef.current.push(infoWindow);
    });
  }, [isApiLoaded, safetyPlaces, showSafetyLayer]);

  /* ── Multi-type evacuation routing ── */
  const userLat = userCoords?.lat ?? null;
  const userLng = userCoords?.lng ?? null;

  useEffect(() => {
    if (!isApiLoaded) return;

    const clearOverlays = () => {
      routePolylineRef.current?.setMap(null);
      routePolylineRef.current = null;
      evacuationMarkersRef.current.forEach((m) => m.setMap(null));
      evacuationMarkersRef.current = [];
      evacuationInfoWindowsRef.current.forEach((iw) => iw.close());
      evacuationInfoWindowsRef.current = [];
    };

    if (!showHospitalRoute || userLat == null || userLng == null || !googleMapRef.current) {
      clearOverlays();
      return;
    }

    let cancelled = false;
    const map     = googleMapRef.current;
    const origin  = { lat: userLat, lng: userLng };
    const svc     = new google.maps.places.PlacesService(map);

    type FoundItem = { place: google.maps.places.PlaceResult; label: string; color: string };

    const searchPromises = EVACUATION_SEARCHES.map(({ keyword, label, color }) =>
      new Promise<FoundItem[]>((resolve) => {
        svc.nearbySearch(
          { location: origin, rankBy: google.maps.places.RankBy.DISTANCE, keyword },
          (results, status) => {
            if (cancelled) { resolve([]); return; }
            if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
              resolve([]);
              return;
            }
            resolve(results.slice(0, 3).map((place) => ({ place, label, color })));
          }
        );
      })
    );

    Promise.all(searchPromises).then((allResults) => {
      if (cancelled) return;

      const flat = allResults.flat().filter((item) => !!item.place.geometry?.location);
      if (!flat.length) return;

      let nearest     = flat[0];
      let nearestDist = Infinity;
      flat.forEach((item) => {
        const loc = item.place.geometry!.location!;
        const d   = haversineDistance(userLat, userLng, loc.lat(), loc.lng());
        if (d < nearestDist) { nearestDist = d; nearest = item; }
      });

      flat.forEach((item) => {
        const loc       = item.place.geometry!.location!;
        const isNearest = item === nearest;

        const marker = new google.maps.Marker({
          position: { lat: loc.lat(), lng: loc.lng() },
          map,
          icon: {
            path:         google.maps.SymbolPath.CIRCLE,
            scale:        isNearest ? 14 : 9,
            fillColor:    item.color,
            fillOpacity:  1,
            strokeColor:  '#FFFFFF',
            strokeWeight: isNearest ? 3 : 2,
          },
          title:  item.place.name,
          zIndex: isNearest ? 300 : 200,
        });

        const infoContent = `
          <div style="font-family:system-ui,sans-serif;padding:4px 2px;font-size:12px;line-height:1.5;min-width:140px">
            <div style="font-weight:700;color:#111827;margin-bottom:2px">${item.place.name ?? 'Unknown'}</div>
            <div style="color:${item.color};font-weight:600">${item.label}</div>
            ${isNearest ? '<div style="color:#00C48C;font-weight:700;margin-top:2px">★ Nearest to you</div>' : ''}
          </div>
        `;
        const infoWindow = new google.maps.InfoWindow({ content: infoContent });
        marker.addListener('mouseover', () => infoWindow.open(map, marker));
        marker.addListener('mouseout',  () => infoWindow.close());

        evacuationMarkersRef.current.push(marker);
        evacuationInfoWindowsRef.current.push(infoWindow);
      });

      const dest = nearest.place.geometry!.location!;
      new google.maps.DirectionsService().route(
        { origin, destination: dest, travelMode: google.maps.TravelMode.DRIVING },
        (result, routeStatus) => {
          if (cancelled) return;
          if (routeStatus !== google.maps.DirectionsStatus.OK || !result) return;

          const path = result.routes[0]?.overview_path;
          if (!path) return;

          routePolylineRef.current?.setMap(null);
          routePolylineRef.current = new google.maps.Polyline({
            path,
            geodesic:      true,
            strokeColor:   '#00C48C',
            strokeOpacity: 0,
            strokeWeight:  0,
            icons: [{
              icon: {
                path:          'M 0,-1 0,1',
                strokeOpacity: 1,
                strokeColor:   '#00C48C',
                strokeWeight:  4,
                scale:         4,
              },
              offset: '0',
              repeat: '18px',
            }],
            map,
            zIndex: 50,
          });

          const leg      = result.routes[0]?.legs[0];
          const distText = leg?.distance?.text ?? `${(nearestDist / 1000).toFixed(1)} km`;
          onHospitalFoundRef.current?.(nearest.place.name ?? 'Safety Location', distText, nearest.label);
        }
      );
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApiLoaded, showHospitalRoute, userLat, userLng]);

  /* ── Loading state ── */
  if (!isApiLoaded) {
    return (
      <div
        style={{ height, width: '100%' }}
        className={`flex items-center justify-center bg-[var(--bg-base)] ${className}`}
      >
        <div
          className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div style={{ height, width: '100%', position: 'relative' }} className={className}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />

      {/* Safety layer toggle */}
      <button
        type="button"
        onClick={() => setShowSafetyLayer((v) => !v)}
        title={showSafetyLayer ? 'Hide safety places' : 'Show safety places'}
        className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full font-ui text-xs font-medium transition-all z-10"
        style={{
          background:  showSafetyLayer ? '#FF4B4B' : 'rgba(255,255,255,0.95)',
          color:       showSafetyLayer ? '#fff' : '#6B7280',
          boxShadow:   '0 1px 4px rgba(0,0,0,0.15)',
          border:      showSafetyLayer ? 'none' : '1px solid #E5E7EB',
        }}
      >
        <Shield style={{ width: 12, height: 12 }} />
        Safety places
      </button>

      {/* Legend */}
      {showSafetyLayer && (
        <div
          className="absolute bottom-8 left-3 flex items-center gap-2.5 px-3 py-2 rounded-full z-10"
          style={{
            background:     'rgba(255,255,255,0.92)',
            boxShadow:      '0 1px 4px rgba(0,0,0,0.12)',
            border:         '1px solid #E5E7EB',
            backdropFilter: 'blur(4px)',
          }}
        >
          <LegendDot color="#FF4B4B" label="Incidents" />
          <LegendDot color="#1A56DB" label="Police" />
          <LegendDot color="#FF4B4B" label="Hospital" />
          <LegendDot color="#00C48C" label="Shelters" />
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      <span style={{ fontFamily: 'system-ui,sans-serif', fontSize: 10, color: '#6B7280', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}
