'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Info, X } from 'lucide-react';

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isGuest, setIsGuest] = useState(false);
  const [guestDismissed, setGuestDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsGuest(!data.user);
      setLoaded(true);
    });
  }, []);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--text-secondary)]">
          <div
            className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}
          />
          <span className="font-ui text-sm">Loading console…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {isGuest && !guestDismissed && (
        <div
          className="mx-4 mt-3 px-4 py-3 rounded-2xl flex items-center justify-between gap-3"
          style={{
            background: 'var(--accent-amber-soft)',
            border: '1px solid var(--accent-amber)',
          }}
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-amber)' }} />
            <span className="font-ui text-sm text-[var(--text-primary)]">
              Viewing as guest —{' '}
              <Link
                href="/login"
                className="font-semibold underline"
                style={{ color: 'var(--accent-amber)' }}
              >
                Login for full access
              </Link>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setGuestDismissed(true)}
            className="shrink-0 p-1 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <X className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>
      )}
      {children}
    </div>
  );
}
