'use client';

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [supabase] = useState(() => createClient())
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN') {
          router.push('/console')
          router.refresh()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth, router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm p-8 bg-card rounded-2xl shadow-sm border border-border">
        <h1 className="text-2xl font-bold mb-2">EvacuAid Login</h1>
        <p className="text-muted-foreground text-sm mb-6">Responder & Admin Access</p>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google']}
          magicLink={true}
          redirectTo={`${process.env.NEXT_PUBLIC_APP_URL || ''}/callback`}
        />
      </div>
    </div>
  )
}
