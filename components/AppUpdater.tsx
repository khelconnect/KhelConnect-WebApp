"use client";

import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, AlertCircle } from "lucide-react";

export function AppUpdater() {
  const [showModal, setShowModal] = useState(false);
  const [updateData, setUpdateData] = useState<any>(null);

  useEffect(() => {
    const checkVersion = async () => {
      // DEBUG: Confirm the code is running
      // alert("Updater Started"); 

      if (!Capacitor.isNativePlatform()) return;

      try {
        const appInfo = await App.getInfo();
        const currentVersion = appInfo.version;

        // Ensure this URL is correct!
        const LIVE_URL = "https://khelconnect.in/api/app-version";
        
        // DEBUG: Alert before fetch
        // alert(`Fetching: ${LIVE_URL}`);

        const res = await fetch(LIVE_URL, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (!res.ok) {
            alert(`Update Check Failed: Server Status ${res.status}`);
            return;
        }

        const latestData = await res.json();

        // DEBUG: Compare versions visually
        // alert(`Phone: ${currentVersion} vs Server: ${latestData.version}`);

        if (latestData.version !== currentVersion) {
          setUpdateData(latestData);
          setShowModal(true);
        }
      } catch (error: any) {
        // This will catch Network errors (like CORS)
        alert(`Update Error: ${error.message}`);
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
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button onClick={handleDownload} className="w-full gap-2">
            <Download className="h-4 w-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}