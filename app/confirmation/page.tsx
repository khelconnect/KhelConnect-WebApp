"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Download,
  Share2,
  CheckCircle,
  Home,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format, parse } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function ConfirmationPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId") || "";
  const sportParam = searchParams.get("sport") || "";

  const [bookingDetails, setBookingDetails] = useState<{
    sport: string;
    turfId: string;
    turfName: string;
    date: string;
    slots: string;
    price: string;
    bookingId: string;
  } | null>(null);

  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!bookingId) return;

    async function fetchBooking() {
      const { data: booking, error } = await supabase
        .from("bookings")
        .select("id, turf_id, date, slot, user_id, created_at, turf:turfs(name, price, sport)")
        .eq("id", bookingId)
        .single();

      if (error || !booking) {
        console.error("Failed to fetch booking:", error);
        return;
      }

      const turf = booking.turf || {};

      setBookingDetails({
        sport: sportParam || turf.sport || "",
        turfId: booking.turf_id,
        turfName: turf.name || "",
        date: booking.date,
        slots: booking.slot,
        price: turf.price ? turf.price.toString() : "",
        bookingId: booking.id,
      });
    }

    fetchBooking();
  }, [bookingId, sportParam, supabase]);

  const ticketRef = useRef<HTMLDivElement>(null);

  const sportNames = {
    football: "Football",
    cricket: "Cricket",
    pickleball: "Pickleball",
    badminton: "Badminton",
    "table-tennis": "Table Tennis",
    basketball: "Basketball",
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = parse(dateString, "yyyy-MM-dd", new Date());
      return format(date, "EEE, dd MMM yyyy");
    } catch (error) {
      return dateString;
    }
  };

  const handleDownload = () => {
    alert("Ticket download functionality would be implemented here");
  };

  const handleShare = () => {
    alert("Sharing functionality would be implemented here");
  };

  if (!bookingDetails) {
    return (
      <main className="container mx-auto px-6 py-12 text-center">
        <p className="text-lg">Loading booking details...</p>
      </main>
    );
  }

  const slotArray = bookingDetails.slots ? bookingDetails.slots.split(",") : [];

  return (
    <main className="container mx-auto px-6 py-12">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-10">
          <Button variant="ghost" size="sm" asChild className="gap-2 text-foreground">
            <Link href="/">
              <Home className="h-4 w-4" /> Home
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="gap-2 text-foreground">
            <Link href={`/turfs?sport=${bookingDetails.sport}`}>
              <ArrowLeft className="h-4 w-4" /> Book Another
            </Link>
          </Button>
        </div>

        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-full mb-6">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Booking Confirmed!</h1>
          <p className="text-muted-foreground text-lg">Your turf has been booked successfully.</p>
        </div>

        <div ref={ticketRef} className="mb-10">
          <Card className="overflow-hidden border-2 border-primary shadow-xl bg-card rounded-3xl">
            <div className="mint-gradient text-white p-6 text-center relative">
              <div className="absolute left-0 bottom-0 w-6 h-6 bg-background rounded-tr-full"></div>
              <div className="absolute right-0 bottom-0 w-6 h-6 bg-background rounded-tl-full"></div>

              <h2 className="text-2xl font-bold">
                {sportNames[bookingDetails.sport as keyof typeof sportNames]} Turf Booking
              </h2>
              <p className="text-base">Booking ID: {bookingDetails.bookingId}</p>
            </div>

            <CardContent className="p-8">
              <div className="flex justify-between items-center mb-6 pb-6 border-b border-border">
                <div>
                  <p className="text-base text-muted-foreground">Turf</p>
                  <p className="font-semibold text-lg">{bookingDetails.turfName}</p>
                </div>
                <div className="text-right">
                  <p className="text-base text-muted-foreground">Amount Paid</p>
                  <p className="font-semibold text-lg text-primary">₹{bookingDetails.price}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <CalendarIcon className="h-6 w-6 text-primary shrink-0 mt-1" />
                  <div>
                    <p className="text-base text-muted-foreground">Date</p>
                    <p className="font-medium text-lg">{formatDate(bookingDetails.date)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Clock className="h-6 w-6 text-primary shrink-0 mt-1" />
                  <div>
                    <p className="text-base text-muted-foreground">Time Slots</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {slotArray.map((slot) => (
                        <Badge key={slot} className="bg-secondary text-primary px-2 py-1 rounded-full">
                          {slot}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{slotArray.length} x 30 minute sessions</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MapPin className="h-6 w-6 text-primary shrink-0 mt-1" />
                  <div>
                    <p className="text-base text-muted-foreground">Sport</p>
                    <p className="font-medium text-lg">
                      {sportNames[bookingDetails.sport as keyof typeof sportNames]}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <div className="bg-secondary w-48 h-48 flex items-center justify-center rounded-lg border border-border">
                  <span className="text-sm text-muted-foreground">QR Code</span>
                </div>
              </div>

              <p className="text-center text-base text-muted-foreground mt-6">Please show this ticket at the venue</p>
            </CardContent>

            <div className="bg-secondary p-6 flex justify-between items-center relative">
              <div className="absolute left-0 top-0 w-6 h-6 bg-background rounded-br-full"></div>
              <div className="absolute right-0 top-0 w-6 h-6 bg-background rounded-bl-full"></div>

              <p className="text-base text-center w-full">Thank you for booking with Khelconnect</p>
            </div>
          </Card>
        </div>

        <div className="flex gap-6">
          <Button
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-base rounded-full"
            onClick={handleDownload}
          >
            <Download className="mr-2 h-5 w-5" /> Download Ticket
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-primary text-primary hover:bg-secondary py-6 text-base rounded-full"
            onClick={handleShare}
          >
            <Share2 className="mr-2 h-5 w-5" /> Share
          </Button>
        </div>
      </div>
    </main>
  );
}
