'use client';

import { Suspense, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Incident } from '@/types';
import { CheckCircle2, Clock, MapPin, Navigation } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useParams } from 'next/navigation';

export default function StatusTimeline() {
  const params = useParams();
  const incidentId = params.incidentId as string;
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!incidentId) return;
    
    const supabase = createClient();
    
    // Fetch initial status
    supabase
      .from('incidents')
      .select('*')
      .eq('id', incidentId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setIncident(data as Incident);
        }
        setLoading(false);
      });

    // Subscribe to realtime updates for this specific incident
    const channel = supabase
      .channel(`incident:${incidentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'incidents',
          filter: `id=eq.${incidentId}`,
        },
        (payload) => {
          setIncident(payload.new as Incident);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [incidentId]);

  if (loading) {
    return <div className="text-center p-8">Loading status...</div>;
  }

  if (!incident) {
    return <div className="text-center p-8 text-red-500">Incident not found.</div>;
  }

  const steps = [
    { key: 'pending', label: 'SOS Sent', icon: Clock },
    { key: 'acknowledged', label: 'Operator Acknowledged', icon: CheckCircle2 },
    { key: 'dispatched', label: 'Responders Dispatched', icon: Navigation },
    { key: 'resolved', label: 'Resolved / Safe', icon: MapPin },
  ];

  const getStepIndex = (status: string) => {
    return steps.findIndex(s => s.key === status);
  };
  
  const currentIndex = getStepIndex(incident.status);

  return (
    <main className="min-h-[100dvh] flex flex-col p-4 bg-background">
      <div className="w-full max-w-md mx-auto pt-10">
        <h1 className="text-2xl font-bold mb-6 tracking-tight">SOS Status</h1>
        
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="relative pl-6 space-y-10 border-l-2 border-muted ml-3">
              {steps.map((step, idx) => {
                const isPast = idx < currentIndex;
                const isCurrent = idx === currentIndex;
                const Icon = step.icon;

                return (
                  <div key={step.key} className="relative flex items-center">
                    <div className={`
                      absolute -left-9 w-6 h-6 rounded-full flex items-center justify-center border-2 border-background
                      ${isPast || isCurrent ? 'bg-red-600' : 'bg-muted'}
                      ${isCurrent ? 'ring-4 ring-red-100' : ''}
                      transition-colors duration-300
                    `}>
                      <Icon className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${isPast || isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step.label}
                      </h3>
                      {isCurrent && (
                        <p className="text-sm text-red-600 font-medium mt-1">Current Status</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {incident.status === 'cancelled' && (
              <div className="mt-8 p-4 bg-gray-100 rounded-lg text-center text-gray-600 font-medium">
                This SOS request was cancelled.
              </div>
            )}
          </CardContent>
        </Card>
        
        <p className="text-xs text-muted-foreground mt-8 text-center">
          Incident ID: <span className="font-mono">{incident.id}</span>
        </p>
      </div>
    </main>
  );
}
