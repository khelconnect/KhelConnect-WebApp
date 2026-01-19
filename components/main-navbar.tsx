"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Home, Calendar, User, Menu, Building2, LogOut, LayoutDashboard, Shield, Loader2 } from "lucide-react"
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
  
  const { name, role, setName, setRole, clearUser } = useUserStore()
  const [loadingRole, setLoadingRole] = useState(false)

  // --- SELF-CORRECTING LOGIC ---
  useEffect(() => {
    const syncUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setLoadingRole(true)
        const { data: profile } = await supabase
          .from('users')
          .select('name, role')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          if (profile.role !== role) setRole(profile.role)
          if (profile.name !== name) setName(profile.name)
        }
        setLoadingRole(false)
      } else {
        if (name) {
            if(clearUser) clearUser();
            else { setName(null); setRole(null); }
        }
      }
    }
    syncUserRole()
  }, []) 

  // --- ROUTING HELPERS ---
  const getDashboardLink = () => {
    if (role === 'admin') return '/admin';
    if (role === 'owner') return '/owner/dashboard';
    return '/profile';
  }

  const getDashboardIcon = (className = "h-5 w-5") => {
    if (role === 'admin') return <Shield className={className} />;
    if (role === 'owner') return <LayoutDashboard className={className} />;
    return <User className={className} />;
  }

  const getDashboardLabel = () => {
    if (role === 'admin') return 'Admin Panel';
    if (role === 'owner') return 'Owner Dashboard';
    return name || 'Profile';
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (clearUser) clearUser();
    else { setName(null); setRole(null); }
    router.push("/");
  };

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/turfs?sport=football", label: "Book Now", icon: Calendar },
    ...(role !== 'owner' && role !== 'admin' ? [{ href: "/owner/login", label: "Turf Owners", icon: Building2 }] : []),
  ]

  return (
    <header className="border-b border-border sticky top-0 bg-background z-50">
      <div className="container mx-auto px-6 py-5 flex justify-between items-center">
        
        {/* Logo */}
        <Link href={role === 'owner' ? "/owner/dashboard" : role === 'admin' ? "/admin" : "/"} className="font-bold text-xl flex items-center gap-3">
          <div className="relative h-12 w-12">
            <Image src="/logo.png" alt="Khelconnect Logo" fill className="rounded-full object-contain" />
          </div>
          <p className="font-qualyneue">
            <span className="font-bold">Khel</span>
            <span className="font-light">Connect</span>
            {isOwnerSection && <span className="text-primary ml-1 text-sm font-semibold">Partner</span>}
            {role === 'admin' && <span className="text-red-500 ml-1 text-xs font-bold uppercase tracking-wider">Admin</span>}
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
                  onClick={() => router.push(getDashboardLink())}
                  className="bg-primary hover:bg-mint-dark text-white rounded-full px-6 transition-all shadow-md hover:shadow-lg"
                  disabled={loadingRole}
                >
                  {loadingRole ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <>
                      {getDashboardIcon("h-4 w-4 mr-2")}
                      {getDashboardLabel()}
                    </>
                  )}
                </Button>
                
                <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                  <LogOut className="h-5 w-5 text-muted-foreground hover:text-destructive transition-colors" />
                </Button>
              </div>
            ) : (
              <Button onClick={() => router.push('/login')} className="bg-primary hover:bg-mint-dark text-white rounded-full px-6">
                <User className="h-4 w-4 mr-2" /> Login
              </Button>
            )}
          </div>
        </nav>

        {/* Mobile Navigation */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />

          {/* --- UPDATED: Mobile Profile/Login Icon --- */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push(name ? getDashboardLink() : "/login")}
            className="rounded-full text-foreground hover:bg-primary hover:text-white transition-all"
            title={name ? "Dashboard" : "Login"}
          >
            {loadingRole ? <Loader2 className="h-5 w-5 animate-spin" /> : getDashboardIcon("h-5 w-5")}
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground">
                <Menu className="h-6 w-6" />
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
                
                {/* Fallback Profile Button in Menu */}
                <Button
                  className="w-full justify-start bg-primary hover:bg-mint-dark text-white rounded-full"
                  onClick={() => router.push(name ? getDashboardLink() : "/login")}
                >
                  {name ? (
                    <>
                      {getDashboardIcon("h-5 w-5 mr-2")}
                      {getDashboardLabel()}
                    </>
                  ) : (
                    <>
                      <User className="h-5 w-5 mr-2" /> Login
                    </>
                  )}
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