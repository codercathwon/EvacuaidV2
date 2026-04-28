'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Incident } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Navigation, CheckCircle2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const incidentId = params.id as string;
  
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('incidents')
      .select('*')
      .eq('id', incidentId)
      .single()
      .then(({ data, error }) => {
        if (data) setIncident(data as Incident);
        setLoading(false);
      });
  }, [incidentId]);

  const handleAck = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/ack`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to acknowledge');
      toast.success('Incident Acknowledged');
      setIncident(prev => prev ? { ...prev, status: 'acknowledged' } : null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatch = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Actioned via console' })
      });
      if (!res.ok) throw new Error('Failed to dispatch');
      toast.success('Responders Dispatched');
      setIncident(prev => prev ? { ...prev, status: 'dispatched' } : null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>;
  if (!incident) return <div className="p-8 text-center text-red-400">Incident not found</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <Button 
        variant="ghost" 
        onClick={() => router.push('/console')}
        className="mb-6 text-slate-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Console
      </Button>

      <Card className="bg-slate-900 border-slate-800 text-slate-200">
        <CardHeader className="border-b border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center gap-3">
              SOS Incident
              <Badge variant={incident.status === 'pending' ? 'destructive' : 'secondary'} className="uppercase">
                {incident.status}
              </Badge>
            </CardTitle>
            <span className="text-sm text-slate-500 font-mono">{incidentId}</span>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950/50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-slate-500 mb-1">Time Reported</h3>
              <p className="text-lg">{formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}</p>
              <p className="text-xs text-slate-500 mt-1">{new Date(incident.created_at).toLocaleString()}</p>
            </div>
            
            <div className="bg-slate-950/50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-slate-500 mb-1">Location</h3>
              <p className="text-lg flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-400" />
                {incident.lat.toFixed(5)}, {incident.lng.toFixed(5)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Accuracy: ±{Math.round(incident.accuracy_m)} meters</p>
            </div>
          </div>

          <div className="flex gap-4 border-t border-slate-800 pt-6">
            {incident.status === 'pending' && (
              <Button 
                onClick={handleAck} 
                disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-700 w-full"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Acknowledge
              </Button>
            )}
            
            {(incident.status === 'pending' || incident.status === 'acknowledged') && (
              <Button 
                onClick={handleDispatch} 
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700 w-full"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Dispatch Responders
              </Button>
            )}

            {incident.status !== 'pending' && incident.status !== 'acknowledged' && (
              <div className="w-full text-center p-4 bg-slate-900 rounded border border-slate-800 text-slate-400">
                Action already taken. Current Status: {incident.status}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
