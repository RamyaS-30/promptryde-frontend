import { supabase } from "../supabaseClient";

// 🔁 Upsert (insert or update) user profile
export async function upsertUserProfile({ clerkId, name, phoneNumber, profileImage }) {
  const { data, error } = await supabase
    .from('users')
    .upsert({
      clerk_id: clerkId,
      name,
      phone_number: phoneNumber,
      profile_image: profileImage,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'clerk_id'
    });

  if (error) throw error;
  return data;
}

// 👤 Get internal user UUID by Clerk ID
export async function getUserByClerkId(clerkId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', clerkId)
    .single();

  if (error) throw error;
  return data;
}

// ✅ Update user role by Clerk ID
export async function upsertUserRole(clerkId, role) {
  const { error } = await supabase
    .from('users')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('clerk_id', clerkId);

  if (error) {
    console.error("Error updating user role:", error);
    throw error;
  }
}