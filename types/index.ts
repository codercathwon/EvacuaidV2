export type Role = 'citizen' | 'responder' | 'admin';
export type IncidentStatus = 'pending' | 'acknowledged' | 'dispatched' | 'resolved' | 'cancelled';

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
  // boundary is geom, handled back-end mostly
  created_at: string;
}

export interface Incident {
  id: string;
  reporter_id: string | null;
  lat: number;
  lng: number;
  accuracy_m: number;
  municipality_id: string;
  border_proximity: boolean;
  status: IncidentStatus;
  payload_jwt: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditEvent {
  id: number;
  actor_id: string | null;
  event_type: string;
  target_id: string | null;
  meta: Record<string, any> | null;
  created_at: string;
}
