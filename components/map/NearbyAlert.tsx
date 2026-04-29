'use client';

import { AlertTriangle, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NearbyIncident } from '@/types';

interface NearbyAlertProps {
  nearby: NearbyIncident[];
}

export function NearbyAlert({ nearby }: NearbyAlertProps) {
  if (nearby.length === 0) return null;

  const distM   = Math.round(nearby[0].distanceMeters);
  const distStr = distM >= 1000 ? `${(distM / 1000).toFixed(1)}km` : `${distM}m`;

  const scrollToMap = () =>
    document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className="mx-4"
      >
        <button
          type="button"
          onClick={scrollToMap}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-opacity hover:opacity-90"
          style={{
            background: 'var(--accent-amber-soft)',
            border: '1px solid rgba(245,158,11,0.2)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <AlertTriangle className="w-[18px] h-[18px] shrink-0" style={{ color: 'var(--accent-amber)' }} />
          <div className="flex-1 min-w-0">
            <p className="font-ui font-semibold text-sm text-[var(--text-primary)]">Emergency nearby</p>
            <p className="font-ui text-xs text-[var(--text-secondary)] mt-0.5">
              {nearby.length === 1
                ? `Incident reported ${distStr} from your location`
                : `${nearby.length} incidents within 500m — closest ${distStr} away`}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 shrink-0 text-[var(--text-muted)]" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
