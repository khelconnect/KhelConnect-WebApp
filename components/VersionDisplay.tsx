"use client";

import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

export function VersionDisplay() {
  const [versionInfo, setVersionInfo] = useState("");

  useEffect(() => {
    const fetchVersion = async () => {
      if (Capacitor.isNativePlatform()) {
        // On Android/iOS: Get the real version from build.gradle
        const info = await App.getInfo();
        // Displays "v1.0.4 (5)" -> Version (Build Code)
        setVersionInfo(`v${info.version} (${info.build})`);
      } else {
        // On Browser
        setVersionInfo("Web Build");
      }
    };

    fetchVersion();
  }, []);

  if (!versionInfo) return null;

  return (
    <span className="block text-xs mt-2 text-muted-foreground/50 font-mono">
      {versionInfo}
    </span>
  );
}