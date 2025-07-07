"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import Image from "next/image"
import { QrCode, Copy, CreditCard, MessageCircle, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format, parse } from "date-fns"
import { toast } from "@/hooks/use-toast"

export default function PaymentPage() {
  const searchParams = useSearchParams()

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

  const upiId = "khelconnect@paytm"

  useEffect(() => {
    setBookingDetails({
      sport: searchParams.get("sport") || "",
      turfId: searchParams.get("turfId") || "",
      turfName: searchParams.get("turfName") || "",
      date: searchParams.get("date") || "",
      slots: searchParams.get("slots") || "",
      price: searchParams.get("price") || "",
      bookingId: searchParams.get("bookingId") || "",
      customerName: searchParams.get("customerName") || "",
      customerEmail: searchParams.get("customerEmail") || "",
      customerPhone: searchParams.get("customerPhone") || "",
    })
  }, [searchParams])

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
    } catch {
      return dateString
    }
  }

  const formatTime = (time: string) => {
    try {
      const parsed = parse(time, "HH:mm", new Date())
      return format(parsed, "hh:mm a")
    } catch {
      return time
    }
  }

  const slotArray = bookingDetails.slots ? bookingDetails.slots.split(",") : []

  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(upiId)
      toast({ title: "Copied!", description: "UPI ID copied to clipboard" })
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy UPI ID",
        variant: "destructive",
      })
    }
  }

  const handlePayWithUPI = () => {
    const intentUrl = `upi://pay?pa=${upiId}&pn=KhelConnect&mc=0000&tid=${bookingDetails.bookingId}&tr=${bookingDetails.bookingId}&tn=KhelConnect%20Booking&am=${bookingDetails.price}&cu=INR`

    if (typeof window !== "undefined") {
      window.location.href = intentUrl
    }
  }

  const handleWhatsAppSupport = () => {
    const message = `Hi! I need help with payment for my booking:\n\nBooking ID: ${bookingDetails.bookingId}\nAmount: ₹${bookingDetails.price}\n\nPlease assist me with the payment process.`
    const whatsappUrl = `https://wa.me/919876543210?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  return (
    <main className="container mx-auto px-6 py-12">
      <div className="max-w-2xl mx-auto">
        {/* ... unchanged content ... */}

        <Card className="mb-6 rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Booking Details</span>
              <Badge className="bg-orange-500 text-white">
                <AlertCircle className="h-4 w-4 mr-1" />
                Payment Pending
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Booking ID:</span>
                <span className="font-mono">{bookingDetails.bookingId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sport & Turf:</span>
                <span>
                  {sportNames[bookingDetails.sport as keyof typeof sportNames]} - {bookingDetails.turfName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span>{formatDate(bookingDetails.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time:</span>
                <span>
                  {formatTime(slotArray[0])} - {formatTime(slotArray[slotArray.length - 1])}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-lg font-semibold">Total Amount:</span>
                <span className="text-2xl font-bold text-primary">₹{bookingDetails.price}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <CheckCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>Payment Instructions:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Scan the QR code with any UPI app (GPay, PhonePe, Paytm, etc.)</li>
              <li>• Or copy the UPI ID and make payment manually</li>
              <li>• Enter the exact amount: ₹{bookingDetails.price}</li>
              <li>• Add your booking ID ({bookingDetails.bookingId}) in payment remarks</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* WhatsApp Support */}
        <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 rounded-3xl">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">Problem with Payment?</h3>
              <p className="text-red-700 dark:text-red-300 text-sm mb-4">
                Having trouble with the payment process? Our support team is here to help!
              </p>
              <Button
                onClick={handleWhatsAppSupport}
                className="bg-green-500 hover:bg-green-600 text-white rounded-full"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Chat with WhatsApp Support
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Payment issues? Call us at{" "}
            <a href="tel:+919876543210" className="text-primary hover:underline">
              +91 98765 43210
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}