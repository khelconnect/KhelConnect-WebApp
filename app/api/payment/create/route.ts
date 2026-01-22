import { NextResponse } from "next/server";
import DodoPayments from 'dodopayments';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, amount, customerName, customerEmail, returnUrl } = body;

    // --- 1. DYNAMIC BASE URL RESOLUTION ---
    // Try to get the domain from the request headers (Automatic & Accurate)
    const origin = req.headers.get('origin') || req.headers.get('referer');
    
    // Fallback priority: 
    // 1. Request Origin (Best for Web)
    // 2. Env Variable (Best for Mobile/Server-side)
    // 3. Localhost default (Last resort)
    const dynamicBaseUrl = origin 
      ? origin.replace(/\/$/, '') // Remove trailing slash
      : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');

    // ... (Keys & Config Logic) ...
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    const productId = process.env.DODO_PRODUCT_ID;
    const manualEnv = process.env.DODO_PAYMENTS_ENVIRONMENT; 

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

    // --- 2. DETERMINE FINAL RETURN URL ---
    // If frontend sent a specific returnUrl, use it.
    // If not, construct one using the dynamically detected Base URL.
    const finalReturnUrl = returnUrl 
        ? returnUrl 
        : `${dynamicBaseUrl}/profile?booking_id=${bookingId}`;

    console.log(`🚀 Creating Payment Redirecting to: ${finalReturnUrl}`);

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
      return_url: finalReturnUrl, 
    });

    return NextResponse.json({ paymentUrl: session.checkout_url }, { headers: corsHeaders });

  } catch (error: any) {
    console.error("❌ Dodo Payment Error:", error);
    return NextResponse.json({ 
      error: error.message || "Payment creation failed"
    }, { status: 500, headers: corsHeaders });
  }
}