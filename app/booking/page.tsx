"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { CalendarIcon, Clock, ArrowRight, ArrowLeft, MapPin, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function BookingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sport = searchParams.get("sport") || "football"
  const turfId = searchParams.get("turf") || "salt-lake"

  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [totalPrice, setTotalPrice] = useState(0)

  const turfs = {
    "salt-lake": {
      id: "salt-lake",
      name: "Salt Lake Stadium Turf",
      location: "Salt Lake, Sector V",
      price: 800,
      image: "/placeholder.svg?height=200&width=300",
    },
    "new-town": {
      id: "new-town",
      name: "New Town Sports Arena",
      location: "New Town, Action Area II",
      price: 750,
      image: "/placeholder.svg?height=200&width=300",
    },
    "park-street": {
      id: "park-street",
      name: "Park Street Play Zone",
      location: "Park Street Area",
      price: 900,
      image: "/placeholder.svg?height=200&width=300",
    },
    howrah: {
      id: "howrah",
      name: "Howrah Sports Complex",
      location: "Howrah Bridge Area",
      price: 700,
      image: "/placeholder.svg?height=200&width=300",
    },
  }

  const sportNames = {
    football: "Football",
    cricket: "Cricket",
    pickleball: "Pickleball",
    badminton: "Badminton",
    "table-tennis": "Table Tennis",
    basketball: "Basketball",
  }

  const sportIcons = {
    football: "/images/football-icon.png",
    cricket: "/images/cricket-icon.png",
    pickleball: "/images/pickleball-icon.png",
    badminton: "/images/badminton-icon.png",
    "table-tennis": "/images/table-tennis-icon.png",
    basketball: "/images/basketball-icon.png",
  }

  const sportIcon = sportIcons[sport as keyof typeof sportIcons]
  const selectedTurf = turfs[turfId as keyof typeof turfs]

  // Calculate total price whenever selected slots change
  useEffect(() => {
    if (selectedSlots.length === 0) {
      setTotalPrice(0)
      return
    }

    // Calculate the number of 30-minute periods based on start and end times
    const timeSlots = generateTimeSlots()

    // Find the indices of the first and last selected slots
    const firstSlotIndex = timeSlots.indexOf(selectedSlots[0])
    const lastSlotIndex = timeSlots.indexOf(selectedSlots[selectedSlots.length - 1])

    // Calculate the number of 30-minute periods (number of slots - 1)
    const numberOfPeriods = Math.max(1, lastSlotIndex - firstSlotIndex)

    // Apply dynamic pricing:
    // - First period: full price
    // - Additional periods: 10% discount per period
    const basePrice = selectedTurf.price
    let total = basePrice // First period at full price

    // Apply discount for additional periods
    for (let i = 1; i < numberOfPeriods; i++) {
      const discountFactor = Math.max(0.7, 1 - i * 0.1) // Maximum 30% discount
      total += basePrice * discountFactor
    }

    setTotalPrice(Math.round(total))
  }, [selectedSlots, selectedTurf.price])

  // Generate time slots from 6 AM to 10 PM in 30-minute increments with range format
  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 6; hour < 22; hour++) {
      const hourFormatted = hour % 12 === 0 ? 12 : hour % 12
      const ampm = hour < 12 ? "AM" : "PM"

      // First slot of the hour
      slots.push(`${hourFormatted}:00 ${ampm}`)

      // Second slot of the hour
      slots.push(`${hourFormatted}:30 ${ampm}`)
    }
    return slots
  }

  // Format a time slot to show the range (e.g., "6:00 AM - 6:30 AM")
  const formatTimeSlotRange = (slot: string) => {
    const timeSlots = generateTimeSlots()
    const slotIndex = timeSlots.indexOf(slot)

    if (slotIndex === -1 || slotIndex === timeSlots.length - 1) {
      return slot
    }

    const nextSlot = timeSlots[slotIndex + 1]
    return `${slot} - ${nextSlot}`
  }

  const timeSlots = generateTimeSlots()

  // Simulate some slots as already booked
  const bookedSlots = ["8:00 AM", "9:30 AM", "12:00 PM", "2:30 PM", "5:00 PM", "7:30 PM"]

  const isSlotBooked = (slot: string) => bookedSlots.includes(slot)

  const toggleSlot = (slot: string) => {
    if (isSlotBooked(slot)) return

    setSelectedSlots((prev) => {
      // If slot is already selected, remove it
      if (prev.includes(slot)) {
        return prev.filter((s) => s !== slot)
      }

      // Check if the slot is adjacent to any already selected slot
      const isAdjacent = prev.some((selectedSlot) => {
        const selectedIndex = timeSlots.indexOf(selectedSlot)
        const currentIndex = timeSlots.indexOf(slot)
        return Math.abs(selectedIndex - currentIndex) === 1
      })

      // If no slots are selected yet or the new slot is adjacent to an existing one, add it
      if (prev.length === 0 || isAdjacent) {
        return [...prev, slot].sort((a, b) => {
          return timeSlots.indexOf(a) - timeSlots.indexOf(b)
        })
      }

      // Otherwise, replace all slots with just this one
      return [slot]
    })
  }

  const handleBooking = () => {
    if (selectedSlots.length === 0) return

    // In a real app, you would make an API call to create the booking
    // For this demo, we'll just navigate to the confirmation page with the booking details
    const bookingDetails = {
      sport,
      turfId,
      turfName: selectedTurf.name,
      date: date ? format(date, "yyyy-MM-dd") : "",
      slots: selectedSlots.join(","),
      price: totalPrice,
      bookingId: Math.random().toString(36).substring(2, 10).toUpperCase(),
    }

    // Encode the booking details as URL parameters
    const params = new URLSearchParams()
    Object.entries(bookingDetails).forEach(([key, value]) => {
      params.append(key, value.toString())
    })

    router.push(`/confirmation?${params.toString()}`)
  }

  // Group time slots by morning, afternoon, evening
  const morningSlots = timeSlots.filter((slot) => slot.includes("AM"))
  const afternoonSlots = timeSlots.filter((slot) => slot.includes("PM") && Number.parseInt(slot.split(":")[0]) < 5)
  const eveningSlots = timeSlots.filter((slot) => slot.includes("PM") && Number.parseInt(slot.split(":")[0]) >= 5)

  // Calculate the number of 30-minute periods
  const calculateNumberOfPeriods = () => {
    if (selectedSlots.length <= 1) return selectedSlots.length

    const firstSlotIndex = timeSlots.indexOf(selectedSlots[0])
    const lastSlotIndex = timeSlots.indexOf(selectedSlots[selectedSlots.length - 1])

    return lastSlotIndex - firstSlotIndex
  }

  return (
    <main className="container mx-auto px-6 py-12">
      <div className="mb-12 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" asChild className="gap-2 text-foreground">
            <Link href={`/turfs?sport=${sport}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to Turfs
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
            {sportNames[sport as keyof typeof sportNames]}
          </Badge>
        </div>

        <h1 className="text-4xl font-bold mb-6">Book Your Slot</h1>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Turf Info Card */}
        <Card className="mb-12 overflow-hidden shadow-md bg-card border-border rounded-3xl">
          <div className="md:flex">
            <div className="md:w-1/3">
              <img
                src={selectedTurf.image || "/placeholder.svg"}
                alt={selectedTurf.name}
                className="h-full w-full object-cover aspect-video md:aspect-auto"
              />
            </div>
            <div className="md:w-2/3 p-8">
              <h2 className="text-2xl font-bold mb-3">{selectedTurf.name}</h2>
              <div className="flex items-center text-muted-foreground mb-6 text-base">
                <MapPin className="h-5 w-5 mr-2" />
                <span>{selectedTurf.location}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Price per 30 min</p>
                  <p className="text-3xl font-bold text-primary">₹{selectedTurf.price}</p>
                </div>
                <Badge className="text-base bg-primary text-white hover:bg-mint-dark border-none px-3 py-1.5 rounded-full">
                  Available Now
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
          <Card className="shadow-md bg-card border-border rounded-3xl">
            <CardHeader className="pb-4 pt-6 px-8">
              <CardTitle className="flex items-center gap-3 text-xl">
                <CalendarIcon className="h-6 w-6 text-primary" />
                Select Date
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal py-6 text-base rounded-xl border-border bg-secondary text-foreground"
                  >
                    <CalendarIcon className="mr-3 h-5 w-5" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-border">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                    className="rounded-md border-border"
                  />
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>

          <Card className="shadow-md bg-card border-border rounded-3xl">
            <CardHeader className="pb-4 pt-6 px-8">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Clock className="h-6 w-6 text-primary" />
                Selected Time Slots
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              {selectedSlots.length > 0 ? (
                <div className="bg-secondary p-6 rounded-xl">
                  <p className="text-sm text-muted-foreground mb-2">Your selected time slots</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedSlots.map((slot) => (
                      <Badge key={slot} className="bg-primary text-white px-3 py-2 rounded-full text-base">
                        {slot}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {calculateNumberOfPeriods()} x 30 minute periods
                    {calculateNumberOfPeriods() > 1 && " (with multi-slot discount)"}
                  </p>
                </div>
              ) : (
                <div className="bg-secondary p-6 rounded-xl text-center">
                  <p className="text-primary text-base">Please select time slots below</p>
                  <p className="text-xs text-muted-foreground mt-2">You can select multiple adjacent slots</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mb-12 shadow-md bg-card border-border rounded-3xl">
          <CardHeader className="pb-4 pt-6 px-8">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Clock className="h-6 w-6 text-primary" />
              Available Time Slots
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Select multiple adjacent slots for longer booking periods
            </p>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <div className="space-y-8">
              <div>
                <h3 className="font-medium mb-4 text-lg text-muted-foreground">Morning</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {morningSlots.map((slot) => {
                    const isBooked = isSlotBooked(slot)
                    const isSelected = selectedSlots.includes(slot)
                    return (
                      <Button
                        key={slot}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "h-auto py-3 text-sm rounded-xl relative",
                          isBooked && "bg-secondary border-border text-foreground hover:bg-secondary/80",
                          isSelected && "bg-primary text-white border-primary",
                          !isSelected &&
                            !isBooked &&
                            "hover:border-primary hover:text-foreground bg-secondary border-border",
                        )}
                        disabled={isBooked}
                        onClick={() => toggleSlot(slot)}
                      >
                        {formatTimeSlotRange(slot)}
                        {isBooked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-secondary/90 rounded-xl">
                            <div className="flex items-center text-foreground font-medium">
                              <XCircle className="h-4 w-4 mr-1.5 text-foreground" />
                              Booked
                            </div>
                          </div>
                        )}
                      </Button>
                    )
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-4 text-lg text-muted-foreground">Afternoon</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {afternoonSlots.map((slot) => {
                    const isBooked = isSlotBooked(slot)
                    const isSelected = selectedSlots.includes(slot)
                    return (
                      <Button
                        key={slot}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "h-auto py-3 text-sm rounded-xl relative",
                          isBooked && "bg-secondary border-border text-foreground hover:bg-secondary/80",
                          isSelected && "bg-primary text-white border-primary",
                          !isSelected &&
                            !isBooked &&
                            "hover:border-primary hover:text-foreground bg-secondary border-border",
                        )}
                        disabled={isBooked}
                        onClick={() => toggleSlot(slot)}
                      >
                        {formatTimeSlotRange(slot)}
                        {isBooked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-secondary/90 rounded-xl">
                            <div className="flex items-center text-foreground font-medium">
                              <XCircle className="h-4 w-4 mr-1.5 text-foreground" />
                              Booked
                            </div>
                          </div>
                        )}
                      </Button>
                    )
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-4 text-lg text-muted-foreground">Evening</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {eveningSlots.map((slot) => {
                    const isBooked = isSlotBooked(slot)
                    const isSelected = selectedSlots.includes(slot)
                    return (
                      <Button
                        key={slot}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "h-auto py-3 text-sm rounded-xl relative",
                          isBooked && "bg-secondary border-border text-foreground hover:bg-secondary/80",
                          isSelected && "bg-primary text-white border-primary",
                          !isSelected &&
                            !isBooked &&
                            "hover:border-primary hover:text-foreground bg-secondary border-border",
                        )}
                        disabled={isBooked}
                        onClick={() => toggleSlot(slot)}
                      >
                        {formatTimeSlotRange(slot)}
                        {isBooked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-secondary/90 rounded-xl">
                            <div className="flex items-center text-foreground font-medium">
                              <XCircle className="h-4 w-4 mr-1.5 text-foreground" />
                              Booked
                            </div>
                          </div>
                        )}
                      </Button>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-12">
          <Card className="bg-card border-border shadow-md rounded-3xl">
            <CardContent className="p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Booking Summary</h3>
                  <div className="flex items-center gap-2 text-muted-foreground text-base">
                    <img
                      src={sportIcon || "/placeholder.svg"}
                      alt={sportNames[sport as keyof typeof sportNames]}
                      className="h-5 w-5"
                    />
                    <span>
                      {sportNames[sport as keyof typeof sportNames]} - {selectedTurf.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-base">
                    <CalendarIcon className="h-5 w-5" />
                    <span>{date ? format(date, "PPP") : "Select a date"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-base">
                    <Clock className="h-5 w-5" />
                    <span>
                      {selectedSlots.length > 0
                        ? `${selectedSlots[0]} - ${selectedSlots[selectedSlots.length - 1]} (${calculateNumberOfPeriods()} periods)`
                        : "Select time slot(s)"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base text-muted-foreground">Total Amount</p>
                  <p className="text-3xl font-bold text-primary">₹{totalPrice}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedSlots.length > 0 ? `${calculateNumberOfPeriods()} x 30 minutes` : "No slots selected"}
                  </p>
                </div>
              </div>
              <Button
                className="w-full bg-primary hover:bg-mint-dark text-white rounded-full"
                size="lg"
                disabled={!date || selectedSlots.length === 0}
                onClick={handleBooking}
              >
                Confirm Booking
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
