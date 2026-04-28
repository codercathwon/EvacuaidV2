import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Incident } from '@/types';

export function useIncidentChannel(
  municipalityId: string | null,
  onNew: (incident: Incident) => void,
  onUpdate: (incident: Incident) => void
) {
  useEffect(() => {
    if (!municipalityId) return;

    const supabase = createClient();
    
    // Web Audio API bell on new INSERT
    const playBell = () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.value = 880; // 880 Hz
        gain.gain.setValueAtTime(1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3); // 0.3 s duration
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } catch (err) {
        console.error('Failed to play bell:', err);
      }
    };

    const channel = supabase
      .channel(`incidents:${municipalityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'incidents',
          filter: `municipality_id=eq.${municipalityId}`,
        },
        (payload) => {
          playBell();
          onNew(payload.new as Incident);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'incidents',
          filter: `municipality_id=eq.${municipalityId}`,
        },
        (payload) => {
          onUpdate(payload.new as Incident);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [municipalityId, onNew, onUpdate]);
}
