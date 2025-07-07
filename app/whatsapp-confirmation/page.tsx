"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import {
  MessageCircle,
  CheckCircle,
  Home,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  CreditCard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format, parse } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

interface TimeSlot {
  id: string
  start_time: string
  end_time: string
}

export default function WhatsAppConfirmationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [bookingDetails, setBookingDetails] = useState({
    sport: "",
    turfId: "",
    turfName: "",
    date: "",
    slots: "",
    price: "",
    bookingId: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
  })

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])

  // Fetch all time slots
  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase
        .from("time_slots")
        .select("id, start_time, end_time")
      if (!error && data) setTimeSlots(data)
    })()
  }, [])

  useEffect(() => {
    const keys = [
      "sport",
      "turfId",
      "turfName",
      "date",
      "slots",
      "price",
      "bookingId",
      "customerName",
      "customerEmail",
      "customerPhone",
    ] as const
    const updated: any = {}
    keys.forEach((k) => {
      updated[k] = searchParams.get(k) || ""
    })
    setBookingDetails(updated)
  }, [searchParams])

  const slotArray = bookingDetails.slots ? bookingDetails.slots.split(",") : []

  const sportNames: Record<string, string> = {
    football: "Football",
    cricket: "Cricket",
    pickleball: "Pickleball",
    badminton: "Badminton",
    "table-tennis": "Table Tennis",
    basketball: "Basketball",
  }

  const formatDate = (dateString: string) => {
    try {
      const date = parse(dateString, "yyyy-MM-dd", new Date())
      return format(date, "EEE, dd MMM yyyy")
    } catch {
      return dateString
    }
  }

  const handleProceedToPayment = () => {
    const params = new URLSearchParams()
    Object.entries(bookingDetails).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    router.push(`/payment?${params.toString()}`)
  }

  return (
    <main className="container mx-auto px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-6">
            <MessageCircle className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Booking Request Submitted!</h1>
          <p className="text-lg text-muted-foreground">
            Please follow the next steps below for payment.
          </p>
        </div>

        {/* Summary Card */}
        <Card className="mb-8 shadow-lg bg-card border-border rounded-3xl">
          <CardContent className="p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Booking Summary</h2>
              <Badge className="bg-green-500 text-white px-3 py-1.5 rounded-full">
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Submitted
              </Badge>
            </div>

            {/* Customer */}
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">{bookingDetails.customerName}</p>
              </div>
            </div>

            {/* Turf & Sport */}
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Turf & Sport</p>
                <p className="font-medium">
                  {sportNames[bookingDetails.sport] || bookingDetails.sport} –{" "}
                  {bookingDetails.turfName}
                </p>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">{formatDate(bookingDetails.date)}</p>
              </div>
            </div>

            {/* Slots */}
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Time Slots</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {slotArray.map((slotId) => {
                    const slot = timeSlots.find((s) => s.id === slotId)
                    const label = slot
                      ? `${slot.start_time}–${slot.end_time}`
                      : slotId
                    return (
                      <Badge key={slotId} variant="outline" className="text-xs">
                        {label}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Contact</p>
                <p className="font-medium">{bookingDetails.customerPhone}</p>
                <p className="text-sm text-muted-foreground">
                  {bookingDetails.customerEmail}
                </p>
              </div>
            </div>

            {/* Booking ID & Price */}
            <div className="mt-6 pt-6 border-t border-border flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Booking ID</p>
                <p className="font-mono font-medium">
                  {bookingDetails.bookingId}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold text-primary">
                  ₹{bookingDetails.price}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-8 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 rounded-3xl">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Next Steps</h3>
                <div className="space-y-2 text-green-700 dark:text-green-300">
                  <p>1. You will receive a WhatsApp message shortly with your booking details</p>
                  <p>2. Our team will confirm availability and share payment details</p>
                  <p>3. Complete payment via UPI/WhatsApp Pay to secure your booking</p>
                  <p>4. Receive final confirmation with venue details</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-4">
          <Button
            onClick={handleProceedToPayment}
            className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-full"
          >
            <CreditCard className="mr-2 h-5 w-5" />
            Proceed to Payment
          </Button>
          <Button variant="outline" asChild className="py-4 rounded-full border-border">
            <Link href="/">
              <Home className="mr-2 h-5 w-5" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
