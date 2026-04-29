import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');

    if (code) {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        // Get user and check role for redirect
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Ensure profile row exists
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (!profile) {
            // Create default citizen profile on first login
            await supabase.from('profiles').insert({
              id: user.id,
              full_name: user.email?.split('@')[0] ?? 'User',
              role: 'citizen',
              municipality_id: null,
            });
          }

          const role = profile?.role ?? 'citizen';
          const dest = role === 'responder' || role === 'admin' ? '/console' : '/';
          return NextResponse.redirect(`${origin}${dest}`);
        }

        return NextResponse.redirect(`${origin}/console`);
      }
    }
  } catch {
    // fall through to error redirect
  }

  return NextResponse.redirect(`${new URL(request.url).origin}/login?error=auth_failed`);
}
