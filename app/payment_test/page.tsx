'use client'

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { QrCode, Copy, CreditCard, MessageCircle, CheckCircle, AlertCircle,X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format, parse } from "date-fns"
import { toast } from "@/hooks/use-toast"
import Image from "next/image"
import { supabase } from "@/lib/supabaseClient" // ✅ make sure this import exists

export default function PaymentPage() {
  const searchParams = useSearchParams()
  const [copied, setCopied] = useState(false)
  const [showQRText, setShowQRText] = useState(false)

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
  
  const [showStatusPopup, setShowStatusPopup] = useState(false)
  const [paymentTimer, setPaymentTimer] = useState<NodeJS.Timeout | null>(null)

  const [slotTimes, setSlotTimes] = useState<Record<string, string>>({})

  const upiId = "9674785422.etb@icici"

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

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (paymentTimer) {
        clearTimeout(paymentTimer)
      }
    }
  }, [paymentTimer])

  // ✅ Fetch time slots on mount
  useEffect(() => {
    const fetchSlotTimes = async () => {
      const { data, error } = await supabase.from("time_slots").select("id, start_time, end_time")
      if (error) return
      const mapped = data.reduce((acc: Record<string, string>, slot) => {
        acc[slot.id] = `${slot.start_time} - ${slot.end_time}`
        return acc
      }, {})
      setSlotTimes(mapped)
    }
    fetchSlotTimes()
  }, [])

  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    try {
      const date = parse(dateString, "yyyy-MM-dd", new Date())
      return format(date, "EEE, dd MMM yyyy")
    } catch (error) {
      return dateString
    }
  }

  const slotArray = bookingDetails.slots
    ? bookingDetails.slots.split(",").map((s) => s.trim())
    : []

  const formatSlotRange = () => {
    if (slotArray.length === 0) return "-"
    const first = slotTimes[slotArray[0]] || slotArray[0]
    const last = slotTimes[slotArray[slotArray.length - 1]] || slotArray[slotArray.length - 1]
    return slotArray.length > 1 ? `${first} - ${last}` : first
  }

  const startPaymentTimer = () => {
    // Clear existing timer if any
    if (paymentTimer) {
      clearTimeout(paymentTimer)
    }

    // Set new timer for 15 seconds
    const timer = setTimeout(() => {
      setShowStatusPopup(true)
    }, 6000)

    setPaymentTimer(timer)
  }

  const handlePayAndCopy = async () => {
    try {
      await navigator.clipboard.writeText(upiId)
      toast({
        title: "Copied!",
        description: "UPI ID copied to clipboard",
      })
      setCopied(true)

      const upiUrl = `upi://pay`
      window.location.href = upiUrl

      setTimeout(() => setCopied(false), 1000)
      // Start timer after copy
      startPaymentTimer()
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy UPI ID",
        variant: "destructive",
      })
    }
  }

  const handleWhatsAppSupport = () => {
    const message = `Hi! I need help with payment for my booking:\n\nBooking ID: ${bookingDetails.bookingId}\nAmount: ₹${bookingDetails.price}`
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/919876543210?text=${encodedMessage}`
    window.open(whatsappUrl, "_blank")
  }

  const isMobile = typeof window !== "undefined" && /Mobi|Android/i.test(navigator.userAgent)

  const sportNames = {
    football: "Football",
    cricket: "Cricket",
    pickleball: "Pickleball",
    badminton: "Badminton",
    "table-tennis": "Table Tennis",
    basketball: "Basketball",
  }

  const closeStatusPopup = () => {
    setShowStatusPopup(false)
    if (paymentTimer) {
      clearTimeout(paymentTimer)
      setPaymentTimer(null)
    }
  }

  const checkBookingStatus = () => {
    // Simulate checking booking status
    alert("Checking your booking status... Please wait while we verify your payment.")
    closeStatusPopup()
  }

  return (
    <>
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
            <div className="flex justify-center">
              <div
                className="relative group p-2 bg-white rounded-xl shadow-lg cursor-pointer text-center transition-all"
                onClick={isMobile ? handlePayAndCopy : undefined}
                onMouseEnter={() => setShowQRText(true)}
                onMouseLeave={() => setShowQRText(false)}
              >
                <div className="w-48 h-48 rounded-xl overflow-hidden flex items-center justify-center bg-white">
                  {showQRText ? (
                    <div className="w-full h-full flex items-center justify-center text-sm font-medium text-primary text-center px-2">
                      Please scan this QR with your mobile device
                    </div>
                  ) : (
                    <Image
                      src="/assets/khelconnect_qr.jpeg"
                      alt="KhelConnect QR"
                      width={192}
                      height={192}
                      className="rounded-xl object-contain"
                    />
                  )}
                </div>
                <p className="text-xs text-center text-gray-500 mt-2">Tap to open UPI App</p>
              </div>
            </div>

            {/* UPI ID */}
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">Or pay directly using UPI ID:</p>
              <div
                className="flex items-center gap-2 p-3 bg-secondary rounded-xl"
                onClick={isMobile ? handlePayAndCopy : undefined}
              >
                <span className="flex-1 font-mono text-center cursor-pointer">{upiId}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePayAndCopy()
                  }}
                  className="shrink-0 bg-transparent"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600 transition-transform scale-110 duration-200" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
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
                  {sportNames[bookingDetails.sport as keyof typeof sportNames]} -{" "}
                  {bookingDetails.turfName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span>{formatDate(bookingDetails.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time:</span>
                <span>{formatSlotRange()}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-md font-semibold">Total Amount:</span>
                <span className="text-xl font-bold text-primary/60">₹{bookingDetails.price}</span>
              </div>
              <div className="flex justify-between items-center pt-0.01 border-t">
                <span className="text-md font-semibold">Amount to be paid at the turf:</span>
                <span className="text-xl font-bold text-primary/60">₹{Math.max(Number(bookingDetails.price) - 350, 0)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-lg font-semibold">Advance to be paid now:</span>
                <span className="text-2xl font-bold text-primary">₹350</span>
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
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 rounded-3xl">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Problem with Payment?</h3>
              <p className="text-green-700 dark:text-green-300 text-sm mb-4">
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
    {/* Booking Status Popup */}
      {showStatusPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 relative">
            <button
              onClick={closeStatusPopup}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>

              <h3 className="text-xl font-semibold mb-2">Check Your Booking Status</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Have you completed the payment? Let's verify your booking status to ensure everything is confirmed.
              </p>

              <div className="space-y-3">
                <Button
                  onClick={checkBookingStatus}
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-full py-3"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Check Booking Status
                </Button>

                <Button
                  onClick={() => { 
                    closeStatusPopup(); 
                    startPaymentTimer();
                  }}
                  variant="outline"
                  className="w-full rounded-full py-3 bg-transparent"
                >
                  Continue Payment
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
