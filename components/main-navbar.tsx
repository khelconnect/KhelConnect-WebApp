"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Home, Calendar, User, Menu, Building2, LogOut, LayoutDashboard, Shield, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { usePathname, useRouter } from "next/navigation"
import { useUserStore } from "@/lib/userStore"
import { supabase } from "@/lib/supabaseClient"
import { useTheme } from "next-themes"

// Sports Data
const sportsNav = [
  { id: "football", label: "Football", icon: "/icons/footballgreen.svg" },
  { id: "cricket", label: "Cricket", icon: "/icons/cricketgreen.svg" },
  { id: "pickleball", label: "Pickleball", icon: "/icons/pickleballgreen.svg" },
  { id: "badminton", label: "Badminton", icon: "/icons/badmintongreen.svg" },
  { id: "table-tennis", label: "Table Tennis", icon: "/icons/tabletennisgreen.svg" },
  { id: "basketball", label: "Basketball", icon: "/icons/basketballgreen.svg" },
];

export function MainNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const isOwnerSection = pathname?.startsWith("/owner")
  
  // Theme Hooks
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const { name, role, setName, setRole, clearUser } = useUserStore()
  const [loadingRole, setLoadingRole] = useState(false)
  
  // Mobile Interaction States
  const [isMobileSportsOpen, setIsMobileSportsOpen] = useState(false)
  const [isOpen, setIsOpen] = useState(false) // Controls Sheet visibility

  // --- SELF-CORRECTING LOGIC ---
  useEffect(() => {
    setMounted(true)
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

  // --- HELPERS ---
  
  // Dynamic Icon Switcher
  const getIcon = (baseIconPath: string) => {
    if (!mounted) return baseIconPath;
    // Appends 'green' before .svg (e.g. football.svg -> footballgreen.svg)
    return resolvedTheme === 'dark' 
      ? baseIconPath.replace(".svg", "green.svg") 
      : baseIconPath;
  }

  const closeMenu = () => setIsOpen(false)

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
    closeMenu(); 
    router.push("/");
  };

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
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
          {!isOwnerSection && (
             <Link
               href="/"
               className={`flex items-center gap-2 transition-colors text-base ${pathname === "/" ? "text-primary font-bold" : "hover:text-primary"}`}
             >
               <Home className="h-5 w-5" /> Home
             </Link>
          )}

          {/* PC "Book Now" Dropdown */}
          {!isOwnerSection && (
            <div className="relative group">
                <Link
                  href="/turfs?sport=football"
                  className={`flex items-center gap-2 transition-colors text-base py-4 ${pathname.startsWith("/turfs") ? "text-primary font-bold" : "hover:text-primary"}`}
                >
                  <Calendar className="h-5 w-5" /> Book Now <ChevronDown className="h-4 w-4 opacity-50 group-hover:rotate-180 transition-transform"/>
                </Link>
                
                {/* Dropdown Content */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 hidden group-hover:block w-[300px]">
                    <div className="bg-card border border-border rounded-xl shadow-xl overflow-hidden p-2">
                        <div className="grid grid-cols-1 gap-1">
                            {sportsNav.map((sport) => (
                                <Link 
                                    key={sport.id} 
                                    href={`/turfs?sport=${sport.id}`}
                                    className="flex items-center gap-3 p-3 hover:bg-secondary/50 rounded-lg transition-colors group/item"
                                >
                                    <div className="bg-secondary p-1.5 rounded-md group-hover/item:bg-white transition-colors">
                                        {/* Added key={resolvedTheme} to force re-render on theme change */}
                                        <Image 
                                            key={resolvedTheme} 
                                            src={getIcon(sport.icon)} 
                                            alt={sport.label} 
                                            width={20} 
                                            height={20} 
                                            className="w-5 h-5 object-contain" 
                                        />
                                    </div>
                                    <span className="font-medium text-sm">{sport.label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
          )}

          {!isOwnerSection && navLinks.slice(1).map((link) => (
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

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push(name ? getDashboardLink() : "/login")}
            className="rounded-full text-foreground hover:bg-primary hover:text-white transition-all"
            title={name ? "Dashboard" : "Login"}
          >
            {loadingRole ? <Loader2 className="h-5 w-5 animate-spin" /> : getDashboardIcon("h-5 w-5")}
          </Button>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-background border-l border-border overflow-y-auto">
              <SheetHeader className="text-left mb-6">
                <SheetTitle className="flex items-center gap-2 font-qualyneue">
                    <div className="relative h-8 w-8">
                        <Image src="/logo.png" alt="Logo" fill className="rounded-full object-contain" />
                    </div>
                    <span className="font-bold text-xl">Menu</span>
                </SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-6">
                <Link 
                    href="/" 
                    onClick={closeMenu}
                    className={`flex items-center gap-3 text-lg ${pathname === "/" ? "text-primary font-bold" : ""}`}
                >
                    <Home className="h-5 w-5" /> Home
                </Link>

                {/* Mobile Book Now Accordion */}
                <div>
                    <button 
                        onClick={() => setIsMobileSportsOpen(!isMobileSportsOpen)}
                        className={`flex items-center justify-between w-full text-lg gap-3 ${pathname.startsWith("/turfs") ? "text-primary font-bold" : ""}`}
                    >
                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5" /> Book Now
                        </div>
                        {isMobileSportsOpen ? <ChevronUp className="h-5 w-5"/> : <ChevronDown className="h-5 w-5"/>}
                    </button>
                    
                    {isMobileSportsOpen && (
                        <div className="flex flex-col gap-3 mt-4 pl-4 border-l-2 border-border ml-2">
                            {sportsNav.map((sport) => (
                                <Link 
                                    key={sport.id} 
                                    href={`/turfs?sport=${sport.id}`}
                                    onClick={closeMenu}
                                    className="flex items-center gap-3 text-base text-muted-foreground hover:text-primary transition-colors py-1"
                                >
                                    <div className="bg-secondary p-1 rounded-md">
                                        <Image 
                                            key={resolvedTheme} 
                                            src={getIcon(sport.icon)} 
                                            alt={sport.label} 
                                            width={16} 
                                            height={16} 
                                            className="w-4 h-4 object-contain" 
                                        />
                                    </div>
                                    {sport.label}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {navLinks.slice(1).map((link) => (
                  <Link 
                    key={link.href} 
                    href={link.href} 
                    onClick={closeMenu}
                    className={`flex items-center gap-3 text-lg ${pathname === link.href ? "text-primary font-bold" : ""}`}
                  >
                    <link.icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                ))}
                
                <hr className="border-border my-2" />
                
                <Button
                  className="w-full justify-start bg-primary hover:bg-mint-dark text-white rounded-full h-12 text-base"
                  onClick={() => {
                      closeMenu();
                      router.push(name ? getDashboardLink() : "/login");
                  }}
                >
                  {name ? (
                    <>
                      {getDashboardIcon("h-5 w-5 mr-3")}
                      {getDashboardLabel()}
                    </>
                  ) : (
                    <>
                      <User className="h-5 w-5 mr-3" /> Login / Sign Up
                    </>
                  )}
                </Button>

                {name && (
                  <Button variant="outline" className="w-full justify-start rounded-full text-destructive h-12 text-base" onClick={handleLogout}>
                    <LogOut className="h-5 w-5 mr-3" />
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