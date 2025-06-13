"use client";

export const dynamic = "force-dynamic";

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { MapPin, Star, ArrowRight, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

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
}

export default function TurfsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sport = searchParams.get("sport") || "football"
  const [turfs, setTurfs] = useState<Turf[]>([])
  const [loading, setLoading] = useState(true)

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
    fetchTurfs()
  }, [sport])

  const sportNames = {
    football: "Football",
    cricket: "Cricket",
    pickleball: "Pickleball",
    badminton: "Badminton",
    "table-tennis": "Table Tennis",
    basketball: "Basketball",
  }

  const sportIcons = {
    football: "/icons/footballgreen.svg",
    cricket: "/icons/cricketgreen.svg",
    pickleball: "/icons/pickleballgreen.svg",
    badminton: "/icons/badmintongreen.svg",
    "table-tennis": "/icons/tabletennisgreen.svg",
    basketball: "/icons/basketballgreen.svg",
  }

  const sportIcon = sportIcons[sport as keyof typeof sportIcons] || sportIcons.football

  const handleSelectTurf = (turfId: string) => {
    router.push(`/booking?sport=${sport}&turf=${turfId}`)
  }

  return (
    <main className="container mx-auto px-6 py-12">
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
              src={sportIcon || "/placeholder.svg"}
              alt={sportNames[sport as keyof typeof sportNames]}
              className="h-4 w-4 mr-2"
            />
            {sportNames[sport as keyof typeof sportNames] || "Sport"}
          </Badge>
        </div>

        <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
          <img
            src={sportIcon || "/placeholder.svg"}
            alt={sportNames[sport as keyof typeof sportNames]}
            className="h-10 w-10"
          />
          {sportNames[sport as keyof typeof sportNames] || "Sport"} Turfs in Kolkata
        </h1>
        <p className="text-lg text-muted-foreground">
          Select a turf to view available time slots and make your booking
        </p>
      </div>

      {loading ? (
        <p className="text-center">Loading turfs...</p>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 max-w-5xl mx-auto">
        {turfs.length === 0 ? (
          <p className="text-center col-span-full">No turfs found for {sportNames[sport as keyof typeof sportNames]}.</p>
        ) : (
        turfs.map((turf) => (
          <Card
            key={turf.id}
            className="overflow-hidden hover:shadow-xl transition-all hover:border-primary cursor-pointer bg-card border-border rounded-3xl"
            onClick={() => handleSelectTurf(turf.id)}
          >
            <div className="aspect-video relative">
              <img src={turf.image || "/placeholder.svg"} alt={turf.name} className="w-full h-full object-cover" />
              <div className="absolute top-4 right-4 bg-primary rounded-full px-3 py-1.5 flex items-center shadow-md">
                <Star className="h-5 w-5 text-white fill-white mr-1.5" />
                <span className="font-medium text-base text-white">{turf.rating}</span>
              </div>
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

              <Button className="w-full mt-2 bg-primary hover:bg-mint-dark text-white text-base py-6 rounded-full">
                Select This Turf
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        )))}
      </div>
      )}
    </main>
  )
}
