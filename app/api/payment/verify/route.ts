import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { bookingId } = await req.json();

    console.log(`🔍 [VERIFY API] Started for Booking ID: ${bookingId}`);

    if (!bookingId) {
      console.error("❌ [VERIFY API] Missing Booking ID");
      return NextResponse.json({ error: "Missing Booking ID" }, { status: 400 });
    }

    // 1. Configuration Check (Using your CURRENT env variable name)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    // WARNING: Currently using NEXT_PUBLIC_SERVICE_ROLE_KEY based on your setup.
    // Ideally, this should be renamed to SUPABASE_SERVICE_ROLE_KEY later for security.
    const supabaseServiceKey = process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ [VERIFY API] CRITICAL: Missing Config. URL or Key is undefined.");
      return NextResponse.json({ error: "Server Configuration Error: Missing Keys" }, { status: 500 });
    }

    // 2. Init Admin Client (Bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Fetch the Booking
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("id, status, payment_status")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      console.error("❌ [VERIFY API] Booking Not Found:", fetchError?.message);
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    console.log(`ℹ️ [VERIFY API] Current Status: ${booking.status}, Payment: ${booking.payment_status}`);

    // 4. Update Status to Confirmed
    if (booking.status !== 'confirmed' || booking.payment_status !== 'paid') {
        console.log(`⚡ [VERIFY API] Updating booking to CONFIRMED/PAID...`);
        
        const { error: updateError } = await supabaseAdmin
            .from("bookings")
            .update({ 
                status: 'confirmed', 
                payment_status: 'paid' 
            })
            .eq("id", bookingId);

        if (updateError) {
            console.error("❌ [VERIFY API] Update Failed:", updateError.message);
            throw updateError;
        }
        console.log(`✅ [VERIFY API] Update Successful`);
    } else {
        console.log(`✅ [VERIFY API] Booking already confirmed. No update needed.`);
    }

    return NextResponse.json({ success: true, message: "Booking Verified" });

  } catch (error: any) {
    console.error("❌ [VERIFY API] Server Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}