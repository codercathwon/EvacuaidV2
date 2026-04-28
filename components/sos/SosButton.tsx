'use client';
import { useEffect } from 'react';
import { useSosActivation } from '@/hooks/useSosActivation';
import { Loader2, Check, AlertCircle } from 'lucide-react';

interface SosButtonProps {
  onActivate: () => Promise<void>;
  disabled?: boolean;
  onStatusChange?: (status: 'idle' | 'holding' | 'loading' | 'success' | 'error') => void;
}

export function SosButton({ onActivate, disabled, onStatusChange }: SosButtonProps) {
  const { isHolding, progress, status, errorMessage, handlers, reset } = useSosActivation(onActivate, 3000);

  useEffect(() => {
    onStatusChange?.(status);
  }, [onStatusChange, status]);

  return (
    <div className="relative flex flex-col items-center justify-center touch-none select-none">
      <div className="relative flex items-center justify-center w-[18rem] h-[18rem] sm:w-[20rem] sm:h-[20rem]">
        {/* Pulse rings (two, staggered) */}
        {status !== 'loading' && status !== 'success' && (
          <>
            <div
              aria-hidden
              className="absolute inset-0 rounded-full border border-[color:var(--accent-red)]/30"
              style={{ animation: 'evacuaid-pulse-ring 2s infinite' }}
            />
            <div
              aria-hidden
              className="absolute inset-0 rounded-full border border-[color:var(--accent-red)]/30"
              style={{ animation: 'evacuaid-pulse-ring 2s infinite', animationDelay: '2.5s' }}
            />
          </>
        )}

        {/* Hold progress ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" className="stroke-[color:var(--border)] fill-none stroke-[8px]" />
          <circle
            cx="50"
            cy="50"
            r="46"
            className="fill-none stroke-[8px]"
            style={{
              stroke: status === 'success' ? 'var(--accent-green)' : 'var(--accent-red-glow)',
              strokeDasharray: 289.02,
              strokeDashoffset: 289.02 - (289.02 * progress) / 100,
              opacity: progress > 0 ? 1 : 0,
              transition: 'stroke-dashoffset 150ms ease, opacity 150ms ease',
            }}
          />
        </svg>

        <button
          {...handlers}
          disabled={disabled || status === 'loading'}
          className={[
            'relative z-10 min-w-[200px] min-h-[200px] w-[12.5rem] h-[12.5rem] rounded-full',
            'shadow-[0_0_0_1px_var(--border-bright),0_30px_80px_rgba(0,0,0,0.55)]',
            'flex items-center justify-center flex-col',
            'transition-[transform,background-color,box-shadow] duration-[150ms] ease-out',
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer active:scale-[0.98]',
            isHolding && !disabled ? 'scale-[0.98]' : '',
            status === 'success'
              ? 'bg-[color:var(--accent-green)]'
              : 'bg-[color:var(--accent-red)] hover:bg-[color:var(--accent-red-glow)]',
          ].join(' ')}
          style={{
            boxShadow:
              isHolding && status !== 'success'
                ? '0 0 0 10px color-mix(in srgb, var(--accent-red) 25%, transparent), 0 30px 80px rgba(0,0,0,0.55)'
                : undefined,
          }}
          aria-label="Send Emergency SOS"
          role="button"
          aria-busy={status === 'loading'}
        >
          {status === 'loading' ? (
            <Loader2 className="w-14 h-14 text-[color:var(--text-primary)] animate-spin" />
          ) : status === 'success' ? (
            <>
              <div className="w-14 h-14 rounded-full bg-black/15 flex items-center justify-center">
                <Check className="w-8 h-8 text-[color:var(--text-primary)]" />
              </div>
              <div className="mt-3 font-display font-bold text-[44px] leading-none text-[color:var(--text-primary)]">
                SOS
              </div>
              <div className="mt-1 font-ui text-[10px] uppercase tracking-[0.24em] text-[color:var(--text-primary)]/85">
                SENT
              </div>
            </>
          ) : (
            <>
              <div className="font-display font-bold text-[48px] leading-none text-[color:var(--text-primary)]">
                SOS
              </div>
              <div className="mt-2 font-ui text-[10px] uppercase tracking-[0.26em] text-[color:var(--text-secondary)]">
                HOLD 3 SEC
              </div>
            </>
          )}
        </button>
      </div>

      {status === 'error' && (
        <div className="mt-5 w-full max-w-md text-center">
          <div className="inline-flex items-center gap-2 text-[12px] text-[color:var(--accent-red-glow)]">
            <AlertCircle className="w-4 h-4" />
            <span className="font-ui">{errorMessage || 'Failed to submit SOS'}</span>
          </div>
          <button
            type="button"
            onClick={reset}
            className="mt-3 text-[11px] uppercase tracking-[0.22em] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors duration-[150ms] ease-out"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
