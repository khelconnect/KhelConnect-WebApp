"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, Calendar, Clock, MapPin, ChevronRight, Grid, List, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function Home() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<"scroll" | "grid">("scroll")

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 340,
        behavior: "smooth",
      })
    }
  }

  const toggleViewMode = () => {
    setViewMode(viewMode === "scroll" ? "grid" : "scroll")
  }

  const sports = [
    {
      id: "football",
      name: "Football",
      description: "Book a turf for a game of football with friends or colleagues.",
      image: "/placeholder.svg?height=400&width=300",
      subtitle: "Most Popular",
      icon: "/images/football-icon.png",
    },
    {
      id: "cricket",
      name: "Cricket",
      description: "Find the perfect pitch for your cricket match in Kolkata.",
      image: "/placeholder.svg?height=400&width=300",
      subtitle: "Team Sport",
      icon: "/images/cricket-icon.png",
    },
    {
      id: "pickleball",
      name: "Pickleball",
      description: "Book a court for the fastest growing sport in India.",
      image: "/placeholder.svg?height=400&width=300",
      subtitle: "Trending Now",
      icon: "/images/pickleball-icon.png",
    },
    {
      id: "badminton",
      name: "Badminton",
      description: "Indoor and outdoor courts available for badminton enthusiasts.",
      image: "/placeholder.svg?height=400&width=300",
      subtitle: "Indoor Sport",
      icon: "/images/badminton-icon.png",
    },
    {
      id: "table-tennis",
      name: "Table Tennis",
      description: "Professional tables for casual and competitive play.",
      image: "/placeholder.svg?height=400&width=300",
      subtitle: "All Weather",
      icon: "/images/table-tennis-icon.png",
    },
    {
      id: "basketball",
      name: "Basketball",
      description: "Full and half courts available for basketball games.",
      image: "/placeholder.svg?height=400&width=300",
      subtitle: "Team Sport",
      icon: "/images/basketball-icon.png",
    },
  ]

  const SportCard = ({ sport }: { sport: (typeof sports)[0] }) => (
    <Link href={`/turfs?sport=${sport.id}`} className="block h-full">
      <Card className="overflow-hidden border-0 shadow-lg rounded-3xl h-[420px] relative group">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10"></div>
        <img
          src={sport.image || "/placeholder.svg"}
          alt={sport.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute bottom-0 left-0 right-0 p-6 z-20 transition-all duration-300 group-hover:pb-10">
          <div className="bg-primary rounded-full p-3 w-14 h-14 flex items-center justify-center mb-4">
            <img src={sport.icon || "/placeholder.svg"} alt={`${sport.name} icon`} className="h-8 w-8 object-contain" />
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

  const SportGridCard = ({ sport }: { sport: (typeof sports)[0] }) => (
    <Link href={`/turfs?sport=${sport.id}`} className="block h-full">
      <div className="relative overflow-hidden rounded-3xl aspect-[4/3] group">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10"></div>
        <img
          src={sport.image || "/placeholder.svg"}
          alt={sport.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
          <h3 className="text-3xl font-bold text-white">{sport.name}</h3>
        </div>
      </div>
    </Link>
  )

  return (
    <main className="container mx-auto px-6 py-12">
      <section className="mb-16 text-center max-w-3xl mx-auto">
        <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-mint-light">
          Khelconnect
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Book your favorite sports turf in Kolkata for football, cricket, or pickleball in 30-minute slots.
        </p>
      </section>

      <section className="mb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-semibold">Choose Your Sport</h2>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleViewMode}
              className="flex items-center gap-2 rounded-full"
            >
              {viewMode === "scroll" ? (
                <>
                  <Grid className="h-4 w-4" />
                  <span>View All</span>
                </>
              ) : (
                <>
                  <List className="h-4 w-4" />
                  <span>Scroll View</span>
                </>
              )}
            </Button>
            {viewMode === "scroll" && (
              <Button
                variant="ghost"
                size="icon"
                className="text-primary hover:text-foreground bg-secondary rounded-full h-10 w-10 transition-colors group"
                onClick={scrollRight}
                aria-label="Scroll right"
              >
                <ChevronRight className="h-6 w-6 group-hover:text-foreground transition-colors" />
              </Button>
            )}
          </div>
        </div>

        {viewMode === "scroll" ? (
          // Horizontal scrollable cards
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
        ) : (
          // Grid view of all sports - Apple Music style
          <div className="space-y-8">
            <div className="relative">
              <div className="relative rounded-full bg-secondary flex items-center px-4 max-w-3xl mx-auto">
                <Search className="h-5 w-5 text-muted-foreground absolute left-4" />
                <Input
                  type="text"
                  placeholder="Search sports, turfs, and more"
                  className="border-0 bg-transparent pl-10 py-6 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sports.map((sport) => (
                <div key={sport.id}>
                  <SportGridCard sport={sport} />
                </div>
              ))}
            </div>
          </div>
        )}
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
    </main>
  )
}
