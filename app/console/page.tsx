'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useIncidentChannel } from '@/hooks/useIncidentChannel';
import { IncidentQueue } from '@/components/console/IncidentQueue';
import { ConsoleMap } from '@/components/console/ConsoleMap';
import { Incident } from '@/types';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function ConsolePage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [municipalityId, setMunicipalityId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadInitialData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, municipality_id')
        .eq('id', user.id)
        .single();
      
      if (!profile) return;
      const mId = profile.municipality_id;
      setMunicipalityId(mId);

      // Load existing active incidents
      let query = supabase
        .from('incidents')
        .select('*')
        .in('status', ['pending', 'acknowledged', 'dispatched'])
        .order('created_at', { ascending: false });

      if (profile.role !== 'admin' && mId) {
        query = query.eq('municipality_id', mId);
      }

      const { data } = await query;
      if (data) setIncidents(data as Incident[]);
    }

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useIncidentChannel(
    municipalityId,
    (newIncident) => {
      setIncidents((prev) => [newIncident, ...prev]);
      toast.error('NEW EMERGENCY SOS RECEIVED', {
        description: `Coordinates: ${newIncident.lat.toFixed(4)}, ${newIncident.lng.toFixed(4)}`,
        duration: Infinity
      });
    },
    (updatedIncident) => {
      setIncidents((prev) =>
        prev.map((i) => (i.id === updatedIncident.id ? updatedIncident : i))
      );
    }
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 grid-rows-none md:grid-rows-6 gap-4 flex-1 min-h-0">
      
      {/* Map View (Large Bento) */}
      <div className="col-span-1 md:col-span-8 row-span-1 md:row-span-4 bg-zinc-900 border border-zinc-800 rounded-xl relative overflow-hidden flex flex-col min-h-[400px]">
        <ConsoleMap
          incidents={incidents}
          activeIncidentId={activeId}
          onMarkerClick={(id) => {
            setActiveId(id);
            router.push(`/console/incident/${id}`);
          }}
        />
      </div>

      {/* Active SOS Queue (Tall Bento) */}
      <div className="col-span-1 md:col-span-4 row-span-1 md:row-span-6 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col overflow-hidden max-h-[500px] md:max-h-none">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center shrink-0">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">SOS Live Feed</h2>
          <span className="bg-red-500 text-[10px] px-2 py-0.5 rounded-full text-white font-bold">
            {incidents.filter(i => i.status === 'pending').length} Active
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <IncidentQueue 
            incidents={incidents} 
            activeId={activeId} 
            onSelect={(id) => {
              setActiveId(id);
              router.push(`/console/incident/${id}`);
            }} 
          />
        </div>
      </div>

      {/* Performance Metric (Square Bento) */}
      <div className="hidden md:flex col-span-4 row-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex-col justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Response Target</h2>
        <div className="flex items-end gap-3">
          <div className="text-4xl font-mono font-bold text-emerald-400 tracking-tighter">3.2s</div>
          <div className="text-[10px] mb-2 text-zinc-500 leading-tight">
              MEDIAN TIME-TO-ACK<br/>
              <span className="text-emerald-500">TARGET: &lt;3.6s</span>
          </div>
        </div>
        <div className="w-full bg-zinc-800 h-1 rounded-full mt-4">
          <div className="bg-emerald-500 h-1 rounded-full w-[88%]"></div>
        </div>
      </div>

      {/* System Logs / Console (Wide Bento) */}
      <div className="hidden md:flex col-span-4 row-span-2 bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono flex-col">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] text-zinc-500 uppercase font-sans font-bold tracking-widest">Realtime Engine Logs</span>
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
            <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
          </div>
        </div>
        <div className="text-[10px] space-y-1 overflow-hidden">
          <div className="text-zinc-500">[System] <span className="text-blue-400">info</span>: supabase.realtime.connect()</div>
          <div className="text-zinc-500">[DB] <span className="text-emerald-400">ok</span>: incidents tracking active</div>
          {incidents.filter(i => i.status === 'pending').map(inc => (
            <div key={`log-${inc.id}`} className="text-zinc-300">[Alert] <span className="text-red-500">sos</span>: incoming payload payload_jwt</div>
          ))}
          <div className="text-zinc-600 animate-pulse">_</div>
        </div>
      </div>

    </div>
  );
}
