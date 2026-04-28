'use client';

import { Incident } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface IncidentCardProps {
  incident: Incident;
  isActive: boolean;
  onClick: () => void;
}

export function IncidentCard({ incident, isActive, onClick }: IncidentCardProps) {
  const isPending = incident.status === 'pending';
  
  return (
    <div 
      onClick={onClick}
      className={`p-3 cursor-pointer transition-colors rounded-lg flex flex-col gap-1
        ${isPending ? 'bg-red-500/10 border border-red-500/30' : 'bg-zinc-800/50 border border-zinc-700'}
        ${isActive && isPending ? 'ring-2 ring-red-500' : ''}
        ${isActive && !isPending ? 'ring-2 ring-zinc-500' : ''}
        hover:bg-zinc-800/80
      `}
    >
      <div className="flex justify-between mb-1">
        <span className={`text-[10px] font-bold uppercase flex items-center gap-1 ${isPending ? 'text-red-500' : 'text-zinc-500'}`}>
          {isPending && <span className="flex w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
          {incident.status}
        </span>
        <span className="text-[10px] text-zinc-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(new Date(incident.created_at))} ago
        </span>
      </div>
      <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
        <MapPin className="w-3.5 h-3.5 text-zinc-400" />
        Acc: {(incident.accuracy_m || 0).toFixed(0)}m
      </div>
      <div className="text-xs text-zinc-400 mt-1 truncate flex gap-2">
        <span>ID: {incident.id.split('-')[0]}</span>
        {incident.border_proximity && (
          <span className="text-amber-500 bg-amber-950/20 px-1 rounded">Border</span>
        )}
      </div>
    </div>
  );
}
