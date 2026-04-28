'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Incident } from '@/types';
import {
  Zap, MapPin, Radio, Bell, Truck, CheckCircle2, Phone, ArrowLeft, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

const STEPS = [
  { key: 'sent', label: 'Signal Sent', icon: Zap },
  { key: 'located', label: 'Location Confirmed', icon: MapPin },
  { key: 'routed', label: 'Routed to Tagum City', icon: Radio },
  { key: 'acknowledged', label: 'Responder Notified', icon: Bell },
  { key: 'dispatched', label: 'Help Dispatched', icon: Truck },
] as const;

function getReachedSteps(status: string): number {
  if (status === 'pending') return 3;
  if (status === 'acknowledged') return 4;
  if (status === 'dispatched' || status === 'resolved') return 5;
  return 3;
}

const EMERGENCY_CONTACTS = [
  { label: 'National Emergency', number: '911', href: 'tel:911' },
  { label: 'Tagum City DRRMO', number: '(084) 218-0713', href: 'tel:+630842180713' },
  { label: 'PNP Tagum City', number: '(084) 400-6020', href: 'tel:+630844006020' },
];

export default function StatusPage() {
  const params = useParams();
  const router = useRouter();
  const incidentId = params.incidentId as string;
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!incidentId) return;

    const supabase = createClient();

    supabase
      .from('incidents')
      .select('*')
      .eq('id', incidentId)
      .single()
      .then(({ data }) => {
        if (data) setIncident(data as Incident);
        setLoading(false);
      });

    const channel = supabase
      .channel(`incident:status:${incidentId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'incidents', filter: `id=eq.${incidentId}` },
        (payload) => setIncident(payload.new as Incident)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [incidentId]);

  if (loading) {
    return (
      <main
        className="min-h-[100dvh] flex items-center justify-center"
        style={{ background: 'var(--bg-base)' }}
      >
        <div className="flex items-center gap-3 text-[var(--text-secondary)]">
          <div
            className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}
          />
          <span className="font-ui text-sm">Loading status…</span>
        </div>
      </main>
    );
  }

  if (!incident) {
    return (
      <main
        className="min-h-[100dvh] flex items-center justify-center p-4"
        style={{ background: 'var(--bg-base)' }}
      >
        <div
          className="p-8 rounded-2xl text-center max-w-sm w-full"
          style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-lg)' }}
        >
          <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--accent-primary)' }} />
          <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">
            Incident not found
          </h2>
          <p className="font-ui text-sm text-[var(--text-secondary)] mt-2">
            This incident ID may be invalid or expired.
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="mt-6 px-6 py-3 rounded-full font-ui text-sm font-semibold text-white"
            style={{ background: 'var(--accent-primary)' }}
          >
            Go to Home
          </button>
        </div>
      </main>
    );
  }

  const reachedCount = getReachedSteps(incident.status);
  const isDispatched = incident.status === 'dispatched' || incident.status === 'resolved';
  const statusLabel = {
    pending: 'Pending',
    acknowledged: 'Responder notified',
    dispatched: 'Help dispatched',
    resolved: 'Resolved',
    cancelled: 'Cancelled',
  }[incident.status] ?? 'Pending';

  const statusColor = {
    pending: 'var(--accent-primary)',
    acknowledged: 'var(--accent-amber)',
    dispatched: 'var(--accent-green)',
    resolved: 'var(--accent-green)',
    cancelled: 'var(--text-muted)',
  }[incident.status] ?? 'var(--accent-primary)';

  return (
    <main
      className="min-h-[100dvh] flex flex-col items-center py-8 px-4"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="flex items-center gap-2 font-ui text-sm text-[var(--text-secondary)] mb-6 hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        {/* Main card */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-lg)' }}
        >
          {/* Pulsing icon */}
          <div className="flex flex-col items-center text-center mb-6">
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'var(--accent-primary-soft)' }}
            >
              <Zap className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} />
            </motion.div>
            <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">
              Your emergency signal was received
            </h1>
            <p className="font-ui text-sm text-[var(--text-secondary)] mt-2">
              Sent {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
            </p>

            {/* Status badge */}
            <div
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full font-ui text-sm font-semibold"
              style={{ background: `color-mix(in srgb, ${statusColor} 12%, transparent)`, color: statusColor }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: statusColor, animation: isDispatched ? 'none' : 'sos-pulse-ring 2s infinite' }}
              />
              {statusLabel}
            </div>
          </div>

          {/* Stepper */}
          <div className="space-y-3 mb-6">
            {STEPS.map((step, idx) => {
              const reached = idx < reachedCount;
              const active = idx === reachedCount - 1;
              const Icon = step.icon;
              const ts = incident.created_at ? new Date(new Date(incident.created_at).getTime() + idx * 600) : null;

              return (
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: reached
                        ? active
                          ? statusColor
                          : 'var(--accent-green)'
                        : 'var(--bg-base)',
                      border: reached ? 'none' : '2px solid var(--border-medium)',
                    }}
                  >
                    <Icon
                      className="w-4 h-4"
                      style={{ color: reached ? '#FFFFFF' : 'var(--text-muted)' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-ui text-sm font-semibold"
                      style={{ color: reached ? 'var(--text-primary)' : 'var(--text-muted)' }}
                    >
                      {step.label}
                    </div>
                    {reached && ts ? (
                      <div className="font-code text-xs text-[var(--text-muted)]">
                        {ts.toLocaleTimeString()}
                      </div>
                    ) : (
                      <div className="font-ui text-xs text-[var(--text-muted)] animate-pulse">
                        Waiting…
                      </div>
                    )}
                  </div>
                  {reached && (
                    <CheckCircle2
                      className="w-4 h-4 shrink-0"
                      style={{ color: active ? statusColor : 'var(--accent-green)' }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Dispatched banner */}
          <AnimatePresence>
            {isDispatched && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 250, damping: 20 }}
                className="w-full px-4 py-4 rounded-2xl flex items-center gap-3 mb-4"
                style={{ background: 'var(--accent-green-soft)', border: '1px solid var(--accent-green)' }}
              >
                <Truck className="w-6 h-6 shrink-0" style={{ color: 'var(--accent-green)' }} />
                <div>
                  <div className="font-display font-bold text-sm text-[var(--text-primary)]">
                    Help is on the way
                  </div>
                  <div className="font-ui text-xs text-[var(--text-secondary)] mt-0.5">
                    A responder has been dispatched to your location
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Incident ID */}
          <div className="pt-4 border-t border-[var(--border)] text-center">
            <span className="font-ui text-xs text-[var(--text-muted)]">Incident </span>
            <span className="font-code text-xs text-[var(--text-secondary)]">
              #{incident.id.slice(0, 16)}…
            </span>
          </div>
        </div>

        {/* Emergency contacts */}
        <div
          className="mt-4 rounded-2xl p-4"
          style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-sm)' }}
        >
          <h3 className="font-display font-bold text-sm text-[var(--text-primary)] mb-3">
            Emergency Contacts
          </h3>
          <div className="space-y-2">
            {EMERGENCY_CONTACTS.map((c) => (
              <a
                key={c.href}
                href={c.href}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--bg-base)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--accent-primary-soft)' }}
                  >
                    <Phone className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <div>
                    <div className="font-ui text-sm font-semibold text-[var(--text-primary)]">
                      {c.label}
                    </div>
                    <div className="font-code text-xs text-[var(--text-secondary)]">{c.number}</div>
                  </div>
                </div>
                <Phone className="w-4 h-4 text-[var(--text-muted)]" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
