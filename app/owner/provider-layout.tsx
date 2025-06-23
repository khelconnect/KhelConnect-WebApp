"use client"

import type React from "react"

import { OwnerAuthProvider } from "@/components/owner-auth-provider"

export default function OwnerProviderLayout({ children }: { children: React.ReactNode }) {
  return <OwnerAuthProvider>{children}</OwnerAuthProvider>
}
