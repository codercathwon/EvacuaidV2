'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Mail, MailCheck, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === 'auth_failed' ? 'Authentication failed. Please try again.' : null
  );
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.push('/console');
    });
  }, [router]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    });

    setSending(false);

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
      setCountdown(30);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setSending(true);
    setError(null);

    const supabase = createClient();
    await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/callback` },
    });

    setSending(false);
    setCountdown(30);
  };

  return (
    <main
      className="min-h-[100dvh] flex items-center justify-center p-4"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="w-full max-w-sm">
        <AnimatePresence mode="wait">
          {!sent ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="rounded-2xl p-8"
              style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-lg)' }}
            >
              {/* Logo */}
              <div className="flex flex-col items-center text-center mb-8">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'var(--accent-primary-soft)' }}
                >
                  <Shield className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} />
                </div>
                <h1 className="font-display font-extrabold text-2xl text-[var(--text-primary)]">
                  EvacuAid
                </h1>
                <p className="font-ui text-sm text-[var(--text-secondary)] mt-1">
                  Sign in to your account
                </p>
              </div>

              {/* Error banner */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-4"
                  >
                    <div
                      className="flex items-start gap-2 px-4 py-3 rounded-xl"
                      style={{ background: 'var(--accent-primary-soft)', color: 'var(--accent-primary)' }}
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="font-ui text-sm">{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleSend} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block font-ui text-sm font-medium text-[var(--text-primary)] mb-1.5"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--text-muted)' }}
                    />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl font-ui text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all"
                      style={{
                        background: 'var(--bg-base)',
                        border: '1.5px solid var(--border-medium)',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--accent-primary)';
                        e.target.style.boxShadow = '0 0 0 4px var(--accent-primary-glow)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--border-medium)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={sending || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-display font-semibold text-base text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--accent-primary)', boxShadow: 'var(--shadow-red)' }}
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      Send login link
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 flex items-center gap-3">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="font-ui text-xs text-[var(--text-muted)]">or</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              <Link
                href="/"
                className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-full font-ui text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)]"
                style={{ border: '1.5px solid var(--border-medium)' }}
              >
                Continue without signing in →
              </Link>

              <p className="font-ui text-xs text-[var(--text-muted)] text-center mt-6">
                For authorized responders only.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="rounded-2xl p-8 text-center"
              style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-lg)' }}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--accent-primary-soft)' }}
              >
                <MailCheck className="w-9 h-9" style={{ color: 'var(--accent-primary)' }} />
              </motion.div>

              <h2 className="font-display font-bold text-2xl text-[var(--text-primary)]">
                Check your inbox
              </h2>
              <p className="font-ui text-sm text-[var(--text-secondary)] mt-2">
                We sent a login link to{' '}
                <span className="font-semibold text-[var(--text-primary)]">{email}</span>
              </p>
              <p className="font-ui text-xs text-[var(--text-muted)] mt-1">
                Link expires in 10 minutes
              </p>

              <div className="mt-6">
                {countdown > 0 ? (
                  <p className="font-ui text-sm text-[var(--text-muted)]">
                    Resend in{' '}
                    <span className="font-code font-bold text-[var(--text-secondary)]">
                      {countdown}s
                    </span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={sending}
                    className="font-ui text-sm font-semibold underline"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    {sending ? 'Sending…' : 'Resend link'}
                  </button>
                )}
              </div>

              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 font-ui text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Back to Home
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-[100dvh] flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
