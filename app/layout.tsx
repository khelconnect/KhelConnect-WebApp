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
  title: "Khelconnect",
  description: "Book sports turfs in Kolkata for football, cricket, and pickleball",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={qualyNeue.variable}>
      <body className={`${inter.className} bg-background`}>
        <ThemeScript />
        <ThemeProvider defaultTheme="dark">
          <MainNavbar />
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
            <footer className="mt-auto border-t border-border py-10 bg-background">
              <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
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
                      <p>Phone: +91 9874014180</p>
                      <br />
                      <p>Kolkata, West Bengal, India</p>
                    </address>
                  </div>
                </div>
                <div className="mt-10 pt-6 border-t border-border text-center text-muted-foreground">
                  <p>© {new Date().getFullYear()} Khelconnect. All rights reserved.</p>
                </div>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
