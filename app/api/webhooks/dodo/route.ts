import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic'; // Ensure dynamic execution

export async function POST(req: Request) {
  try {
    // 1. Configuration Check
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ CRITICAL: Missing Supabase Config.");
      return NextResponse.json({ error: "Server Config Error" }, { status: 500 });
    }

    // 2. Initialize Admin Client (Bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Parse Event
    const event = await req.json();
    const { type, data } = event;
    const bookingId = data?.metadata?.booking_id;

    console.log(`🔔 Webhook received: ${type} | Booking ID: ${bookingId || 'N/A'}`);

    // If there is no booking ID (e.g., a test event without metadata), ignore safely
    if (!bookingId) {
      return NextResponse.json({ received: true, message: "Ignored: No booking_id found" });
    }

    // 4. Handle Status Cases
    let updateData = {};

    switch (type) {
      case "payment.succeeded":
        console.log(`✅ Payment Succeeded for ${bookingId}`);
        updateData = {
          payment_status: "paid",
          status: "confirmed", // Confirms the slot
          // transaction_id: data.payment_id // Optional: Save gateway ID if you have a column for it
        };
        break;

      case "payment.processing":
        console.log(`⏳ Payment Processing for ${bookingId}`);
        updateData = {
          payment_status: "processing"
          // We keep status as 'pending' so the slot isn't confirmed yet, but isn't free either
        };
        break;

      case "payment.failed":
        console.log(`❌ Payment Failed for ${bookingId}`);
        updateData = {
          payment_status: "failed",
          // CRITICAL: We keep status 'pending' (not 'cancelled') to allow Retry from Profile Page
          // The 5-minute timer on the frontend/cron will handle cancellation if they don't retry.
          status: "pending" 
        };
        break;

      case "refund.succeeded":
        console.log(`💸 Refund Succeeded for ${bookingId}`);
        updateData = {
          payment_status: "refunded",
          status: "cancelled", // Free up the slot immediately
          refund_amount: data.amount // Assuming data.amount contains the refunded value
        };
        break;

      case "dispute.opened":
        console.warn(`⚠️ Dispute Opened for ${bookingId}`);
        updateData = {
          payment_status: "dispute_open"
          // You might want to keep the slot confirmed until the dispute is resolved
        };
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${type}`);
        return NextResponse.json({ received: true, message: "Unhandled event type" });
    }

    // 5. Execute Database Update
    const { error } = await supabaseAdmin
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId);

    if (error) {
      console.error("❌ DB Update Error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error("❌ Webhook Fatal Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}