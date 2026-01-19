"use client"

import Link from "next/link"
import Image from "next/image"
import { Home, Calendar, User, Menu, Building2, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { usePathname, useRouter } from "next/navigation"
import { useUserStore } from "@/lib/userStore"
import { supabase } from "@/lib/supabaseClient"

export function MainNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const isOwnerSection = pathname?.startsWith("/owner")
  
  // Get user name and setter from Zustand
  const { name, setName } = useUserStore()


const handleLogout = async () => {
  await supabase.auth.signOut();
  setName(null); // This now works without error!
  router.push("/");
};

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/turfs?sport=football", label: "Book Now", icon: Calendar },
    { href: "/owner/login", label: "Turf Owners", icon: Building2 },
  ]

  return (
    <header className="border-b border-border sticky top-0 bg-background z-50">
      <div className="container mx-auto px-6 py-5 flex justify-between items-center">
        <Link href={isOwnerSection ? "/owner/dashboard" : "/"} className="font-bold text-xl flex items-center gap-3">
          <div className="relative h-12 w-12">
            <Image
              src="/logo.png"
              alt="Khelconnect Logo"
              fill
              className="rounded-full object-contain"
            />
          </div>
          <p className="font-qualyneue">
            <span className="font-bold">Khel</span>
            <span className="font-light">Connect</span>
            {isOwnerSection && <span className="text-primary ml-1 text-sm font-semibold">Partner</span>}
          </p>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-6 items-center">
          {!isOwnerSection && navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 transition-colors text-base ${
                pathname === link.href ? "text-primary font-bold" : "hover:text-primary"
              }`}
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </Link>
          ))}
          
          <div className="flex items-center gap-4 border-l pl-6 border-border ml-2">
            <ThemeToggle />
            
            {name ? (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => router.push('/my-bookings')}
                  className="bg-primary hover:bg-mint-dark text-white rounded-full px-6"
                >
                  <User className="h-4 w-4 mr-2" />
                  {name}
                </Button>
                <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                  <LogOut className="h-5 w-5 text-muted-foreground hover:text-destructive transition-colors" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => router.push('/login')}
                className="bg-primary hover:bg-mint-dark text-white rounded-full px-6"
              >
                <User className="h-4 w-4 mr-2" />
                Login
              </Button>
            )}
          </div>
        </nav>

        {/* Mobile Navigation */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-background border-l border-border">
              <div className="flex flex-col gap-8 mt-10">
                {navLinks.map((link) => (
                  <Link 
                    key={link.href} 
                    href={link.href} 
                    className={`flex items-center gap-3 text-lg ${pathname === link.href ? "text-primary font-bold" : ""}`}
                  >
                    <link.icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                ))}
                
                <hr className="border-border" />
                
                <Button
                  className="w-full justify-start bg-primary hover:bg-mint-dark text-white rounded-full"
                  onClick={() => router.push(name ? "/my-bookings" : "/login")}
                >
                  <User className="h-5 w-5 mr-2" />
                  {name ? name : "Login"}
                </Button>

                {name && (
                  <Button variant="outline" className="w-full justify-start rounded-full text-destructive" onClick={handleLogout}>
                    <LogOut className="h-5 w-5 mr-2" />
                    Logout
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}