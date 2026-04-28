'use client';
import { useSosActivation } from '@/hooks/useSosActivation';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface SosButtonProps {
  onActivate: () => Promise<void>;
  disabled?: boolean;
}

export function SosButton({ onActivate, disabled }: SosButtonProps) {
  const { isHolding, progress, status, errorMessage, handlers, reset } = useSosActivation(onActivate, 3000);

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300">
        <div className="w-48 h-48 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-24 h-24 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-green-700">SOS Sent</h2>
        <p className="text-muted-foreground">Help is on the way. Stay calm.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300">
        <div className="w-48 h-48 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-24 h-24 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-red-700">SOS Failed</h2>
        <p className="text-red-500 font-medium">{errorMessage}</p>
        <button 
          onClick={reset}
          className="px-6 py-2 bg-red-600 text-white rounded-full font-bold hover:bg-red-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center w-64 h-64 touch-none">
      {/* Progress ring background */}
      <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 100 100">
        <circle 
          cx="50" cy="50" r="46" 
          className="stroke-muted fill-none stroke-[8px]" 
        />
        {/* Progress ring stroke */}
        <circle 
          cx="50" cy="50" r="46" 
          className="stroke-red-600 fill-none stroke-[8px] transition-all ease-linear"
          style={{
            strokeDasharray: 289.02, // 2 * PI * 46
            strokeDashoffset: 289.02 - (289.02 * progress) / 100,
            opacity: progress > 0 ? 1 : 0
          }}
        />
      </svg>
      
      <button
        {...handlers}
        disabled={disabled || status === 'loading'}
        className={`
          z-10 w-48 h-48 rounded-full shadow-2xl flex items-center justify-center flex-col select-none
          transition-transform duration-200
          ${disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 active:scale-95 cursor-pointer'}
          ${isHolding && !disabled ? 'scale-95 ring-8 ring-red-300/50' : ''}
        `}
        aria-label="Send Emergency SOS"
        role="button"
        aria-busy={status === 'loading'}
      >
        {status === 'loading' ? (
          <Loader2 className="w-16 h-16 text-white animate-spin" />
        ) : (
          <>
            <span className="text-4xl font-black text-white tracking-widest uppercase">SOS</span>
            <span className="text-red-100 font-medium text-sm mt-2 opacity-80 select-none">
              HOLD 3 SEC
            </span>
          </>
        )}
      </button>
    </div>
  );
}
