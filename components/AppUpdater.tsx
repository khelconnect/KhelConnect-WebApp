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
      // 1. Only run on native mobile apps (Android/iOS)
      // This prevents the popup from showing on your website
      if (!Capacitor.isNativePlatform()) return;

      try {
        // 2. Get current installed version from the phone
        const appInfo = await App.getInfo();
        const currentVersion = appInfo.version; // e.g., "1.0.0"

        // 3. Call your LIVE website API to get the latest version
        // We use the full URL because the app file system is local
        const LIVE_DOMAIN = "https://khelconnect.in"; 
        
        console.log(`Checking updates. App: ${currentVersion}`);
        
        const res = await fetch(`${LIVE_DOMAIN}/api/app-version`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        });

        if (!res.ok) throw new Error("Update check failed");

        const latestData = await res.json();

        // 4. Compare versions
        // If they don't match, show the update popup
        if (latestData.version !== currentVersion) {
          console.log(`Update available: ${latestData.version}`);
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
      // Open in system browser (Chrome) to handle the download
      window.open(updateData.downloadUrl, "_system");
    }
  };

  const handleClose = () => {
    // If forceUpdate is true, do NOT allow closing the modal
    if (updateData?.forceUpdate) return; 
    setShowModal(false);
  };

  if (!updateData) return null;

  return (
    <Dialog 
      open={showModal} 
      onOpenChange={(isOpen) => {
        // Prevent closing via clicking outside if forced
        if (!isOpen && !updateData.forceUpdate) setShowModal(false);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <AlertCircle className="h-5 w-5" />
            Update Available
          </DialogTitle>
          <DialogDescription className="pt-2 space-y-2">
            <p>A new version <strong>({updateData.version})</strong> of KhelConnect is ready.</p>
            {updateData.forceUpdate && (
              <p className="text-amber-600 font-medium text-xs">
                * This update is required to continue using the app.
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