"use client";

import type React from "react"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format } from "date-fns";
import { CalendarIcon, Clock, ArrowRight, ArrowLeft, MapPin, XCircle, User, Mail, Phone, Star } from "lucide-react"
import Link from "next/link";

interface Slot {
  id: string;
  start_time: string;
  end_time: string;
  period: string;
  isBooked: boolean;
}

interface Turf {
  id: string;
  name: string;
  image: string;
  location: string;
  rating: number;
  price: number;
}

export default function BookingPage() {
  const searchParams = useSearchParams();
  const router = useRouter()
  const turfId = searchParams.get("turf") || "";
  const sport = searchParams.get("sport") || "football";

  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [turfInfo, setTurfInfo] = useState<Turf | null>(null);
    const [showPersonalDetailsModal, setShowPersonalDetailsModal] = useState(false)
  const [personalDetails, setPersonalDetails] = useState({
    name: "",
    email: "",
    phone: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;

  const fetchTurfInfo = async () => {
    const { data, error } = await supabase
      .from("turfs")
      .select("id, name, image, location, rating, price")
      .eq("id", turfId)
      .single();

    if (!error && data) {
      setTurfInfo(data);
    } else {
      console.error("Error fetching turf info:", error);
    }
  };

  const fetchSlots = async () => {
    if (!turfId || !formattedDate) return;
    setLoading(true);

    const { data: allSlots, error: slotError } = await supabase
      .from("time_slots")
      .select("*")
      .order("start_time", { ascending: true });

    if (slotError) {
      console.error("Error fetching time slots:", slotError);
      setSlots([]);
      setLoading(false);
      return;
    }

    const { data: existingBookings, error: bookingError } = await supabase
      .from("bookings")
      .select("slot")
      .eq("turf_id", turfId)
      .eq("date", formattedDate);

    if (bookingError) {
      console.error("Error fetching bookings:", bookingError);
      setSlots([]);
      setLoading(false);
      return;
    }

    const bookedSlotIds = (existingBookings || []).flatMap((booking) => booking.slot);

    const slotsWithStatus = (allSlots || []).map((slot: any) => ({
      ...slot,
      isBooked: bookedSlotIds.includes(slot.id),
    }));

    setSlots(slotsWithStatus);
    setLoading(false);
  };

  useEffect(() => {
    fetchTurfInfo();
    fetchSlots();
  }, [formattedDate]);

  const handleSlotToggle = (id: string) => {
    if (selectedSlots.includes(id)) {
      setSelectedSlots(selectedSlots.filter((s) => s !== id));
    } else {
      setSelectedSlots([...selectedSlots, id]);
    }
  };

 /*  const handleConfirmBooking = async () => {
  if (!selectedDate || selectedSlots.length === 0) return;

  const { data, error } = await supabase.from("bookings").insert({
    turf_id: turfId,
    date: formattedDate,
    slot: selectedSlots,
    user_id: "temp-user-id", // Replace with real user_id when using auth
  }).select("id").single(); // Get inserted booking's ID

  if (error) {
    console.error("Booking failed", error);
    return;
  }

  if (data?.id) {
    // Redirect to confirmation page with booking ID
    window.location.href = `/confirmation?bookingId=${data.id}`;
  } else {
    alert("Booking successful, but couldn't retrieve confirmation ID.");
    setSelectedSlots([]);
    fetchSlots();
  }
}; */

const handleConfirmBooking = async () => {
  if (!selectedDate || selectedSlots.length === 0) return;

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      turf_id: turfId,
      date: formattedDate,
      slot: selectedSlots,
      user_id: "00000000-0000-0000-0000-000000000000", // placeholder user id
    })
    .select()
    .single();

  if (error) {
    console.error("Booking failed", error);
    return;
  }

  setShowPersonalDetailsModal(true)
  setSelectedSlots([]);
  fetchSlots();

  // Redirect to confirmation page with booking details
  if (data) {
    const bookingId = data.id; // assuming 'id' is the booking primary key
    const query = new URLSearchParams({
      bookingId,
      sport,
      turfId,
      turfName: turfInfo?.name || "",
      date: formattedDate || "",
      slots: selectedSlots.join(","),
      price: turfInfo?.price?.toString() || "",
    }).toString();

    // window.location.href = `/confirmation?${query}`;
  }
};

const handlePersonalDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!personalDetails.name.trim() || !personalDetails.email.trim() || !personalDetails.phone.trim()) {
      return
    }

    setIsSubmitting(true)

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // In a real app, you would make an API call to create the booking
    // For this demo, we'll just navigate to the confirmation page with the booking details
    const bookingDetails = {
      sport,
      turfId,
      turfName: turfInfo?.name || "",
      date: formattedDate || "",
      slots: selectedSlots.join(","),
      price: turfInfo?.price?.toString() || "",
      bookingId: Math.random().toString(36).substring(2, 10).toUpperCase(),
      customerName: personalDetails.name,
      customerEmail: personalDetails.email,
      customerPhone: personalDetails.phone,
    }

    // Encode the booking details as URL parameters
    const params = new URLSearchParams()
    Object.entries(bookingDetails).forEach(([key, value]) => {
      params.append(key, value.toString())
    })

    setIsSubmitting(false)
    setShowPersonalDetailsModal(false)
    router.push(`/whatsapp-confirmation?${params.toString()}`)
  }

  const handlePersonalDetailsChange = (field: string, value: string) => {
    setPersonalDetails((prev) => ({
      ...prev,
      [field]: value,
    }))
  }





  const groupedSlots: { [key: string]: Slot[] } = {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
  };

  slots.forEach((slot) => {
    if (groupedSlots[slot.period]) groupedSlots[slot.period].push(slot);
  });

  return (
    <main className="container mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-foreground">
          <Link href={`/turfs?sport=${sport}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Turfs
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Booking Page</h1>
      </div>

      {turfInfo && (
        <Card className="mb-10">
          <div className="flex flex-col md:flex-row">
            <img
              src={turfInfo.image || "/placeholder.svg"}
              alt={turfInfo.name}
              className="w-full md:w-64 h-40 md:h-48 object-cover rounded-t-md md:rounded-l-md md:rounded-tr-none"
            />
            <CardContent className="p-6 w-full">
              <h2 className="text-xl font-semibold mb-1">{turfInfo.name}</h2>
              <div className="flex items-center text-muted-foreground text-sm mb-2">
                <MapPin className="h-4 w-4 mr-1" />
                {turfInfo.location}
              </div>
              <div className="flex items-center gap-4">
                <Badge className="bg-primary text-white px-3 py-1 rounded-full">
                  ₹{turfInfo.price} per session
                </Badge>
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-500 mr-1" />
                  {turfInfo.rating}
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div>
          <h2 className="text-lg font-semibold mb-2">Select Date:</h2>
          <Calendar mode="single" selected={selectedDate!} onSelect={setSelectedDate} className="rounded-md border" />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Available Time Slots:</h2>
          {loading ? (
            <p>Loading slots...</p>
          ) : (
            Object.keys(groupedSlots).map((period) => (
              <div key={period} className="mb-6">
                <h3 className="capitalize text-md font-medium mb-2">{period}</h3>
                <div className="flex flex-wrap gap-3">
                  {groupedSlots[period].length === 0 ? (
                    <p className="text-sm text-muted-foreground">No slots</p>
                  ) : (
                    groupedSlots[period].map((slot) => (
                      <Badge
                        key={slot.id}
                        variant={slot.isBooked ? "outline" : selectedSlots.includes(slot.id) ? "default" : "secondary"}
                        className={`cursor-pointer px-4 py-2 ${slot.isBooked ? "opacity-50 pointer-events-none" : ""}`}
                        onClick={() => handleSlotToggle(slot.id)}
                      >
                        {slot.start_time} - {slot.end_time}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            ))
          )}

          <Button className="mt-4" disabled={selectedSlots.length === 0} onClick={handleConfirmBooking}>
            Confirm Booking
          </Button>
        </div>
      </div>

      
      {/* Personal Details Modal */}
      <Dialog open={showPersonalDetailsModal} onOpenChange={setShowPersonalDetailsModal}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <User className="h-6 w-6 text-primary" />
              Personal Details
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePersonalDetailsSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Full Name *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={personalDetails.name}
                    onChange={(e) => handlePersonalDetailsChange("name", e.target.value)}
                    className="pl-10 py-3 rounded-xl border-border bg-secondary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={personalDetails.email}
                    onChange={(e) => handlePersonalDetailsChange("email", e.target.value)}
                    className="pl-10 py-3 rounded-xl border-border bg-secondary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone Number *
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={personalDetails.phone}
                    onChange={(e) => handlePersonalDetailsChange("phone", e.target.value)}
                    className="pl-10 py-3 rounded-xl border-border bg-secondary"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPersonalDetailsModal(false)}
                className="flex-1 py-3 rounded-xl border-border"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-mint-dark text-white py-3 rounded-xl"
                disabled={
                  isSubmitting ||
                  !personalDetails.name.trim() ||
                  !personalDetails.email.trim() ||
                  !personalDetails.phone.trim()
                }
              >
                {isSubmitting ? "Processing..." : "Complete Booking"}
                {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
