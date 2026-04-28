'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function AdminLayout({
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
        return;
      }
      supabase.from('profiles').select('role').eq('id', data.user.id).single().then(({ data: profile }) => {
        if (profile?.role !== 'admin') {
          router.push('/console');
        } else {
          setLoading(false);
        }
      });
    });
  }, [router]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <h1 className="font-bold text-lg">EvacuAid Administrator</h1>
      </header>
      <main className="p-6 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
