import { NextResponse } from "next/server";
import DodoPayments from 'dodopayments';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, amount, customerName, customerEmail } = body;

    // Retrieve environment variables
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    const productId = process.env.DODO_PRODUCT_ID;
    const manualEnv = process.env.DODO_PAYMENTS_ENVIRONMENT; 

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
      ? process.env.NEXT_PUBLIC_BASE_URL 
      : 'https://www.khelconnect.in/';

    // --- CRITICAL CHECK ---
    if (!apiKey || !productId) {
      console.error("❌ CRITICAL: API Key or Product ID is missing in Production variables.");
      return NextResponse.json({ error: "Server configuration error: Missing Keys" }, { status: 500 });
    }

    // 1. Determine Environment
    const environment = 'test_mode';

    console.log(`--- DODO PAYMENT INIT ---`);
    console.log(`Env: ${environment}`);
    console.log(`Base URL: ${baseUrl}`);

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
          amount: amount * 100 
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
      return_url: `${baseUrl}/payment/success?booking_id=${bookingId}`,
    });

    console.log("✅ Session Created:", session.session_id);

    return NextResponse.json({ paymentUrl: session.checkout_url });

  } catch (error: any) {
    console.error("❌ Dodo Payment Error:", error);
    
    // FIX: Only send the message string, NEVER the full error object
    // The full object often causes JSON serialization crashes
    return NextResponse.json({ 
      error: error.message || "Payment creation failed"
    }, { status: 500 });
  }
}