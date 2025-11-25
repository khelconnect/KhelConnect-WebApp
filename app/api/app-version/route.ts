import { NextResponse } from "next/server";

// --- FIX: Conditional Export ---
// If building for mobile, force static (to satisfy 'output: export').
// If building for web, force dynamic (to prevent caching).
export const dynamic = process.env.BUILD_TARGET === 'mobile' ? 'force-static' : 'force-dynamic';
// -------------------------------

export async function GET() {
  // --- CONFIGURATION: UPDATE THIS MANUALLY FOR EVERY RELEASE ---
  
  // 1. The latest version code (Must match android/app/build.gradle > versionName)
  const LATEST_VERSION = "1.0.2"; 
  
  // 2. The direct link to download the APK
  // You will upload the new APK to your 'public' folder or a cloud link (Drive/S3)
  const DOWNLOAD_URL = "https://khelconnect.in/download/khelconnect.apk"; 
  
  // 3. Force Update? (true = User cannot close the popup without updating)
  const FORCE_UPDATE = true; 
  
  // -------------------------------------------------------------

  return NextResponse.json({
    version: LATEST_VERSION,
    downloadUrl: DOWNLOAD_URL,
    forceUpdate: FORCE_UPDATE,
  });
}