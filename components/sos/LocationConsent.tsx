'use client';
import { AlertCircle, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationConsentProps {
  onGrant: () => void;
  loading?: boolean;
}

export function LocationConsent({ onGrant, loading }: LocationConsentProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-secondary/30 rounded-2xl max-w-sm mx-auto text-center border border-border">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
        <MapPin className="w-8 h-8 text-blue-600" />
      </div>
      <h3 className="text-xl font-bold mb-2">Location Required</h3>
      <p className="text-muted-foreground mb-6 text-sm">
        EvacuAid needs your location to send emergency responders to your exact position. Your location is sent securely and only when you activate an SOS.
      </p>
      <Button 
        size="lg" 
        className="w-full font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-full py-6 text-lg"
        onClick={onGrant}
        disabled={loading}
      >
        {loading ? 'Requesting...' : 'Allow Location Access'}
      </Button>
      <p className="flex items-center text-xs text-muted-foreground mt-4 gap-2">
        <AlertCircle className="w-4 h-4" /> Please click &quot;Allow&quot; when prompted
      </p>
    </div>
  );
}
