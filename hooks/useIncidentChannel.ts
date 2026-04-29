'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Incident } from '@/types';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function playBellSound() {
  try {
    const AudioCtx: typeof window.AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // audio not available
  }
}

export function useIncidentChannel(
  municipalityId: string | null,
  onNew: (incident: Incident) => void,
  onUpdate: (incident: Incident) => void,
  onConnectionChange?: (status: ConnectionStatus) => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onNewRef = useRef(onNew);
  const onUpdateRef = useRef(onUpdate);
  const onConnectionChangeRef = useRef(onConnectionChange);

  useEffect(() => { onNewRef.current = onNew; }, [onNew]);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);
  useEffect(() => { onConnectionChangeRef.current = onConnectionChange; }, [onConnectionChange]);

  const subscribe = useCallback(() => {
    if (!municipalityId) return;

    const supabase = createClient();
    onConnectionChangeRef.current?.('connecting');

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const filter = `municipality_id=eq.${municipalityId}`;
    const channel = supabase
      .channel(`incidents:${municipalityId}:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidents', filter },
        (payload) => {
          playBellSound();
          onNewRef.current(payload.new as Incident);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'incidents', filter },
        (payload) => {
          onUpdateRef.current(payload.new as Incident);
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          onConnectionChangeRef.current?.('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          onConnectionChangeRef.current?.('error');
          console.warn('Realtime channel error, reconnecting in 5s…', err);
          channelRef.current = null;
          reconnectTimerRef.current = setTimeout(() => subscribe(), 5000);
        } else if (status === 'CLOSED') {
          onConnectionChangeRef.current?.('disconnected');
        }
      });

    channelRef.current = channel;
  }, [municipalityId]);

  useEffect(() => {
    subscribe();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      const supabase = createClient();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [subscribe]);
}

export function useAllIncidentsChannel(
  onNew: (incident: Incident) => void,
  onUpdate: (incident: Incident) => void,
  onConnectionChange?: (status: ConnectionStatus) => void,
  enabled = true
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onNewRef = useRef(onNew);
  const onUpdateRef = useRef(onUpdate);
  const onConnectionChangeRef = useRef(onConnectionChange);
  const enabledRef = useRef(enabled);

  useEffect(() => { onNewRef.current = onNew; }, [onNew]);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);
  useEffect(() => { onConnectionChangeRef.current = onConnectionChange; }, [onConnectionChange]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const subscribe = useCallback(() => {
    if (!enabledRef.current) return;

    const supabase = createClient();
    onConnectionChangeRef.current?.('connecting');

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`incidents:all:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidents' },
        (payload) => {
          if (!enabledRef.current) return;
          playBellSound();
          onNewRef.current(payload.new as Incident);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'incidents' },
        (payload) => {
          if (!enabledRef.current) return;
          onUpdateRef.current(payload.new as Incident);
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          onConnectionChangeRef.current?.('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          onConnectionChangeRef.current?.('error');
          console.warn('Realtime all-incidents channel error, reconnecting in 5s…', err);
          channelRef.current = null;
          reconnectTimerRef.current = setTimeout(() => subscribe(), 5000);
        } else if (status === 'CLOSED') {
          onConnectionChangeRef.current?.('disconnected');
        }
      });

    channelRef.current = channel;
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      const supabase = createClient();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }
    subscribe();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      const supabase = createClient();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [subscribe, enabled]);
}
