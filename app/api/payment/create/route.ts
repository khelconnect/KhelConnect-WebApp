import { NextResponse } from "next/server";
import DodoPayments from 'dodopayments';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, amount, customerName, customerEmail } = body;

    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    const productId = process.env.DODO_PRODUCT_ID;

    // --- FIX: Define Base URL with Fallback ---
    // This ensures return_url is always valid, even if env var is missing
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
      ? process.env.NEXT_PUBLIC_BASE_URL 
      : 'https://www.khelconnect.in/';

    if (!apiKey || !productId) {
      console.error("Server Error: Missing API Key or Product ID");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // 1. Smart Environment Detection
    const isLiveKey = apiKey.trim().startsWith("live_");
    const environment = 'live_mode';

    console.log(`--- DODO PAYMENT INIT ---`);
    console.log(`Environment: ${environment}`);
    console.log(`Booking ID: ${bookingId}`);
    console.log(`Return URL: ${baseUrl}/payment/success?booking_id=${bookingId}`);
    console.log(`-------------------------`);

    // 2. Initialize SDK
    const client = new DodoPayments({
      bearerToken: apiKey.trim(),
      environment: environment,
    });

    // 3. Create Session
    const session = await client.checkoutSessions.create({
      product_cart: [
        {
          product_id: productId,
          quantity: 1,
          amount: amount * 100 // Amount in paise/cents
        }
      ],
      billing_address: {
        country: "IN",
        city: "Kolkata",
        state: "WB",
        zipcode: "700001",
        street: "Turf Booking"
      },
      customer: {
        name: customerName,
        email: customerEmail,
      },
      metadata: {
        booking_id: bookingId,
      },
      // Use the safe baseUrl variable here
      return_url: `${baseUrl}/payment/success?booking_id=${bookingId}`,
    });

    console.log("✅ Session Created:", session.session_id);

    return NextResponse.json({ paymentUrl: session.checkout_url });

  } catch (error: any) {
    console.error("❌ Dodo Payment Error:", error);
    
    // SAFE ERROR RESPONSE: Do not send the full 'error' object
    return NextResponse.json({ 
      error: error.message || "Payment creation failed" 
    }, { status: 500 });
  }
}