'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X, AlertTriangle, Send, ChevronDown } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type HistoryItem = { role: 'user' | 'assistant'; content: string };

const cleanMessage = (text: string) =>
  text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6} /g, '')
    .replace(/^\d+\. /gm, '')
    .replace(/^[-•] /gm, '')
    .trim();

const OPENING =
  "Hello! I'm the EvacuAid Emergency Assistant. Are you safe right now? Please describe your situation and I'll help guide you.";

const QUICK_REPLIES: { label: string; coral: boolean }[] = [
  { label: 'Yes, I need help now', coral: true },
  { label: 'I have a question', coral: false },
];

interface EmergencyChatProps {
  variant?: 'floating' | 'inline';
}

export function EmergencyChat({ variant = 'floating' }: EmergencyChatProps) {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<Message[]>([{ role: 'assistant', content: OPENING }]);
  const [input, setInput]         = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [triggered, setTriggered] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const [location, setLocation]   = useState<{ lat: number; lng: number } | null>(null);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const inputRef                  = useRef<HTMLInputElement>(null);
  const { getPosition }           = useGeolocation();

  const sessionId = useMemo<string>(() => {
    if (typeof window === 'undefined') return crypto.randomUUID();
    const stored = localStorage.getItem('evacuaid_chat_sid');
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem('evacuaid_chat_sid', id);
    return id;
  }, []);

  useEffect(() => {
    if (!open) return;
    setShowPulse(false);
    if (!location) {
      getPosition()
        .then((pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }))
        .catch(() => {});
    }
    setTimeout(() => inputRef.current?.focus(), 200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setIsLoading(true);

    const history: HistoryItem[] = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const res  = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: trimmed, sessionId, location, history }),
      });
      const data = await res.json() as { reply: string; triggered: boolean };
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      if (data.triggered) setTriggered(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Connection error. For immediate help, call 911 or your local MDRRMO.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  /* ── Shared chat panel content ── */
  const chatContent = (
    <>
      {/* Message area */}
      <div
        className="flex-1 overflow-y-auto p-3 space-y-2.5"
        style={{ background: 'var(--bg-base)' }}
      >
        <div
          className="rounded-xl px-3 py-2 text-xs leading-snug"
          style={{ background: '#FEF3C7', color: '#92400E' }}
        >
          <strong>Important:</strong> This AI cannot replace 911. In life-threatening emergencies, call 911 immediately.
        </div>

        {triggered && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl px-3 py-2 flex items-start gap-2 text-xs leading-snug"
            style={{ background: '#FEE2E2', color: '#991B1B' }}
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              <strong>Emergency reported!</strong> Responders have been alerted. Stay calm and stay on the line.
            </span>
          </motion.div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-snug whitespace-pre-wrap"
              style={
                msg.role === 'user'
                  ? { background: 'var(--accent-primary)', color: '#fff' }
                  : { background: 'var(--bg-elevated)', color: 'var(--text-primary)' }
              }
            >
              {msg.role === 'assistant' ? cleanMessage(msg.content) : msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl px-4 py-3 flex gap-1 items-center"
              style={{ background: 'var(--bg-elevated)' }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: 'var(--text-secondary)',
                    display: 'inline-block',
                    animation: `ecDot 1.2s ease-in-out ${i * 0.18}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {messages.length === 1 && !isLoading && (
          <div className="flex gap-2 flex-wrap pt-0.5">
            {QUICK_REPLIES.map(({ label, coral }) => (
              <button
                key={label}
                onClick={() => sendMessage(label)}
                className="rounded-full px-3 py-1.5 text-xs font-medium border transition-colors"
                style={
                  coral
                    ? { background: 'var(--accent-primary)', color: '#fff', borderColor: 'var(--accent-primary)' }
                    : { background: 'transparent', color: 'var(--text-primary)', borderColor: 'var(--border-subtle)' }
                }
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0 border-t"
        style={{ background: 'var(--bg-base)', borderColor: 'var(--border-subtle)' }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Describe your emergency…"
          disabled={isLoading}
          className="flex-1 text-sm rounded-xl px-3 py-2 outline-none border"
          style={{
            background:  'var(--bg-elevated)',
            color:       'var(--text-primary)',
            borderColor: 'var(--border-subtle)',
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={isLoading || !input.trim()}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity disabled:opacity-40 shrink-0"
          style={{ background: 'var(--accent-primary)' }}
          aria-label="Send"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </>
  );

  /* ── Inline variant ── */
  if (variant === 'inline') {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all"
          style={{
            background: 'var(--bg-surface)',
            border: '1.5px solid var(--border-medium)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-primary-soft)' }}
            >
              <MessageCircle className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div className="text-left">
              <p className="font-ui font-semibold text-sm text-[var(--text-primary)]">AI Emergency Guide</p>
              <p className="font-ui text-xs text-[var(--text-muted)]">Get guidance before activating SOS</p>
            </div>
          </div>
          <ChevronDown
            className="w-4 h-4 transition-transform duration-200 shrink-0"
            style={{
              color: 'var(--text-muted)',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              key="inline-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div
                className="mt-2 rounded-2xl overflow-hidden flex flex-col"
                style={{
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-surface)',
                  height: 'min(60vh, 420px)',
                }}
              >
                {/* Inline header */}
                <div
                  className="flex items-center justify-between px-4 py-2.5 shrink-0"
                  style={{ background: 'var(--accent-primary)' }}
                >
                  <p className="font-ui font-semibold text-white text-sm">EvacuAid Assistant</p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-white/70 hover:text-white transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {chatContent}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <style>{`
          @keyframes ecDot {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
            40%            { transform: translateY(-5px); opacity: 1; }
          }
        `}</style>
      </>
    );
  }

  /* ── Floating variant (default) ── */
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open Emergency Assistant"
        className={`fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-transform hover:scale-105 active:scale-95 ${showPulse ? 'animate-pulse' : ''}`}
        style={{ background: 'var(--accent-primary)' }}
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.97 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            className="fixed bottom-[5.5rem] lg:bottom-6 right-4 lg:right-6 z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{
              width:  'min(calc(100vw - 2rem), 360px)',
              height: 'min(70vh, 480px)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ background: 'var(--accent-primary)' }}
            >
              <p className="font-semibold text-white text-sm leading-tight">EvacuAid Assistant</p>
              <button
                onClick={() => setOpen(false)}
                className="text-white/70 hover:text-white transition-colors ml-2"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {chatContent}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes ecDot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40%            { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </>
  );
}
