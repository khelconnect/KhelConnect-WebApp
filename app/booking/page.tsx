"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowLeft, MapPin, Star } from "lucide-react";
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
  const turfId = searchParams.get("turf") || "";
  const sport = searchParams.get("sport") || "football";

  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [turfInfo, setTurfInfo] = useState<Turf | null>(null);

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

  alert("Booking successful!");
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

    window.location.href = `/confirmation?${query}`;
  }
};


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
    </main>
  );
}
