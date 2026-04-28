'use client';

import { AlertTriangle, MapPin } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { NearbyIncident } from '@/types';

interface NearbyAlertProps {
  nearby: NearbyIncident[];
}

export function NearbyAlert({ nearby }: NearbyAlertProps) {
  if (nearby.length === 0) return null;

  const closest = nearby[0];
  const distM = Math.round(closest.distanceMeters);
  const distStr = distM >= 1000 ? `${(distM / 1000).toFixed(1)}km` : `${distM}m`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className="mx-4 rounded-2xl px-4 py-3"
        style={{
          background: 'var(--accent-amber-soft)',
          border: '1px solid var(--accent-amber)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle
              className="w-5 h-5 mt-0.5 shrink-0"
              style={{ color: 'var(--accent-amber)' }}
            />
            <div>
              <div className="font-display font-bold text-sm text-[var(--text-primary)]">
                Emergency nearby
              </div>
              <div className="font-ui text-sm text-[var(--text-secondary)] mt-0.5">
                {nearby.length === 1
                  ? `An incident was reported ${distStr} from your location`
                  : `${nearby.length} incidents within 500m — closest ${distStr} away`}
              </div>
            </div>
          </div>
          <Link
            href="/map"
            className="shrink-0 flex items-center gap-1 font-ui text-xs font-semibold whitespace-nowrap"
            style={{ color: 'var(--accent-amber)' }}
          >
            <MapPin className="w-3.5 h-3.5" />
            View on Map
          </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
