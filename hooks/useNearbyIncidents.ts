'use client';

import { useMemo } from 'react';
import { Incident, NearbyIncident } from '@/types';

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useNearbyIncidents(
  userLat: number | null,
  userLng: number | null,
  incidents: Incident[],
  radiusMeters = 500
): NearbyIncident[] {
  return useMemo(() => {
    if (userLat === null || userLng === null) return [];
    const active = incidents.filter(
      (i) => i.status === 'pending' || i.status === 'acknowledged' || i.status === 'dispatched'
    );
    return active
      .map((incident) => ({
        incident,
        distanceMeters: haversineMeters(userLat, userLng, incident.lat, incident.lng),
      }))
      .filter((n) => n.distanceMeters <= radiusMeters)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [userLat, userLng, incidents, radiusMeters]);
}

export { haversineMeters };
