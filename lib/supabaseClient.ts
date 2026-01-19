// lib/supabaseClient.ts
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// This client automatically saves the session to cookies
// enabling the Middleware to read it.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)