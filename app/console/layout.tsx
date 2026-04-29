'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Info, X } from 'lucide-react';

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const [isGuest, setIsGuest]             = useState(false);
  const [guestDismissed, setGuestDismissed] = useState(false);
  const [loaded, setLoaded]               = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setGuestDismissed(sessionStorage.getItem('console_guest_dismissed') === '1');
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsGuest(!data.user);
      setLoaded(true);
    });
  }, []);

  const dismiss = () => {
    setGuestDismissed(true);
    sessionStorage.setItem('console_guest_dismissed', '1');
  };

  if (!loaded) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div
          className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {isGuest && !guestDismissed && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-2.5"
          style={{
            background: 'var(--accent-amber-soft)',
            borderBottom: '1px solid rgba(245,158,11,0.2)',
          }}
        >
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent-amber)' }} />
            <span className="font-ui text-sm text-[var(--text-primary)]">
              You&apos;re viewing as a guest.{' '}
              <Link
                href="/login"
                className="font-semibold underline underline-offset-2"
                style={{ color: 'var(--accent-primary)' }}
              >
                Sign in for full access
              </Link>
            </span>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 p-1 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </button>
        </div>
      )}
      {children}
    </div>
  );
}
