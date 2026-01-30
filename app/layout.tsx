import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Link from "next/link"
import { Home, Calendar, User, Menu, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { ThemeScript } from "./theme-script"
import localFont from "next/font/local"
import { MainNavbar } from "@/components/main-navbar"
import { Facebook, Twitter, Instagram } from "lucide-react"
import { AppUpdater } from "@/components/AppUpdater" // 1. Import the updater
import { VersionDisplay } from "@/components/VersionDisplay";
import Script from "next/script"

const qualyNeue = localFont({
  src: [
    {
      path: '../public/fonts/qualy-neue-light.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../public/fonts/qualy-neue-bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-qualyneue', // optional, for CSS variables
  display: 'swap',
});

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "Khelconnect | Book Sports Turfs in Kolkata",
    template: "%s | Khelconnect",
  },
  description:
    "Khelconnect helps you book football, cricket, and pickleball turfs in Kolkata with flexible 30-minute slots. Discover, compare, and book sports venues instantly.",

  keywords: [
    "sports turf booking Kolkata",
    "football turf Kolkata",
    "cricket turf Kolkata",
    "pickleball court Kolkata",
    "book turf online Kolkata",
    "Khelconnect",
  ],

  metadataBase: new URL("https://khelconnect.in"), // change if different
  alternates: {
    canonical: "https://khelconnect.in",
  },

  openGraph: {
    title: "Khelconnect | Book Sports Turfs in Kolkata",
    description:
      "Book football, cricket, and pickleball turfs in Kolkata with flexible time slots. Easy discovery, instant booking.",
    url: "https://khelconnect.in",
    siteName: "Khelconnect",
    images: [
      {
        url: "/og.png", // create this (1200x630)
        width: 1200,
        height: 630,
        alt: "Khelconnect – Sports Turf Booking Platform",
      },
    ],
    locale: "en_IN",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Khelconnect | Book Sports Turfs in Kolkata",
    description:
      "Find and book football, cricket, and pickleball turfs in Kolkata instantly.",
    images: ["/og.png"],
  },

  other: {
  "brave-search-indexing": "true",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  category: "Sports Booking",
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={qualyNeue.variable}>
    <head>
      {/* Structured Data for SEO (VIMP for Google) */}
      <Script
        id="structured-data"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsActivityLocation",
            "name": "Khelconnect",
            "url": "https://khelconnect.in",
            "description":
              "Online platform to book football, cricket, and pickleball turfs in Kolkata.",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Kolkata",
              "addressRegion": "WB",
              "addressCountry": "IN",
            },
            "sameAs": [
              "https://www.facebook.com/khelconnectkolkata/",
              "https://www.instagram.com/khelconnect_in/",
              "https://x.com/khelconnect_in",
            ],
          }),
        }}
      />

    </head>
      <body className={`${inter.className} bg-background`}>
        <ThemeScript />
        <ThemeProvider defaultTheme="dark">
          {/* 2. Add AppUpdater here so it runs globally */}
          <AppUpdater />
          
          <MainNavbar />
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
            <footer className="mt-auto border-t border-border py-10 bg-background">
              <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                  <div>
                    <h3 className="font-bold mb-5 text-lg">Khelconnect</h3>
                    <p className="text-muted-foreground">
                      Book your favorite sports turf in Kolkata for football, cricket, or pickleball in 30-minute slots.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold mb-5 text-lg">Quick Links</h3>
                    <ul className="space-y-3">
                      <li>
                        <Link href="/" className="text-muted-foreground hover:text-primary">
                          Home
                        </Link>
                      </li>
                      <li>
                        <Link href="/turfs?sport=football" className="text-muted-foreground hover:text-primary">
                          Football
                        </Link>
                      </li>
                      <li>
                        <Link href="/turfs?sport=cricket" className="text-muted-foreground hover:text-primary">
                          Cricket
                        </Link>
                      </li>
                      <li>
                        <Link href="/turfs?sport=pickleball" className="text-muted-foreground hover:text-primary">
                          Pickleball
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold mb-5 text-lg">Contact</h3>
                    <address className="not-italic text-muted-foreground">
                      <p className="mt-3">Email: khelconnectindia@gmail.com</p>
                      <p>Phone: +91 8777527449</p>
                      <br />
                      <p>Kolkata, West Bengal, India</p>
                    </address>
                  </div>
                  <div>
                    <h3 className="font-bold mb-5 text-lg">Follow Us</h3>
                    <div className="flex gap-4">
                      <Link
                        href="https://www.facebook.com/khelconnectkolkata/"
                        className="text-muted-foreground hover:text-primary transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Facebook className="h-6 w-6" />
                      </Link>
                      <Link
                        href="https://x.com/khelconnect_in"
                        className="text-muted-foreground hover:text-primary transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Twitter className="h-6 w-6" />
                      </Link>
                      <Link
                        href="https://www.instagram.com/khelconnect_in/"
                        className="text-muted-foreground hover:text-primary transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Instagram className="h-6 w-6" />
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="mt-10 pt-6 border-t border-border text-center text-muted-foreground">
                  <p>{new Date().getFullYear()} Khelconnect. All rights reserved.</p>
                  <VersionDisplay />
                </div>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}