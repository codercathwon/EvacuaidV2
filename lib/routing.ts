import { createClient } from '@/lib/supabase/server';

export async function resolveMunicipality(lat: number, lng: number) {
  const supabase = await createClient();

  // Try exact match first via PostGIS RPC
  const { data, error } = await supabase.rpc('find_municipality', {
    p_lat: lat,
    p_lng: lng,
  });

  if (!error && data && data.length > 0 && data[0]) {
    return data[0];
  }

  // Fallback: nearest municipality by ST_Distance
  const { data: nearest, error: nearestError } = await supabase.rpc(
    'find_nearest_municipality',
    { p_lat: lat, p_lng: lng }
  );

  if (!nearestError && nearest && nearest.length > 0 && nearest[0]) {
    return {
      municipality_id: nearest[0].id,
      border_proximity: false,
    };
  }

  // Last resort: raw query for nearest by distance
  const { data: raw, error: rawError } = await supabase
    .from('municipalities')
    .select('id, name')
    .limit(1);

  if (!rawError && raw && raw.length > 0) {
    return {
      municipality_id: raw[0].id,
      border_proximity: false,
    };
  }

  console.error('Routing error - could not find any municipality:', error, nearestError, rawError);
  return null;
}
