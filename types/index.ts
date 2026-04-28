export type Role = 'citizen' | 'responder' | 'admin';
export type IncidentStatus = 'pending' | 'acknowledged' | 'dispatched' | 'resolved' | 'cancelled';
export type IncidentType = 'injury' | 'accident' | 'fire' | 'other' | null;

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  municipality_id: string | null;
  created_at: string;
}

export interface Municipality {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Incident {
  id: string;
  reporter_id: string | null;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  municipality_id: string | null;
  border_proximity: boolean;
  status: IncidentStatus;
  incident_type: IncidentType;
  payload_jwt: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditEvent {
  id: number;
  actor_id: string | null;
  event_type: string;
  target_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface IncidentStats {
  total_today: number;
  active_now: number;
  resolved_today: number;
  avg_ack_seconds: number | null;
}

export interface NearbyIncident {
  incident: Incident;
  distanceMeters: number;
}
