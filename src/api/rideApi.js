import { supabase } from '../supabaseClient';

// 🚗 Create a ride
export async function createRide(ride) {
  const { data, error } = await supabase
    .from('rides')
    .insert([ride])
    .single();

  if (error) throw error;
  return data;
}

// 📋 Get rides for a specific user (by rider_id)
export async function getRidesByUser(riderId) {
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .eq('rider_id', riderId) // ✅ correct field
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}