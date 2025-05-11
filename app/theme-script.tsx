"use client"

import { useEffect } from "react"

export function ThemeScript() {
  useEffect(() => {
    const theme = localStorage.getItem("theme") || "dark"
    document.documentElement.classList.add(theme)
  }, [])

  return null
}
