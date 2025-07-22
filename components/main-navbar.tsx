"use client"

import Link from "next/link"
import { Home, Calendar, User, Menu, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { usePathname, useRouter } from "next/navigation"
import { useUserStore } from "@/lib/userStore"

export function MainNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const isOwnerSection = pathname?.startsWith("/owner")
  const userName = useUserStore((state) => state.name)

  return (
    <header className="border-b border-border sticky top-0 bg-background z-10">
      <div className="container mx-auto px-6 py-5 flex justify-between items-center">
        <Link href={isOwnerSection ? "/owner/dashboard" : "/"} className="font-bold text-xl flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Khelconnect Logo"
            className="h-12 w-12 rounded-full object-contain"
          />
          <p className="font-qualyneue">
            <span className="font-bold">Khel</span>
            <span className="font-light">Connect</span>
            {isOwnerSection && <span className="text-primary"> Partner</span>}
          </p>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-6 items-center">
          {isOwnerSection ? (
            <Link href="/" className="flex items-center gap-2 hover:text-primary transition-colors text-base">
              <Home className="h-5 w-5" />
              Back to Main Site
            </Link>
          ) : (
            <>
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
              <Link
                href="/owner/login"
                className="flex items-center gap-2 hover:text-primary transition-colors text-base"
              >
                <Building2 className="h-5 w-5" />
                Turf Owners
              </Link>
            </>
          )}
          <ThemeToggle />
<Button
  onClick={() => router.push('/my-bookings')}
  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
>
  <User className="h-4 w-4 mr-2" />
  {userName ? userName : "Bookings"}
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
                {isOwnerSection ? (
                  <Link href="/" className="flex items-center gap-3 text-lg">
                    <Home className="h-5 w-5" />
                    Back to Main Site
                  </Link>
                ) : (
                  <>
                    <Link href="/" className="flex items-center gap-3 text-lg">
                      <Home className="h-5 w-5" />
                      Home
                    </Link>
                    <Link href="/turfs?sport=football" className="flex items-center gap-3 text-lg">
                      <Calendar className="h-5 w-5" />
                      Book Now
                    </Link>
                    <Link href="/owner/login" className="flex items-center gap-3 text-lg">
                      <Building2 className="h-5 w-5" />
                      Turf Owners
                    </Link>
                  </>
                )}
                <Button
                  className="w-full justify-start bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
                  onClick={() => router.push("/my-bookings")}
                >
                  <User className="h-5 w-5 mr-2" />
                  Bookings
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
