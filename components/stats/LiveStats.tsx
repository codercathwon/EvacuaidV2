'use client';

import { Activity, Clock, CheckCircle, Zap, Shield } from 'lucide-react';
import { useLiveStats } from '@/hooks/useLiveStats';

interface LiveStatsProps {
  className?: string;
  variant?: 'bar' | 'pills';
}

export function LiveStats({ className = '', variant = 'pills' }: LiveStatsProps) {
  const stats = useLiveStats();

  const avgStr = stats.avg_ack_seconds != null
    ? `${stats.avg_ack_seconds.toFixed(1)}s`
    : '—';

  if (variant === 'bar') {
    return (
      <div
        className={`flex items-center gap-4 px-4 py-3 rounded-2xl ${className}`}
        style={{
          background: 'var(--bg-surface)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border)',
        }}
      >
        <Stat
          icon={<Activity className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />}
          value={stats.active_now}
          label="active now"
          badge
        />
        <Divider />
        <Stat
          icon={<Zap className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />}
          value={stats.total_today}
          label="today"
        />
        <Divider />
        <Stat
          icon={<Clock className="w-4 h-4" style={{ color: 'var(--accent-amber)' }} />}
          value={avgStr}
          label="avg response"
        />
        <Divider />
        <Stat
          icon={<CheckCircle className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />}
          value={stats.resolved_today}
          label="resolved (24h)"
          title="Incidents resolved in the last 24 hours"
        />
        <Divider />
        <Stat
          icon={<Shield className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />}
          value={77}
          label="safe places"
        />
      </div>
    );
  }

  return (
    <div className={`flex gap-2 overflow-x-auto pb-1 ${className}`}>
      <StatPill
        icon={<Activity className="w-3.5 h-3.5" />}
        value={stats.active_now}
        label="active now"
        color="var(--accent-primary)"
        soft="var(--accent-primary-soft)"
      />
      <StatPill
        icon={<Clock className="w-3.5 h-3.5" />}
        value={avgStr}
        label="avg response"
        color="var(--accent-amber)"
        soft="var(--accent-amber-soft)"
      />
      <StatPill
        icon={<CheckCircle className="w-3.5 h-3.5" />}
        value={stats.resolved_today}
        label="resolved (24h)"
        color="var(--accent-green)"
        soft="var(--accent-green-soft)"
        title="Incidents resolved in the last 24 hours"
      />
      <StatPill
        icon={<Shield className="w-3.5 h-3.5" />}
        value={77}
        label="safe places"
        color="var(--accent-primary)"
        soft="var(--accent-primary-soft)"
      />
    </div>
  );
}

function Divider() {
  return <div className="w-px h-8 bg-[var(--border)]" />;
}

function Stat({
  icon,
  value,
  label,
  badge,
  title,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  badge?: boolean;
  title?: string;
}) {
  return (
    <div className="flex items-center gap-2 min-w-fit" title={title}>
      {icon}
      <div>
        <div className="flex items-center gap-1">
          <span className="font-display font-bold text-base text-[var(--text-primary)]">
            {value}
          </span>
          {badge && (
            <span
              className="px-1.5 py-0.5 rounded-full text-xs font-bold text-white"
              style={{ background: 'var(--accent-primary)' }}
            >
              LIVE
            </span>
          )}
        </div>
        <div className="font-ui text-xs text-[var(--text-muted)]">{label}</div>
      </div>
    </div>
  );
}

function StatPill({
  icon,
  value,
  label,
  color,
  soft,
  title,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string;
  soft: string;
  title?: string;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-full whitespace-nowrap shrink-0"
      style={{
        background: soft,
        border: `1px solid ${color}30`,
        boxShadow: 'var(--shadow-sm)',
      }}
      title={title}
    >
      <span style={{ color }}>{icon}</span>
      <span className="font-display font-bold text-sm text-[var(--text-primary)]">{value}</span>
      <span className="font-ui text-xs text-[var(--text-secondary)]">{label}</span>
    </div>
  );
}
