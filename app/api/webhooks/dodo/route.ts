import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Ensure this route is treated as dynamic (important for webhooks)
//export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Check Environment Variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ CRITICAL: Missing Supabase Service Role Key or URL in environment variables.");
      return NextResponse.json({ error: "Server Configuration Error: Missing DB Keys" }, { status: 500 });
    }

    // 2. Parse Payload
    const event = await req.json();
    console.log(`Webhook Received: ${event.type}`);

    // 3. Initialize Admin Client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Handle 'payment.succeeded'
    if (event.type === "payment.succeeded") {
      const { metadata, payment_id } = event.data;
      const bookingId = metadata?.booking_id;

      // Handle missing booking_id (Common in dashboard 'Test' events)
      if (!bookingId) {
        console.warn("⚠️ Webhook Warning: No booking_id in metadata. If this was a manual test from Dodo Dashboard, this is expected.");
        // We return 200 OK so Dodo stops retrying this "bad" test event
        return NextResponse.json({ received: true, message: "Ignored: No booking_id" }); 
      }

      console.log(`Processing payment for Booking ID: ${bookingId}`);

      // 5. Update Database
      const { error } = await supabaseAdmin
        .from("bookings")
        .update({
          payment_status: "paid",
          status: "confirmed", 
          // payment_transaction_id: payment_id 
        })
        .eq("id", bookingId);

      if (error) {
        console.error("❌ Database Update Failed:", error.message);
        return NextResponse.json({ error: "Database update failed: " + error.message }, { status: 500 });
      }

      console.log(`✅ Booking ${bookingId} confirmed successfully.`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error("❌ Webhook Fatal Error:", error.message);
    return NextResponse.json({ error: "Webhook processing failed: " + error.message }, { status: 500 });
  }
}