import { NextResponse } from "next/server";

// Force static generation for the build, but prevent caching via headers
export const dynamic = 'force-static';

// --- CONFIGURATION ---
const LATEST_VERSION = "1.0.1"; // Update this manually for new releases
const DOWNLOAD_URL = "https://github.com/khelconnect/KhelConnect-WebApp/releases/download/v1.0.3/khelconnect.apk"; 
const FORCE_UPDATE = true; 
// ---------------------

// Define CORS headers to allow the mobile app to access this API
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow any origin (including the app)
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control',
};

export async function GET() {
  return NextResponse.json({
    version: LATEST_VERSION,
    downloadUrl: DOWNLOAD_URL,
    forceUpdate: FORCE_UPDATE,
  }, {
    headers: {
      ...corsHeaders,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

// Handle the "Preflight" OPTIONS request
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}