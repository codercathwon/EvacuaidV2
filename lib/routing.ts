import { createClient } from '@/lib/supabase/server'

export async function resolveMunicipality(lat: number, lng: number) {
  const supabase = await createClient()
  
  const { data, error } = await supabase.rpc('find_municipality', {
    p_lat: lat,
    p_lng: lng,
  })

  // The find_municipality rpc handles the ST_Distance and ST_Contains PostGIS functions
  
  if (error || !data) {
    console.error('Routing error:', error)
    return null
  }

  return data?.[0] ?? null
}
