import { NextResponse } from "next/server"
// Make sure you have a *server-side* Supabase client
// You might create this using createServerClient from '@supabase/ssr'
// or by new SupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
import { supabase } from "@/lib/supabaseClient" // Adjust this import
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Initialize the server-side Supabase client
    

    // 1. Fetch owner from the database
    const { data, error: fetchError } = await supabase
      .from("turf_owners")
      .select("id, password_hash")
      .eq("email", email)
      .single()

    if (fetchError || !data) {
      // Use a generic error message for security
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // 2. Compare password hash securely on the server
    const isMatch = await bcrypt.compare(password, data.password_hash)

    if (!isMatch) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // 3. On success, return only the non-sensitive data
    return NextResponse.json({ id: data.id, message: "Login successful" }, { status: 200 })

  } catch (err) {
    console.error("Login API Error:", err)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}