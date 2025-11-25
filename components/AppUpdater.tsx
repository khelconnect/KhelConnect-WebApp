"use client";

import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, AlertCircle } from "lucide-react";

export function AppUpdater() {
  const [showModal, setShowModal] = useState(false);
  const [updateData, setUpdateData] = useState<{
    version: string;
    downloadUrl: string;
    forceUpdate: boolean;
  } | null>(null);

  useEffect(() => {
    const checkVersion = async () => {
      // 1. Only run this check on actual phones (Android/iOS), not the website
      if (!Capacitor.isNativePlatform()) return;

      try {
        // 2. Get the app's current installed version
        const appInfo = await App.getInfo();
        const currentVersion = appInfo.version; // e.g., "1.0.0"

        // 3. Call your LIVE website API to get the latest version
        // IMPORTANT: Ensure NEXT_PUBLIC_BASE_URL is set to "https://khelconnect.in" in your mobile build
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://khelconnect.in";
        
        console.log(`Checking for updates. Current: ${currentVersion}. Checking API: ${baseUrl}/api/app-version`);

        const res = await fetch(`${baseUrl}/api/app-version`, {
          cache: 'no-store' // Never cache this request
        });
        
        if (!res.ok) throw new Error("Update check failed");

        const latestData = await res.json();

        // 4. Simple String Comparison
        // Note: For complex versioning (1.0.9 -> 1.0.10), use a library like 'semver-compare'
        // But for simple "1.0.0" != "1.0.1", exact inequality works fine.
        if (latestData.version !== currentVersion) {
          console.log(`Update found! New version: ${latestData.version}`);
          setUpdateData(latestData);
          setShowModal(true);
        }
      } catch (error) {
        console.error("Failed to check for updates:", error);
      }
    };

    checkVersion();
  }, []);

  const handleDownload = () => {
    if (updateData?.downloadUrl) {
      // Use _system to open the actual Chrome browser to handle the download
      window.open(updateData.downloadUrl, "_system");
    }
  };

  const handleClose = () => {
    // If forceUpdate is true, do NOT allow closing the modal
    if (updateData?.forceUpdate) {
      return; 
    }
    setShowModal(false);
  };

  if (!updateData) return null;

  return (
    <Dialog 
      open={showModal} 
      onOpenChange={(isOpen) => {
        // Prevent closing via clicking outside if forced
        if (!isOpen && !updateData.forceUpdate) {
          setShowModal(false);
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <AlertCircle className="h-5 w-5" />
            New Update Available
          </DialogTitle>
          <DialogDescription className="pt-2 space-y-2">
            <p>A new version <strong>({updateData.version})</strong> of KhelConnect is ready.</p>
            {updateData.forceUpdate && (
              <p className="text-amber-600 font-medium text-xs">
                * This is a critical update. You must install it to continue.
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button onClick={handleDownload} className="w-full gap-2">
            <Download className="h-4 w-4" />
            Download Update
          </Button>
          {!updateData.forceUpdate && (
            <Button variant="ghost" onClick={handleClose} className="w-full">
              Skip for now
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

