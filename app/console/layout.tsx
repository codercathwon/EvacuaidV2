'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        router.push('/login');
      } else {
        setLoading(false);
      }
    });
  }, [router]);

  if (loading) return null;

  return (
    <div className="min-h-screen md:h-screen w-full bg-zinc-950 text-zinc-100 font-sans p-4 md:p-6 overflow-hidden flex flex-col gap-4">
      <header className="flex items-center justify-between border-b border-zinc-800 pb-4 h-12 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-red-600 flex items-center justify-center font-bold text-white">E</div>
          <h1 className="font-semibold text-lg md:text-xl tracking-tight uppercase font-mono">EvacuAid <span className="text-red-500">v2</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-emerald-500 uppercase tracking-widest hidden sm:inline-block">Supabase Realtime: Online</span>
          </div>
          <div className="text-xs text-zinc-500 hidden sm:block">Operator: <span className="text-zinc-300 font-mono">Active</span></div>
        </div>
      </header>

      {children}

      <footer className="h-10 shrink-0 hidden md:flex items-center justify-between border-t border-zinc-800 pt-2.5">
        <div className="flex gap-4">
          <div className="flex items-center gap-2 border-zinc-800 pr-4">
             <span className="text-[10px] font-mono text-zinc-500">STACK: NEXTJS_14_SSR</span>
          </div>
        </div>
        <div className="flex gap-2">
           <div className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-300 font-mono">EvacuAid Systems</div>
        </div>
      </footer>
    </div>
  );
}
