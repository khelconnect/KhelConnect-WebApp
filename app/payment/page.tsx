"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { QrCode, Copy, CreditCard, MessageCircle, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format, parse } from "date-fns"
import { toast } from "@/hooks/use-toast"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"

export default function PaymentPage() {
  const searchParams = useSearchParams()
  const [copied, setCopied] = useState(false)
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

  const upiId = "9674785422.etb@icici"

  useEffect(() => {
    const details = {
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
    }
    setBookingDetails(details)
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

  const slotArray = bookingDetails.slots.split(",").map((s) => s.trim()).filter(Boolean)

  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(upiId)
      setCopied(true)
      toast({ title: "Copied!", description: "UPI ID copied to clipboard" })
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast({ title: "Error", description: "Failed to copy UPI ID", variant: "destructive" })
    }
  }

  const handlePayWithUPI = () => {
    // Redirect to UPI intent link (works only on supported devices/browsers)
    const upiLink = `upi://pay?pa=${upiId}&pn=KhelConnect&cu=INR&am=${bookingDetails.price}`
    window.location.href = upiLink
  }

  const handleWhatsAppSupport = () => {
    const msg = `Hi! I need help with payment for my booking:\n\nBooking ID: ${bookingDetails.bookingId}\nAmount: ₹${bookingDetails.price}\n\nPlease assist me with the payment process.`
    const encoded = encodeURIComponent(msg)
    window.open(`https://wa.me/919876543210?text=${encoded}`, "_blank")
  }

  return (
    <main className="container mx-auto px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <CreditCard className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Complete Payment</h1>
          <p className="text-muted-foreground">Secure your booking by completing the payment</p>
        </div>

        {/* UPI Payment Section */}
        <Card className="mb-6 rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Pay with UPI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center cursor-pointer" onClick={handlePayWithUPI}>
              <div className="bg-white p-4 rounded-2xl shadow-lg">
                <Image
                  src="/assets/khelconnect_qr.jpeg"
                  alt="UPI QR Code"
                  width={192}
                  height={192}
                  className="rounded-xl"
                />
                <p className="text-center text-xs text-gray-500 mt-2">Tap QR to open UPI app</p>
              </div>
            </div>

            {/* UPI ID */}
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">Or pay using UPI ID:</p>
              <div
                className="flex items-center gap-2 p-3 bg-secondary rounded-xl cursor-pointer"
                onClick={handlePayWithUPI}
              >
                <span className="flex-1 font-mono text-center">{upiId}</span>
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); copyUpiId() }}>
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.div
                        key="check"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                      >
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="copy"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                      >
                        <Copy className="h-4 w-4" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </div>
            </div>

            {/* Pay Button */}
            <Button
              onClick={handlePayWithUPI}
              className="w-full py-6 text-base rounded-full bg-primary hover:bg-primary/90"
            >
              <CreditCard className="mr-2 h-5 w-5" />
              Pay with UPI
            </Button>
          </CardContent>
        </Card>

        {/* Booking Summary */}
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
                  {slotArray[0]} - {slotArray[slotArray.length - 1]}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-lg font-semibold">Total Amount:</span>
                <span className="text-2xl font-bold text-primary">₹{bookingDetails.price}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Instructions */}
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
