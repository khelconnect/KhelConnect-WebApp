"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useUserStore } from "@/lib/userStore";

export default function AuthListener() {
  const router = useRouter();
  const { clearUser } = useUserStore();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // 1. Standard Sign Out
      if (event === "SIGNED_OUT") {
        clearUser();
        router.push("/login");
        router.refresh();
      } 
      
      // 2. FIXED: Cast event to string to avoid TypeScript error
      // The event "TOKEN_REFRESH_REVOKED" exists at runtime but might be missing from the types
      if (!session && (event as string) === 'TOKEN_REFRESH_REVOKED') {
          console.warn("Refresh token invalid. Forcing logout.");
          await supabase.auth.signOut();
          clearUser();
          router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [clearUser, router]);

  return null;
}