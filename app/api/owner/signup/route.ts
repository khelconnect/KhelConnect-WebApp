import { NextResponse } from "next/server"
// Make sure this path to your server client is correct
import { supabase } from "@/lib/supabaseClient"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    const { email, password, name, turfName, location, phone } = await request.json()

    if (!email || !password || !name || !turfName || !location || !phone) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // 1. Hash the password on the server
    const hashedPassword = await bcrypt.hash(password, 10)

    // 2. Initialize the server-side Supabase client
    // const supabase = createClient()

    // 3. Insert the new owner
    const { error: insertError } = await supabase.from("turf_owners").insert({
      name,
      email,
      password_hash: hashedPassword,
      turf_name: turfName,
      location,
      phone,
    })

    if (insertError) {
      if (insertError.message.includes("duplicate key")) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 })
      }
      console.error("Supabase insert error:", insertError.message) 
      throw new Error(insertError.message)
    }

    // 4. Send success response
    return NextResponse.json({ message: "Account created successfully" }, { status: 201 })

  } catch (err: any) {
    console.error("Signup API Error:", err)
    return NextResponse.json({ error: "Signup failed. Please try again." }, { status: 500 })
  }
}