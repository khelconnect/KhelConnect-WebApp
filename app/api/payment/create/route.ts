import { NextResponse } from "next/server";
import DodoPayments from 'dodopayments';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow mobile app and localhost
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle Preflight Request (Browser security check)
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. EXTRACT returnUrl FROM BODY
    const { bookingId, amount, customerName, customerEmail, returnUrl } = body;

    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    const productId = process.env.DODO_PRODUCT_ID;
    const manualEnv = process.env.DODO_PAYMENTS_ENVIRONMENT; 

    // Safe Base URL logic (Fallback only)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
      ? process.env.NEXT_PUBLIC_BASE_URL 
      : 'http://localhost:3000';

    if (!apiKey || !productId) {
      return NextResponse.json({ error: "Server configuration error: Missing Keys" }, { status: 500, headers: corsHeaders });
    }

    let environment = 'test_mode'; 
    if (manualEnv === 'live_mode' || manualEnv === 'test_mode') {
      environment = manualEnv;
    } else if (apiKey.trim().startsWith("live_")) {
      environment = 'live_mode';
    }

    const client = new DodoPayments({
      bearerToken: apiKey.trim(), 
      environment: environment, 
    });

    // 2. USE THE DYNAMIC RETURN URL
    // If frontend sends specific URL (like /profile), use it. Otherwise fallback to default.
    const finalReturnUrl = returnUrl 
        ? returnUrl 
        : `${baseUrl}/profile?booking_id=${bookingId}`;

    const session = await client.checkoutSessions.create({
      product_cart: [
        {
          product_id: productId,
          quantity: 1,
          amount: amount * 100 // Dodo expects smallest currency unit (e.g. paise)
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
      return_url: finalReturnUrl, // <--- UPDATED THIS LINE
    });

    // Return response with CORS headers
    return NextResponse.json({ paymentUrl: session.checkout_url }, { headers: corsHeaders });

  } catch (error: any) {
    console.error("❌ Dodo Payment Error:", error);
    return NextResponse.json({ 
      error: error.message || "Payment creation failed"
    }, { status: 500, headers: corsHeaders });
  }
}