import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Link from "next/link"
import { Home, Calendar, User, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { ThemeScript } from "./theme-script"

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
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background`}>
        <ThemeScript />
        <ThemeProvider defaultTheme="dark">
          <div className="flex min-h-screen flex-col">
            <header className="border-b border-border sticky top-0 bg-background z-10">
              <div className="container mx-auto px-6 py-5 flex justify-between items-center">
                <Link href="/" className="font-bold text-xl flex items-center gap-3">
                  <span className="bg-primary text-primary-foreground p-1.5 rounded-full text-sm">KC</span>
                  Khelconnect
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex gap-6 items-center">
                  <Link href="/" className="flex items-center gap-2 hover:text-primary transition-colors text-base">
                    <Home className="h-5 w-5" />
                    Home
                  </Link>
                  <Link
                    href="/turfs?sport=football"
                    className="flex items-center gap-2 hover:text-primary transition-colors text-base"
                  >
                    <Calendar className="h-5 w-5" />
                    Book Now
                  </Link>
                  <ThemeToggle />
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
                    <User className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                </nav>

                {/* Mobile Navigation */}
                <div className="flex items-center gap-2 md:hidden">
                  <ThemeToggle />
                  <Sheet>
                    <SheetTrigger asChild className="md:hidden">
                      <Button variant="ghost" size="icon" className="text-foreground">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="bg-background border-l border-border">
                      <div className="flex flex-col gap-8 mt-10">
                        <Link href="/" className="flex items-center gap-3 text-lg">
                          <Home className="h-5 w-5" />
                          Home
                        </Link>
                        <Link href="/turfs?sport=football" className="flex items-center gap-3 text-lg">
                          <Calendar className="h-5 w-5" />
                          Book Now
                        </Link>
                        <Button className="w-full justify-start bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
                          <User className="h-5 w-5 mr-2" />
                          Sign In
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </header>
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
                      <p>123 Park Street</p>
                      <p>Kolkata, West Bengal 700001</p>
                      <p className="mt-3">Email: info@khelconnect.com</p>
                      <p>Phone: +91 98765 43210</p>
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
