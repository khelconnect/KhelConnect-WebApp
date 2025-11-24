import { NextResponse } from "next/server";
import DodoPayments from 'dodopayments';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, amount, customerName, customerEmail } = body;

    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    const productId = process.env.DODO_PRODUCT_ID;
    
    // 1. Define Base URL with Fallback
    // If the env var is missing, default to localhost
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // --- DEBUG LOGS ---
    console.log("--- DODO DEBUG ---");
    console.log("API Key Present:", !!apiKey);
    console.log("Base URL:", baseUrl); // Check this in your terminal
    console.log("Return URL:", `${baseUrl}/payment/success?booking_id=${bookingId}`);
    // ---------------------

    if (!apiKey || !productId) {
      return NextResponse.json({ error: "Missing API Key or Product ID" }, { status: 500 });
    }

    // 2. Initialize SDK with EXPLICIT Environment
    const client = new DodoPayments({
      bearerToken: apiKey.trim(),
      environment: 'live_mode', 
    });

    console.log(`Creating Dodo Session...`);

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
    return NextResponse.json({ 
      error: error.message || "Payment creation failed",
      details: error 
    }, { status: 500 });
  }
}