"use client";

import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor, CapacitorHttp } from "@capacitor/core"; // Import CapacitorHttp
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, AlertCircle } from "lucide-react";

export function AppUpdater() {
  const [showModal, setShowModal] = useState(false);
  const [updateData, setUpdateData] = useState<any>(null);

  useEffect(() => {
    const checkVersion = async () => {
      // Check if running on native platform
      if (!Capacitor.isNativePlatform()) return;

      try {
        const appInfo = await App.getInfo();
        const currentVersion = appInfo.version; // e.g., "1.0.0"

        // Hardcoded live URL
        const LIVE_URL = "https://khelconnect.in/api/app-version";
        
        // --- BYPASS CORS: Use Native HTTP ---
        // This runs at the OS level, ignoring browser security rules
        const response = await CapacitorHttp.get({
          url: LIVE_URL,
        });
        
        if (response.status !== 200) {
            // alert(`Update Check Failed: Server Status ${response.status}`);
            console.error("Update check failed status:", response.status);
            return;
        }

        // CapacitorHttp automatically parses JSON into .data
        const latestData = response.data;

        // Debug Alert (Optional: You can remove this if it works)
        // alert(`Phone: ${currentVersion} | Server: ${latestData.version}`);

        if (latestData.version !== currentVersion) {
          setUpdateData(latestData);
          setShowModal(true);
        }
      } catch (error: any) {
        console.error("Update check failed:", error);
        // alert(`Update Error: ${error.message}`);
      }
    };

    checkVersion();
  }, []);

  const handleDownload = () => {
    if (updateData?.downloadUrl) {
      window.open(updateData.downloadUrl, "_system");
    }
  };

  const handleClose = () => {
    if (updateData?.forceUpdate) return; 
    setShowModal(false);
  };

  if (!updateData) return null;

  return (
    <Dialog 
      open={showModal} 
      onOpenChange={(isOpen) => {
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
            <p>A new version <strong>({updateData.version})</strong> is ready.</p>
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
            Download
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