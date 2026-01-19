"use client"

import { UniversalLoader } from "@/components/ui/universal-loader"

export default function TestLoaderPage() {
  // We simply return the loader component directly.
  // No logic, no conditions—just the animation running forever.
  return <UniversalLoader />
}