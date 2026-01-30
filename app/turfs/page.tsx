"use client";

export const dynamic = "force-dynamic";

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { MapPin, Star, ArrowRight, ArrowLeft, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"

interface Turf {
  id: string
  name: string
  location: string
  image: string
  price: number
  rating: number
  amenities: string[]
  distance: string
  sports: string[]
  is_coming_soon: boolean 
}

// --- BASE CONFIGURATION ---
const sportsConfig = [
  { id: "football", label: "Football", icon: "/icons/footballgreen.svg" },
  { id: "cricket", label: "Cricket", icon: "/icons/cricketgreen.svg" },
  { id: "pickleball", label: "Pickleball", icon: "/icons/pickleballgreen.svg" },
  { id: "badminton", label: "Badminton", icon: "/icons/badmintongreen.svg" },
  { id: "table-tennis", label: "Table Tennis", icon: "/icons/tabletennisgreen.svg" },
  { id: "basketball", label: "Basketball", icon: "/icons/basketballgreen.svg" },
];


export default function TurfsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sport = searchParams.get("sport") || "football"
  const [turfs, setTurfs] = useState<Turf[]>([])
  const [loading, setLoading] = useState(true)
  
  // Theme State
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Helper to get correct icon path based on theme
  const getThemeIcon = (sportId: string) => {
    const sportData = sportsConfig.find(s => s.id === sportId) || sportsConfig[0];
    if (!mounted) return sportData.icon; // Default to light during SSR
    return resolvedTheme === 'dark' ? sportData.icon : sportData.icon;
  }

  const fetchTurfs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("turfs")
      .select("*")
      .contains("sports", [sport])

    if (error) {
      console.error("Error fetching turfs:", error)
      setTurfs([])
    } else {
      setTurfs(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    setLoading(true)
    setTurfs([])
    fetchTurfs()
  }, [sport])

  // Current Page Data
  const currentSportObj = sportsConfig.find(s => s.id === sport) || sportsConfig[0];
  const sportName = currentSportObj.label;
  const headerIcon = getThemeIcon(currentSportObj.id);

  const handleSelectTurf = (turf: Turf) => {
    if (turf.is_coming_soon) return;
    router.push(`/booking?sport=${sport}&turf=${turf.id}`)
  }

  return (
    <main className="container mx-auto px-6 py-12 pb-24 md:pb-12"> 
      
      <div className="mb-12 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" asChild className="gap-2 text-foreground">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <Badge
            variant="outline"
            className="text-base font-normal py-1.5 px-3 bg-secondary text-primary border-border rounded-full"
          >
            <img
              src={headerIcon}
              alt={sportName}
              className="h-4 w-4 mr-2"
            />
            {sportName}
          </Badge>
        </div>

        <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
          <img
            src={headerIcon}
            alt={sportName}
            className="h-10 w-10"
          />
          {sportName} Turfs in Kolkata
        </h1>
        <p className="text-lg text-muted-foreground">
          Select a turf to view available time slots and make your booking
        </p>
      </div>

      <div className="max-w-5xl mx-auto">
        {loading && (
          <SkeletonGrid />
        )}
        
        {turfs.length > 0 && !loading && (
          <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:gap-8 mb-12">
            {turfs.map((turf) => (
              <div key={turf.id} className="contents">
                
                {/* --- 1. MOBILE VIEW (Immersive Vertical Feed) --- */}
                <div
                    onClick={() => handleSelectTurf(turf)}
                    className={cn(
                        "md:hidden group relative w-full h-[400px] rounded-3xl overflow-hidden transition-all duration-300",
                        turf.is_coming_soon ? "cursor-default" : "cursor-pointer active:scale-[0.98] hover:shadow-2xl"
                    )}
                >
                    {/* Background Image */}
                    <div className="absolute inset-0">
                        <img 
                            src={turf.image || "/placeholder.svg"} 
                            alt={turf.name} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    </div>

                    {/* Top Badges */}
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                        <Badge variant="secondary" className="backdrop-blur-md bg-white/20 text-white border-white/10 px-3 py-1">
                            {turf.distance}
                        </Badge>
                        {turf.rating && !turf.is_coming_soon && (
                            <div className="bg-primary/90 backdrop-blur-md text-white px-3 py-1 rounded-full flex items-center gap-1 text-sm font-bold shadow-lg">
                                <Star className="h-3 w-3 fill-white" /> {turf.rating}
                            </div>
                        )}
                    </div>

                    {/* Coming Soon Overlay (Mobile) */}
                    {turf.is_coming_soon && (
                        <div className="absolute inset-0 z-20 backdrop-blur-sm bg-black/40 flex flex-col items-center justify-center text-center p-4">
                            <h2 className="text-2xl font-bold mb-4 text-white drop-shadow-lg">
                                {turf.name}
                            </h2>
                            <div className="px-6 py-2 border-2 border-primary rounded-full bg-black/60 backdrop-blur-md">
                                <span className="text-primary font-bold tracking-wider uppercase text-sm flex items-center gap-2">
                                    <Lock className="h-4 w-4" /> Coming Soon
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Bottom Glass Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1 leading-tight">{turf.name}</h2>
                                    <div className="flex items-center text-white/80 text-sm">
                                        <MapPin className="h-3.5 w-3.5 mr-1.5 text-primary" />
                                        <span className="truncate max-w-[200px]">{turf.location}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-white/60 uppercase font-bold mb-0.5">Starting at</p>
                                    <p className="text-xl font-bold text-primary">₹{turf.price}</p>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
                                {turf.amenities.slice(0, 3).map((amenity) => (
                                    <span key={amenity} className="text-[10px] bg-white/10 border border-white/10 text-white/90 px-2 py-1 rounded-md whitespace-nowrap">
                                        {amenity}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- 2. DESKTOP VIEW (Original Card Style) --- */}
                <Card
                    className={cn(
                        "hidden md:block relative overflow-hidden transition-all border-border rounded-3xl",
                        turf.is_coming_soon ? "cursor-default" : "hover:shadow-xl hover:border-primary cursor-pointer"
                    )}
                    onClick={() => handleSelectTurf(turf)}
                >
                    {/* Coming Soon Overlay (Desktop) */}
                    {turf.is_coming_soon && (
                        <div className="absolute inset-0 z-20 backdrop-blur-md bg-background/30 flex flex-col items-center justify-center transition-all duration-500">
                            <h2 className="text-2xl font-bold mb-4 text-foreground drop-shadow-sm">
                                {turf.name}
                            </h2>
                            <div className="px-6 py-2 border-2 border-primary rounded-full bg-background/50 backdrop-blur-sm">
                                <span className="text-primary font-bold tracking-wider uppercase text-sm flex items-center gap-2">
                                    <Lock className="h-4 w-4" />
                                    Coming Soon
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="aspect-video relative">
                        <img src={turf.image || "/placeholder.svg"} alt={turf.name} className="w-full h-full object-cover" />
                        {turf.rating && !turf.is_coming_soon && (
                            <div className="absolute top-4 right-4 bg-primary rounded-full px-3 py-1.5 flex items-center shadow-md">
                                <Star className="h-5 w-5 text-white fill-white mr-1.5" />
                                <span className="font-medium text-base text-white">{turf.rating}</span>
                            </div>
                        )}
                    </div>
                    <CardContent className="p-8">
                        <div className="flex justify-between items-start mb-3">
                            <h2 className="text-2xl font-semibold">{turf.name}</h2>
                            <Badge
                                variant="secondary"
                                className="ml-2 bg-primary text-primary-foreground text-base px-3 py-1 rounded-full"
                            >
                                ₹{turf.price}
                            </Badge>
                        </div>
                        <div className="flex items-center text-muted-foreground mb-4 text-base">
                            <MapPin className="h-5 w-5 mr-2 flex-shrink-0" />
                            <span className="mr-2">{turf.location}</span>
                            <span className="text-sm">({turf.distance})</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-6">
                            {turf.amenities.map((amenity) => (
                                <Badge
                                    key={amenity}
                                    variant="outline"
                                    className="bg-secondary border-border text-base px-3 py-1 rounded-full"
                                >
                                    {amenity}
                                </Badge>
                            ))}
                        </div>
                        <Button 
                            className="w-full mt-2 bg-primary hover:bg-mint-dark text-white text-base py-6 rounded-full"
                            disabled={turf.is_coming_soon}
                        >
                            {turf.is_coming_soon ? "Coming Soon" : "Select This Turf"}
                            {!turf.is_coming_soon && <ArrowRight className="ml-2 h-5 w-5" />}
                        </Button>
                    </CardContent>
                </Card>

              </div>
            ))}
          </div>
        )}
        
        {turfs.length === 0 && !loading && (
          <ComingSoonView sportName={sportName} />
        )}
      </div>

      {/* --- MOBILE SPORT NAVIGATION BAR --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border z-50 md:hidden pb-safe">
        <div className="flex overflow-x-auto no-scrollbar py-1 px-4 gap-2 items-center justify-between">
            {sportsConfig.map((s) => {
                const isActive = sport === s.id;
                const iconSrc = getThemeIcon(s.id);

                return (
                    <Link 
                        key={s.id} 
                        href={`/turfs?sport=${s.id}`}
                        className={cn(
                            "flex flex-col items-center justify-center min-w-[64px] gap-1.5 transition-all rounded-xl p-2",
                            isActive ? "bg-primary/10" : "hover:bg-secondary/50"
                        )}
                    >
                        <div className={cn("p-1.5 rounded-full transition-all", isActive ? "bg-white shadow-sm" : "bg-transparent")}>
                            <img 
                                src={iconSrc} 
                                alt={s.label} 
                                className="w-5 h-5 object-contain"
                            />
                        </div>
                        <span className={cn(
                            "text-[10px] font-medium text-center leading-tight max-w-[60px] truncate",
                            isActive ? "text-primary font-bold" : "text-muted-foreground"
                        )}>
                            {s.label}
                        </span>
                    </Link>
                )
            })}
        </div>
      </div>

    </main>
  )
}

// ==================================================================
// --- HELPER COMPONENTS ---
// ==================================================================

function TurfCardSkeleton() {
  return (
    <Card className="overflow-hidden bg-card border-border rounded-3xl">
      <div className="aspect-video relative bg-secondary animate-pulse" />
      <CardContent className="p-8">
        <div className="flex justify-between items-start mb-3">
          <div className="h-7 w-3/5 bg-secondary rounded animate-pulse" />
          <div className="h-7 w-1/4 bg-secondary rounded-full animate-pulse" />
        </div>
        <div className="h-5 w-2/5 bg-secondary rounded animate-pulse mb-4" />
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="h-6 w-1/4 bg-secondary rounded-full animate-pulse" />
          <div className="h-6 w-1/3 bg-secondary rounded-full animate-pulse" />
        </div>
        <div className="h-12 w-full bg-secondary rounded-full animate-pulse" />
      </CardContent>
    </Card>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
      <TurfCardSkeleton />
      <TurfCardSkeleton />
    </div>
  );
}

function ComingSoonView({ sportName }: { sportName: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[50vh] p-6">
      <div className="max-w-md p-8"> 
        <Badge 
          variant="outline"
          className={cn(
            "mb-4 text-base py-1.5 px-4 rounded-full",
            "border-green-500 text-green-500 bg-transparent"
          )}
        >
          Coming Soon
        </Badge>
        <h2 className="text-3xl font-bold mb-3">
          {sportName} Turfs
        </h2>
        <p className="text-lg text-muted-foreground">
          We're working hard to bring {sportName} turfs to our platform. Please check back soon!
        </p>
      </div>
    </div>
  );
}