'use client';

import { Incident } from '@/types';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface IncidentCardProps {
  incident: Incident;
  isActive: boolean;
  onClick: () => void;
  onAck?: () => void;
  isNew?: boolean;
}

export function IncidentCard({ incident, isActive, onClick, onAck, isNew }: IncidentCardProps) {
  const status = incident.status;
  const isPending = status === 'pending';
  const isAcknowledged = status === 'acknowledged';
  const isDispatched = status === 'dispatched';

  const accent =
    isDispatched
      ? 'bg-[color:var(--accent-green)]'
      : isAcknowledged
        ? 'bg-[color:var(--accent-amber)]'
        : 'bg-[color:var(--accent-red)]';

  const selectedAccent = isActive ? 'ring-1 ring-[color:var(--accent-blue)]' : '';

  return (
    <div
      className={[
        'relative',
        'border border-[color:var(--border-bright)]',
        'bg-[color:var(--bg-elevated)]',
        'transition-[background-color,box-shadow] duration-[150ms] ease-out',
        'cursor-pointer',
        selectedAccent,
        isActive ? 'bg-[color:var(--bg-elevated)]/95' : 'hover:bg-[color:var(--bg-elevated)]/80',
        isNew ? 'animate-[evacuaid-slide-down_300ms_ease]' : '',
      ].join(' ')}
      onClick={onClick}
      style={
        isNew && isPending
          ? { boxShadow: '0 0 0 1px color-mix(in srgb, var(--accent-red) 35%, transparent), 0 0 24px rgba(220,38,38,0.18)' }
          : undefined
      }
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isActive ? 'bg-[color:var(--accent-blue)]' : accent}`} />

      <div className="pl-4 pr-3 py-3 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-ui text-[10px] uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
              ID {incident.id.slice(0, 8)}
            </div>
            <div className="mt-1 font-ui text-[12px] text-[color:var(--text-secondary)] truncate">
              {incident.lat.toFixed(5)}, {incident.lng.toFixed(5)} · ±{Math.round(incident.accuracy_m || 0)}m
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2 font-ui text-[10px] text-[color:var(--text-muted)]">
            <Clock className="w-3.5 h-3.5" />
            {formatDistanceToNow(new Date(incident.created_at))} ago
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-1 border border-[color:var(--border-bright)] bg-black/20 font-ui text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-secondary)]"
            >
              {status}
            </span>
            {incident.border_proximity && (
              <span className="px-2 py-1 border border-[color:var(--accent-amber)]/60 bg-[color:var(--accent-amber)]/10 font-ui text-[10px] uppercase tracking-[0.18em] text-[color:var(--accent-amber)]">
                border
              </span>
            )}
          </div>

          {isPending && onAck && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAck();
              }}
              className="px-3 py-1 border border-[color:var(--accent-green)]/50 bg-[color:var(--accent-green)]/15 hover:bg-[color:var(--accent-green)]/20 font-ui text-[10px] uppercase tracking-[0.22em] text-[color:var(--text-primary)] transition-colors duration-[150ms] ease-out"
            >
              ACK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
