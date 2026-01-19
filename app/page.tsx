"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Calendar, Clock, MapPin, ChevronRight, ChevronLeft, User, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabaseClient"
import { useUserStore } from "@/lib/userStore"

export default function Home() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  
  // Get the user name from your global store
  const { name } = useUserStore()

  useEffect(() => {
    // 1. If we already have a name in the store, the user is logged in.
    // Stop here and do NOT show the popup.
    if (name) return;

    const checkSessionAndSchedulePopup = async () => {
      // 2. Double check with Supabase (in case store is empty but cookie exists)
      const { data: { session } } = await supabase.auth.getSession()
      
      // 3. Only if NO name AND NO session, start the timer
      if (!session) {
        const timer = setTimeout(() => {
          setShowAuthModal(true)
        }, 3000)
        return () => clearTimeout(timer)
      }
    }

    checkSessionAndSchedulePopup()
  }, [name]) // Re-run if name changes (e.g. user logs out)

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 340,
        behavior: "smooth",
      })
    }
  }

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -340,
        behavior: "smooth",
      })
    }
  }

  const sports = [
    {
      id: "football",
      name: "Football",
      description: "Book a turf for a game of football with friends or colleagues.",
      image: "/cards/football.jpg",
      subtitle: "Most Popular",
      icon: "/icons/football.svg",
    },
    {
      id: "cricket",
      name: "Cricket",
      description: "Find the perfect pitch for your cricket match in Kolkata.",
      image: "/cards/cricket.jpg",
      subtitle: "Team Sport",
      icon: "/icons/cricket.svg",
    },
    {
      id: "pickleball",
      name: "Pickleball",
      description: "Book a court for the fastest growing sport in India.",
      image: "/cards/pickleball.jpg",
      subtitle: "Trending Now",
      icon: "/icons/pickleball.svg",
    },
    {
      id: "badminton",
      name: "Badminton",
      description: "Indoor and outdoor courts available for badminton enthusiasts.",
      image: "/cards/badminton.jpg",
      subtitle: "Indoor Sport",
      icon: "/icons/badminton.svg",
    },
    {
      id: "table-tennis",
      name: "Table Tennis",
      description: "Professional tables for casual and competitive play.",
      image: "/cards/tabletennis2.jpg",
      subtitle: "All Weather",
      icon: "/icons/tabletennis.svg",
    },
    {
      id: "basketball",
      name: "Basketball",
      description: "Full and half courts available for basketball games.",
      image: "/cards/basketball.jpg",
      subtitle: "Team Sport",
      icon: "/icons/basketball.svg",
    },
  ]

  const SportCard = ({ sport }: { sport: (typeof sports)[0] }) => (
    <Link href={`/turfs?sport=${sport.id}`} className="block h-full">
      <Card className="overflow-hidden border-0 shadow-lg rounded-3xl h-[420px] relative group">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10"></div>
        <Image
          src={sport.image}
          alt={sport.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute bottom-0 left-0 right-0 p-6 z-20 transition-all duration-300 group-hover:pb-10">
          <div className="bg-primary rounded-full p-3 w-14 h-14 flex items-center justify-center mb-4 relative">
            <Image 
              src={sport.icon || "/placeholder.svg"} 
              alt={`${sport.name} icon`} 
              width={32} 
              height={32} 
              className="object-contain" 
            />
          </div>
          <p className="text-mint-light text-sm font-medium mb-2">{sport.subtitle}</p>
          <h3 className="text-2xl font-bold text-white mb-1">{sport.name}</h3>
          <div className="flex items-center text-white/80 text-sm">
            Book Now <ArrowRight className="ml-2 h-4 w-4" />
          </div>
        </div>
      </Card>
    </Link>
  )

  return (
    <main className="container mx-auto px-6 py-12">
      <section className="mb-16 text-center max-w-3xl mx-auto">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Book Your Turf <br /> Unleash Your Game</h1>
          <p className="text-xl text-muted-foreground">Book your favorite sports venue in Kolkata</p>
        </div>
      </section>

      <section className="mb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-semibold">Choose Your Sport</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary hover:text-foreground bg-secondary rounded-full h-10 w-10 transition-colors group"
              onClick={scrollLeft}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-6 w-6 group-hover:text-foreground transition-colors" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary hover:text-foreground bg-secondary rounded-full h-10 w-10 transition-colors group"
              onClick={scrollRight}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-6 w-6 group-hover:text-foreground transition-colors" />
            </Button>
          </div>
        </div>

        <div className="relative -mx-6 px-6">
          <div
            ref={scrollContainerRef}
            className="flex overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide -mx-4"
          >
            {sports.map((sport) => (
              <div key={sport.id} className="px-4 min-w-[280px] md:min-w-[320px] snap-start">
                <SportCard sport={sport} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="text-center mb-20 max-w-5xl mx-auto bg-card p-10 rounded-3xl border border-border">
        <h2 className="text-3xl font-semibold mb-10 mint-text-gradient">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="flex flex-col items-center">
            <div className="bg-secondary w-20 h-20 rounded-full flex items-center justify-center mb-6">
              <MapPin className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-medium mb-3 text-xl">Select a Sport & Turf</h3>
            <p className="text-muted-foreground text-base">Choose your sport and find the perfect turf in Kolkata</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-secondary w-20 h-20 rounded-full flex items-center justify-center mb-6">
              <Calendar className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-medium mb-3 text-xl">Pick Date & Time</h3>
            <p className="text-muted-foreground text-base">Browse available dates and 30-minute slots</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-secondary w-20 h-20 rounded-full flex items-center justify-center mb-6">
              <Clock className="h-10 w-10 text-mint-light" />
            </div>
            <h3 className="font-medium mb-3 text-xl">Book & Play</h3>
            <p className="text-muted-foreground text-base">Receive your digital pass and enjoy your game</p>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto mb-10">
        <Card className="overflow-hidden border-none shadow-xl rounded-3xl">
          <div className="mint-gradient p-10 text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Play?</h2>
            <p className="mb-6 text-lg">Book your turf now and enjoy your favorite sport in Kolkata.</p>
            <Button variant="secondary" size="lg" asChild className="text-lg px-8 py-6 h-auto rounded-full">
              <Link href="/turfs?sport=football">
                Book Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </Card>
      </section>

      {/* Auth Popup - Now correctly suppressed if user is logged in */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">Welcome to KhelConnect!</DialogTitle>
            <DialogDescription className="text-center">
              Please choose how you want to continue
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button asChild className="w-full py-6 text-lg rounded-xl" variant="default">
              <Link href="/login">
                <User className="mr-2 h-5 w-5" />
                Player Login / Check Bookings
              </Link>
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button asChild className="w-full py-6 text-lg rounded-xl" variant="outline">
              <Link href="/owner/login">
                <Building2 className="mr-2 h-5 w-5" />
                Turf Partner Login
              </Link>
            </Button>
            <div className="text-center text-sm text-muted-foreground">
                New Partner? <Link href="/owner/signup" className="text-primary hover:underline">Register your turf here</Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}