'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="flex h-screen w-full flex-col items-center justify-center gap-4"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <div
        className="font-display font-bold text-[32px] leading-none text-center px-4"
        style={{ color: 'var(--accent-red)' }}
      >
        SOMETHING WENT WRONG
      </div>
      <p
        className="font-ui text-[12px] uppercase tracking-[0.22em] text-center px-4 max-w-md"
        style={{ color: 'var(--text-muted)' }}
      >
        An unexpected error occurred.
      </p>
      <div className="flex gap-4 mt-4">
        <button
          onClick={() => reset()}
          className="px-4 py-2 border font-ui text-[11px] uppercase tracking-[0.22em] transition-colors duration-[150ms]"
          style={{
            borderColor: 'var(--accent-blue)',
            color: 'var(--accent-blue)',
          }}
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-4 py-2 border font-ui text-[11px] uppercase tracking-[0.22em] transition-colors duration-[150ms]"
          style={{
            borderColor: 'var(--border-bright)',
            color: 'var(--text-secondary)',
          }}
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
