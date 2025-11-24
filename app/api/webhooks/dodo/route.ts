import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient"; // Server client

export async function POST(req: Request) {
  try {
    // 1. Verify Signature (Check Dodo docs for exact verification method)
    // const signature = req.headers.get("x-dodo-signature");
    // if (!isValid(signature)) return NextResponse.json({error: "Invalid"}, {status: 401});

    const event = await req.json();

    // 2. Check for successful payment event
    if (event.type === "payment.succeeded") {
      const bookingId = event.data.metadata.booking_id;
      const transactionId = event.data.payment_id;

      // 3. Update Supabase
      const { error } = await supabase
        .from("bookings")
        .update({
          payment_status: "paid",
          status: "confirmed", // Auto-confirm
          payment_transaction_id: transactionId
        })
        .eq("id", bookingId);
      
      if (error) console.error("DB Update Failed", error);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}