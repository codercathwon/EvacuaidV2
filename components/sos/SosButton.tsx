'use client';

import { useEffect } from 'react';
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

  useEffect(() => {
    onStatusChange?.(isHolding && status === 'idle' ? 'holding' : status);
  }, [onStatusChange, status, isHolding]);

  const circumference = 289.02;
  const dashOffset = circumference - (circumference * progress) / 100;

  return (
    <div className="relative flex flex-col items-center justify-center touch-none select-none">
      {/* Glow background */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 300,
          height: 300,
          background: 'radial-gradient(circle, rgba(255,75,75,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Outer pulse ring */}
      {status === 'idle' && (
        <>
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 260,
              height: 260,
              background: 'rgba(255,75,75,0.10)',
              animation: 'sos-pulse-ring 2s ease infinite',
            }}
          />
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 260,
              height: 260,
              background: 'rgba(255,75,75,0.10)',
              animation: 'sos-pulse-ring 2s ease infinite',
              animationDelay: '0.3s',
            }}
          />
        </>
      )}

      {/* Inner ring */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 220,
          height: 220,
          background: status === 'success'
            ? 'rgba(0,196,140,0.15)'
            : 'rgba(255,75,75,0.15)',
          transition: 'background 0.4s ease',
        }}
      />

      <div className="relative flex items-center justify-center" style={{ width: 300, height: 300 }}>
        {/* SVG progress ring */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth="6"
          />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            strokeWidth="6"
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

        {/* Main button */}
        <motion.button
          {...handlers}
          disabled={disabled || status === 'loading'}
          className="relative z-10 rounded-full flex items-center justify-center flex-col cursor-pointer focus:outline-none"
          style={{
            width: 180,
            height: 180,
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
          animate={{
            scale: status === 'success' ? [1, 1.05, 1] : 1,
          }}
          transition={{ duration: 0.4 }}
          aria-label="Send Emergency SOS"
          role="button"
          aria-busy={status === 'loading'}
        >
          <AnimatePresence mode="wait">
            {status === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              </motion.div>
            )}
            {status === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="flex flex-col items-center gap-2"
              >
                <Check className="w-12 h-12 text-white" strokeWidth={3} />
                <span className="font-display font-bold text-lg text-white">Help Sent!</span>
              </motion.div>
            )}
            {(status === 'idle' || status === 'error') && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-1"
              >
                <span className="font-display font-extrabold text-5xl text-white leading-none">
                  SOS
                </span>
                <span className="font-ui text-xs text-white/80">
                  Hold 3 sec
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Error state */}
      <AnimatePresence>
        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
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
