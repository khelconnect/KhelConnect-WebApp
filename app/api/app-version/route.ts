import { NextResponse } from "next/server";

// --- FIX: Explicitly mark as static to satisfy 'output: export' ---
export const dynamic = 'force-static';
// ----------------------------------------------------------------

export async function GET() {
  // --- CONFIGURATION: UPDATE THIS MANUALLY FOR EVERY RELEASE ---
  
  // 1. The latest version code (Must match android/app/build.gradle > versionName)
  const LATEST_VERSION = "1.0.4"; 
  
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