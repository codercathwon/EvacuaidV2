'use client';

import { Wifi, WifiOff } from 'lucide-react';
import type { ConnectionStatus } from '@/hooks/useIncidentChannel';

export function ConnectionBadge({
  status,
  compact,
}: {
  status: ConnectionStatus;
  compact?: boolean;
}) {
  const configs: Record<ConnectionStatus, { color: string; label: string }> = {
    connecting: { color: 'var(--accent-amber)', label: 'Connecting' },
    connected: { color: 'var(--accent-green)', label: 'Live' },
    disconnected: { color: 'var(--text-muted)', label: 'Offline' },
    error: { color: 'var(--accent-primary)', label: 'Reconnecting' },
  };
  const { color, label } = configs[status];

  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-2 h-2 rounded-full"
        style={{
          background: color,
          boxShadow:
            status === 'connected'
              ? `0 0 0 3px color-mix(in srgb, ${color} 25%, transparent)`
              : undefined,
        }}
      />
      {!compact && (
        <>
          {status === 'connected' ? (
            <Wifi className="w-3.5 h-3.5" style={{ color }} />
          ) : (
            <WifiOff className="w-3.5 h-3.5" style={{ color }} />
          )}
          <span className="font-ui text-xs font-medium" style={{ color }}>
            {label}
          </span>
        </>
      )}
    </div>
  );
}
