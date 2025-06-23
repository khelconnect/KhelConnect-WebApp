import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Turf Owner Portal - Khelconnect",
  description: "Manage your turf bookings and availability",
}

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">{children}</div>
    </div>
  )
}
