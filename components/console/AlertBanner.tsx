'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

export type AlertBannerVariant = 'incident' | 'border';

interface AlertBannerProps {
  open: boolean;
  variant: AlertBannerVariant;
  title: string;
  description: string;
  onClose: () => void;
  playSound?: boolean;
}

function playBell() {
  try {
    const AudioContextCtor =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 880;

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.31);

    osc.onended = () => {
      try {
        ctx.close();
      } catch {
        // ignore
      }
    };
  } catch {
    // ignore
  }
}

export function AlertBanner({ open, variant, title, description, onClose, playSound }: AlertBannerProps) {
  useEffect(() => {
    if (open && playSound) playBell();
  }, [open, playSound]);

  if (!open) return null;

  const bg =
    variant === 'incident'
      ? 'bg-[#7F1D1D] border-[color:var(--accent-red)]/40'
      : 'bg-[color:var(--accent-amber)]/15 border-[color:var(--accent-amber)]/50';

  const titleColor =
    variant === 'incident' ? 'text-[color:var(--text-primary)]' : 'text-[color:var(--accent-amber)]';

  return (
    <div
      className={[
        'w-full',
        'border-b',
        bg,
        'text-[color:var(--text-primary)]',
        'animate-[evacuaid-slide-down_300ms_ease]',
      ].join(' ')}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-3 flex items-start gap-3">
        <div className="flex-1">
          <div className="font-display font-bold tracking-[0.08em] text-[13px] uppercase">
            <span className={titleColor}>{title}</span>
          </div>
          <div className="mt-1 font-ui text-[12px] text-[color:var(--text-secondary)]">{description}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-2 border border-[color:var(--border-bright)] bg-black/20 hover:bg-black/35 transition-colors duration-[150ms] ease-out"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

