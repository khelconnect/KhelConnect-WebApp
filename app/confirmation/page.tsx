"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { MessageCircle, CheckCircle, Home, Calendar, Clock, MapPin, User, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format, parse } from "date-fns"
import Link from "next/link"

export default function WhatsAppConfirmationPage() {
  const searchParams = useSearchParams()
  const [messageSent, setMessageSent] = useState(false)
  const [slotDetails, setSlotDetails] = useState<Record<string, string>>({})
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

  const cleanSlotArray = bookingDetails.slots
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "")

  useEffect(() => {
    const sport = searchParams.get("sport") || ""
    const turfId = searchParams.get("turfId") || ""
    const turfName = searchParams.get("turfName") || ""
    const date = searchParams.get("date") || ""
    const slots = searchParams.get("slots") || ""
    const price = searchParams.get("price") || ""
    const bookingId = searchParams.get("bookingId") || ""
    const customerName = searchParams.get("customerName") || ""
    const customerEmail = searchParams.get("customerEmail") || ""
    const customerPhone = searchParams.get("customerPhone") || ""

    setBookingDetails({
      sport,
      turfId,
      turfName,
      date,
      slots,
      price,
      bookingId,
      customerName,
      customerEmail,
      customerPhone,
    })
  }, [searchParams])

  useEffect(() => {
    if (cleanSlotArray.length === 0) return

    const fetchSlotDetails = async () => {
      const { data, error } = await supabase
        .from("time_slots")
        .select("id, start_time, end_time")
        .in("id", cleanSlotArray)

      if (error) {
        console.error("Error fetching slot times:", error.message)
        return
      }

      const map: Record<string, string> = {}
      data?.forEach((slot) => {
        map[slot.id] = `${slot.start_time} - ${slot.end_time}`
      })
      setSlotDetails(map)
    }

    fetchSlotDetails()
  }, [bookingDetails.slots])

  useEffect(() => {
    if (bookingDetails.customerPhone && !messageSent) {
      const sendWhatsAppMessage = async () => {
        try {
          const response = await fetch("/api/send-whatsapp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerName: bookingDetails.customerName,
              customerPhone: bookingDetails.customerPhone,
              sport: bookingDetails.sport,
              turfName: bookingDetails.turfName,
              date: bookingDetails.date,
              bookingId: bookingDetails.bookingId,
              price: bookingDetails.price,
              slots: cleanSlotArray.map((slotId) => slotDetails[slotId] || slotId).join(", "),
              paymentLink: `https://rzp.io/l/${bookingDetails.bookingId}`,
            }),
          })
          if (response.ok) {
            setMessageSent(true)
            console.log("WhatsApp message sent successfully")
          } else {
            console.error("Failed to send WhatsApp message")
          }
        } catch (error) {
          console.error("Error sending WhatsApp message:", error)
        }
      }
      sendWhatsAppMessage()
    }
  }, [bookingDetails, messageSent, slotDetails])

  const formatDate = (dateString: string) => {
    try {
      const date = parse(dateString, "yyyy-MM-dd", new Date())
      return format(date, "EEE, dd MMM yyyy")
    } catch (error) {
      return dateString
    }
  }

  return (
    <main className="container mx-auto px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-6">
            <MessageCircle className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Booking Request Submitted!</h1>
          <p className="text-lg text-muted-foreground">
            We’ve sent a confirmation to your WhatsApp. Please check it for payment instructions.
          </p>
        </div>

        <Card className="mb-8 shadow-lg bg-card border-border rounded-3xl">
          <CardContent className="p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Booking Summary</h2>
              <Badge className="bg-green-500 text-white px-3 py-1.5 rounded-full">
                <CheckCircle className="h-4 w-4 mr-1.5" /> Submitted
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">{bookingDetails.customerName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Turf & Sport</p>
                <p className="font-medium">
                  {bookingDetails.sport} - {bookingDetails.turfName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">{formatDate(bookingDetails.date)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Time Slots</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {cleanSlotArray.map((slotId) => (
                    <Badge key={slotId} variant="outline" className="text-xs">
                      {slotDetails[slotId] || slotId}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Contact</p>
                <p className="font-medium">{bookingDetails.customerPhone}</p>
                <p className="text-sm text-muted-foreground">{bookingDetails.customerEmail}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Booking ID</p>
                <p className="font-mono font-medium">{bookingDetails.bookingId}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold text-primary">₹{bookingDetails.price}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center mt-4">
          <Button variant="outline" asChild className="py-6 px-8 rounded-full border-border">
            <Link href="/">
              <Home className="mr-2 h-5 w-5" /> Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
