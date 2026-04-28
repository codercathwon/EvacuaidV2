'use client';

import { IncidentCard } from './IncidentCard';
import { Incident } from '@/types';

interface IncidentQueueProps {
  incidents: Incident[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAck?: (id: string) => void;
  newIds?: Set<string>;
}

export function IncidentQueue({ incidents, activeId, onSelect, onAck, newIds }: IncidentQueueProps) {
  if (incidents.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        No active incidents. Queue is clear.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {incidents.map((incident) => (
        <IncidentCard
          key={incident.id}
          incident={incident}
          isActive={activeId === incident.id}
          onClick={() => onSelect(incident.id)}
          onAck={onAck ? () => onAck(incident.id) : undefined}
          isNew={newIds ? newIds.has(incident.id) : false}
        />
      ))}
    </div>
  );
}
