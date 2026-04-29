'use client';
import { useState, useRef, useCallback } from 'react';

export function useSosActivation(
  onActivate: () => Promise<void>,
  holdTimeMs = 3000
) {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [status, setStatus]       = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const holdTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef  = useRef<number>(0);
  const animationRef  = useRef<number | null>(null);
  const isHoldingRef  = useRef(false); // stable ref — avoids stale closure in setTimeout

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current)  clearTimeout(holdTimerRef.current);
    if (animationRef.current)  cancelAnimationFrame(animationRef.current);
    holdTimerRef.current  = null;
    animationRef.current  = null;
    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      setIsHolding(false);
      setProgress(0);
    }
  }, []); // stable — uses refs only

  const startHold = useCallback(() => {
    if (status === 'loading' || status === 'success') return;

    isHoldingRef.current = true;
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
      cancelHold(); // safe — reads from refs, not stale closure
      setStatus('loading');
      try {
        // Trigger emergency call before API submit (mobile only, skip localhost dev)
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
          const num = process.env.NEXT_PUBLIC_DISPATCH_NUMBER ?? '09602077788';
          const a = document.createElement('a');
          a.href = `tel:${num}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          await new Promise<void>((r) => setTimeout(r, 300));
        } else {
          console.log('[DEV] Would call:', process.env.NEXT_PUBLIC_DISPATCH_NUMBER ?? '09602077788');
        }
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
