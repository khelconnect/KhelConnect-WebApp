// app/api/send-wsp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { phone, name, turfName, date, time, amount, qrImageUrl } = body;

  try {
    const response = await axios.post(
      'https://api.gupshup.io/sm/api/v1/template/msg',
      new URLSearchParams({
        channel: 'whatsapp',
        source: '<YOUR_WHATSAPP_NUMBER>', // as configured in Gupshup
        destination: `91${phone}`, // Add country code
        'src.name': '<YOUR_GUPSHUP_APP_NAME>',
        template: 'pending_booking_qr',
        'template.params': JSON.stringify([name, turfName, date, time, amount]),
        'media.url': qrImageUrl,
        'media.type': 'image'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'apikey': '<YOUR_GUPSHUP_API_KEY>'
        }
      }
    );

    return NextResponse.json({ success: true, data: response.data });
  } catch (error: any) {
    console.error(error.response?.data || error.message);
    return NextResponse.json({ success: false, error: error.message });
  }
}
