import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Fetch all turfs
export const getTurfs = async () => {
  const { data, error } = await supabase.from('turfs').select('*').order('name', { ascending: true });
  if (error) throw error;
  return data;
};

// Add new turf
export const addTurf = async (newTurf: {
  name: string;
  location: string;
  image?: string;
  price: number;
  amenities: string[];
  distance: string;
  sports: string[];
}) => {
  const { data, error } = await supabase.from('turfs').insert([newTurf]);
  if (error) throw error;
  return data;
};

// Update turf by ID
export const updateTurf = async (id: string, updatedData: {
  name: string;
  location: string;
  image?: string;
  price: number;
  amenities: string[];
  distance: string;
  sports: string[];
}) => {
  const { data, error } = await supabase.from('turfs').update(updatedData).eq('id', id);
  if (error) throw error;
  return data;
};

// Delete turf by ID
export const deleteTurf = async (id: string) => {
  const { data, error } = await supabase.from('turfs').delete().eq('id', id);
  if (error) throw error;
  return data;
};
