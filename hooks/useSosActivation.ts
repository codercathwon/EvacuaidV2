'use client';
import { useState, useRef, useCallback } from 'react';

export function useSosActivation(
  onActivate: () => Promise<void>,
  holdTimeMs = 3000
) {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (isHolding) {
      setIsHolding(false);
      setProgress(0);
    }
  }, [isHolding]);

  const startHold = useCallback(() => {
    if (status === 'loading' || status === 'success') return;

    setIsHolding(true);
    setProgress(0);
    startTimeRef.current = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / holdTimeMs) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        animationRef.current = requestAnimationFrame(updateProgress);
      }
    };
    animationRef.current = requestAnimationFrame(updateProgress);

    holdTimerRef.current = setTimeout(async () => {
      cancelHold();
      setStatus('loading');
      try {
        await onActivate();
        setStatus('success');
      } catch (err: unknown) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Failed to send SOS');
      }
    }, holdTimeMs);
  }, [holdTimeMs, onActivate, status, cancelHold]);

  const reset = useCallback(() => {
    cancelHold();
    setStatus('idle');
    setErrorMessage('');
    setProgress(0);
    setIsHolding(false);
  }, [cancelHold]);

  return {
    isHolding,
    progress,
    status,
    errorMessage,
    handlers: {
      onPointerDown: startHold,
      onPointerUp: cancelHold,
      onPointerLeave: cancelHold,
      onMouseLeave: cancelHold,
      onTouchEnd: cancelHold,
      onTouchCancel: cancelHold,
    },
    reset,
  };
}
