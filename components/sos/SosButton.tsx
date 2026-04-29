'use client';

import { useEffect, useState } from 'react';
import { useSosActivation } from '@/hooks/useSosActivation';
import { Loader2, Check, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SosButtonProps {
  onActivate: () => Promise<void>;
  disabled?: boolean;
  onStatusChange?: (status: 'idle' | 'holding' | 'loading' | 'success' | 'error') => void;
}

export function SosButton({ onActivate, disabled, onStatusChange }: SosButtonProps) {
  const { isHolding, progress, status, errorMessage, handlers, reset } = useSosActivation(onActivate, 3000);

  const [showCalling, setShowCalling] = useState(false);

  useEffect(() => {
    onStatusChange?.(isHolding && status === 'idle' ? 'holding' : status);
  }, [onStatusChange, status, isHolding]);

  useEffect(() => {
    if (status === 'success') {
      setShowCalling(true);
      const t = setTimeout(() => setShowCalling(false), 3000);
      return () => clearTimeout(t);
    }
  }, [status]);

  // SVG ring: r=46 on a 100×100 viewBox scaled to 310px → circumference = 2π×46
  const circumference = 289.02;
  const dashOffset    = circumference - (circumference * progress) / 100;

  return (
    <div className="relative flex flex-col items-center justify-center touch-none select-none">

      {/* Outermost static glow (320px) */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 320, height: 320,
          background: 'radial-gradient(circle, rgba(255,75,75,0.05) 0%, transparent 70%)',
        }}
      />

      {/* Middle pulse ring (260px) */}
      {status === 'idle' && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 260, height: 260,
            background: 'rgba(255,75,75,0.09)',
            animation: 'sos-pulse-ring 2.5s ease-in-out infinite',
          }}
        />
      )}

      {/* Inner pulse ring (210px) */}
      {status === 'idle' && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 210, height: 210,
            background: 'rgba(255,75,75,0.14)',
            animation: 'sos-pulse-ring 2.5s ease-in-out infinite',
            animationDelay: '0.4s',
          }}
        />
      )}

      <div className="relative flex items-center justify-center" style={{ width: 310, height: 310 }}>
        {/* SVG progress ring */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
          viewBox="0 0 100 100"
        >
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="5" />
          <circle
            cx="50" cy="50" r="46" fill="none" strokeWidth="5"
            style={{
              stroke: status === 'success' ? 'var(--accent-green)' : 'var(--accent-primary)',
              strokeDasharray: circumference,
              strokeDashoffset: dashOffset,
              strokeLinecap: 'round',
              opacity: progress > 0 ? 1 : 0,
              transition: 'stroke-dashoffset 150ms ease, opacity 200ms ease',
            }}
          />
        </svg>

        {/* Main button (170px) */}
        <motion.button
          {...handlers}
          disabled={disabled || status === 'loading'}
          className="relative z-10 rounded-full flex items-center justify-center flex-col cursor-pointer focus:outline-none"
          style={{
            width: 170, height: 170,
            background: status === 'success'
              ? 'linear-gradient(145deg, #00C48C, #00E5A0)'
              : isHolding
              ? 'linear-gradient(145deg, #E03535, #FF4B4B)'
              : 'linear-gradient(145deg, #FF4B4B, #FF6B6B)',
            boxShadow: status === 'success'
              ? '0 8px 32px rgba(0,196,140,0.35)'
              : isHolding
              ? '0 8px 40px rgba(255,75,75,0.45)'
              : 'var(--shadow-red)',
          }}
          whileTap={{ scale: 0.97 }}
          animate={{ scale: status === 'success' ? [1, 1.05, 1] : 1 }}
          transition={{ duration: 0.4 }}
          aria-label="Send Emergency SOS"
          aria-busy={status === 'loading'}
        >
          <AnimatePresence mode="wait">
            {status === 'loading' && (
              <motion.div key="loading" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                <Loader2 className="w-11 h-11 text-white animate-spin" />
              </motion.div>
            )}
            {status === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="flex flex-col items-center gap-2"
              >
                <Check className="w-11 h-11 text-white" strokeWidth={3} />
                <span className="font-ui font-semibold text-lg text-white">Help Sent!</span>
                <span className="font-ui text-xs text-white/75">Responders notified</span>
                {showCalling && (
                  <motion.span
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="font-ui text-[10px] text-white/60"
                  >
                    Calling {process.env.NEXT_PUBLIC_DISPATCH_NUMBER ?? '09602077788'}…
                  </motion.span>
                )}
              </motion.div>
            )}
            {(status === 'idle' || status === 'error') && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-1"
              >
                <span className="font-ui font-semibold text-[2rem] leading-none text-white tracking-widest">SOS</span>
                <span className="font-ui text-[11px] text-white/70">Hold 3 seconds</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Error */}
      <AnimatePresence>
        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="mt-5 text-center"
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-ui text-sm"
              style={{ background: 'var(--accent-primary-soft)', color: 'var(--accent-primary)' }}
            >
              <AlertTriangle className="w-4 h-4" />
              {errorMessage || 'Failed to submit SOS. Please try again.'}
            </div>
            <button
              type="button"
              onClick={reset}
              className="mt-3 block mx-auto font-ui text-xs text-[var(--text-secondary)] underline"
            >
              Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
