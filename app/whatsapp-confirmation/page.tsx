"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { MessageCircle, CheckCircle, Home, Calendar, Clock, MapPin, User, Phone, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format, parse } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function WhatsAppConfirmationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [messageSent, setMessageSent] = useState(false)
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
    // Only send the message once, after bookingDetails is filled
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
              slots: bookingDetails.slots,
              paymentLink: `https://rzp.io/l/${bookingDetails.bookingId}`, // Customize this as needed
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
  }, [bookingDetails, messageSent])

  const slotArray = bookingDetails.slots ? bookingDetails.slots.split(",") : []

  const sportNames = {
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
    } catch (error) {
      return dateString
    }
  }

    const handleProceedToPayment = () => {
    const params = new URLSearchParams()
    Object.entries(bookingDetails).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    router.push(`/payment?${params.toString()}`)
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
            Your booking request has been received successfully.
          </p>
        </div>
        {/* Proceed to Payment */}
        <div className="flex flex-col gap-4">
          <Button
            onClick={handleProceedToPayment}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-base rounded-full"
          >
            <CreditCard className="mr-2 h-5 w-5" />
            Proceed to Payment
          </Button>

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
                  {sportNames[bookingDetails.sport as keyof typeof sportNames]} - {bookingDetails.turfName}
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
                  {slotArray.map((slot) => (
                    <Badge key={slot} variant="outline" className="text-xs">
                      {slot}
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

        {/* WhatsApp Instructions */}
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

        

        {/* Navigation */}
        <div className="flex justify-center mt-4">
          <Button variant="outline" asChild className="py-6 px-8 rounded-full border-border">
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
