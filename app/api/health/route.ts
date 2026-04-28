import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    // Test connection
    const { error } = await supabase.from('municipalities').select('id').limit(1);
    
    return NextResponse.json({
      status: 'ok',
      db: error ? 'error' : 'connected',
      error: error?.message
    });
  } catch (err: any) {
    return NextResponse.json({ status: 'error', message: err.message }, { status: 500 });
  }
}
