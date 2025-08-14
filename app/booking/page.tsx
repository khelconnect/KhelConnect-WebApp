// Complete merged Booking Page UI + Supabase backend logic
"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils"
import { format, startOfDay, isBefore } from "date-fns";
import { supabase } from "@/lib/supabaseClient";
import {
  CalendarIcon,
  Clock,
  ArrowRight,
  ArrowLeft,
  MapPin,
  XCircle,
  User,
  Mail,
  Phone,
  Star,
} from "lucide-react";
import Link from "next/link";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const router = useRouter();
  const turfId = searchParams.get("turf") || "";
  const sport = searchParams.get("sport") || "football";

  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [turfInfo, setTurfInfo] = useState<Turf | null>(null);
  const [showPersonalDetailsModal, setShowPersonalDetailsModal] = useState(false);
  const [personalDetails, setPersonalDetails] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [existingUser, setExistingUser] = useState<any>(null);
  const [conflictFields, setConflictFields] = useState<{ name?: boolean; email?: boolean }>({});
  const [slotPrices, setSlotPrices] = useState<{ [slotId: string]: number }>({});



  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;

  const fetchTurfInfo = async () => {
    const { data, error } = await supabase
      .from("turfs")
      .select("id, name, image, location, rating, price")
      .eq("id", turfId)
      .single();

    if (!error && data) setTurfInfo(data);
  };

  const fetchBestPriceForSlot = async (slot: Slot): Promise<number> => {
  if (!turfId || !formattedDate || !selectedDate) return turfInfo?.price || 0;

  const weekday = selectedDate.getDay(); // 0 = Sunday, ..., 6 = Saturday
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const slotStart = slot.start_time;
  const slotEnd = slot.end_time;

  const { data: rules, error } = await supabase
    .from("turf_prices")
    .select("*")
    .eq("turf_id", turfId)
    .eq("sport", sport)
    .or(`slot_id.eq.${slot.id},day_of_week.eq.${weekday},date.eq.${dateStr},period.eq.${slot.period}`)
    .order("priority", { ascending: false }); // Highest priority first

  if (error) {
    console.error("Error fetching price rules:", error.message);
    return turfInfo?.price || 0;
  }

  
  const applicable = rules.find((rule) => {
    if (rule.slot_id && rule.slot_id !== slot.id) return false;
    if (rule.day_of_week !== null && rule.day_of_week !== weekday) return false;
    if (rule.date && rule.date !== dateStr) return false;

    if (rule.start_time && rule.end_time) {
      return slotStart >= rule.start_time && slotEnd <= rule.end_time;
    }

    if (rule.period && rule.period !== slot.period) return false;

    return true;
  });

  return applicable?.price ?? turfInfo?.price ?? 0;
};

const selectedObjs = selectedSlots
  .map(id => slots.find(s => s.id === id))
  .filter(Boolean)
  .sort((a, b) => a!.start_time.localeCompare(b!.start_time));

const contiguous = selectedObjs.every((s, i) =>
  i === 0 || selectedObjs[i-1]!.end_time === s!.start_time
);

const summaryText = selectedObjs.length
  ? (contiguous
     ? `${selectedObjs[0]!.start_time} - ${selectedObjs.at(-1)!.end_time}`
     : `${selectedObjs.length} slots selected`)
  : "Select time slot(s)";


  const fetchSlots = async () => {
  if (!turfId || !formattedDate || !selectedDate) return;
  setLoading(true);

  const { data: allSlots, error: slotError } = await supabase
    .from("time_slots")
    .select("*")
    .order("start_time", { ascending: true });

  if (slotError) {
    console.error("Error fetching slots:", slotError.message);
    setLoading(false);
    return;
  }

let query = supabase
  .from("bookings")
  .select("slot")
  .eq("turf_id", turfId)
  .eq("date", formattedDate);

if (sport) {
  query = query.eq("sport", sport);
}

const { data: existingBookings, error: bookingError } = await query;

  const bookedSlotIds = (existingBookings || []).flatMap((booking) => booking.slot);

  const slotsWithStatus = (allSlots || []).map((slot: any) => ({
    ...slot,
    isBooked: bookedSlotIds.includes(slot.id),
  }));

  setSlots(slotsWithStatus);

  // 🧠 Fetch all applicable pricing rules in one query
  const dayOfWeek = selectedDate.getDay();

  const { data: pricingRules, error: priceError } = await supabase
    .from("turf_prices")
    .select("*")
    .eq("turf_id", turfId)
    .eq("sport", sport);

  if (priceError) {
    console.error("Error fetching pricing rules:", priceError.message);
    setLoading(false);
    return;
  }

  // 🧠 Compute best price for each slot using turf_prices rules
  const priceMap: Record<string, number> = {};

  for (const slot of slotsWithStatus) {
    const applicablePrices = pricingRules
      .filter((rule) => {
        if (rule.slot_id && rule.slot_id === slot.id) return true;
        if (rule.date && rule.date === formattedDate) return true;
        if (rule.day_of_week !== null && rule.day_of_week === dayOfWeek) return true;
        if (
          rule.start_time &&
          rule.end_time &&
          slot.start_time >= rule.start_time &&
          slot.end_time <= rule.end_time
        )
          return true;
        if (rule.period && rule.period === slot.period) return true;
        return false;
      })
      .sort((a, b) => b.priority - a.priority); // Higher priority first

    if (applicablePrices.length > 0) {
      priceMap[slot.id] = applicablePrices[0].price;
    } else {
      priceMap[slot.id] = turfInfo?.price || 0; // fallback
    }
  }

  setSlotPrices(priceMap);
  setLoading(false);
};


useEffect(() => { if (turfId) fetchTurfInfo(); }, [turfId]);

useEffect(() => {
  if (turfInfo && formattedDate) fetchSlots();
}, [turfInfo, formattedDate, turfId, sport]);

const handleSlotToggle = async (id: string) => {
  const isSelected = selectedSlots.includes(id);

  if (isSelected) {
    setSelectedSlots((prev) => prev.filter((s) => s !== id));
  } else {
    setSelectedSlots((prev) => [...prev, id]);
  }
};


const handleConfirmBooking = async (customUserId?: string) => {
  if (!selectedDate || selectedSlots.length === 0 || !turfInfo) return;

const totalAmount = selectedSlots.reduce((sum, id) => sum + (slotPrices[id] || turfInfo.price), 0);



  const { data, error } = await supabase
    .from("bookings")
    .insert({
      turf_id: turfId,
      sport: sport,
      date: formattedDate,
      slot: selectedSlots,
      user_id: customUserId || userId || "00000000-0000-0000-0000-000000000000",
      payment_status: "pending",   // default
      status: "pending",           // default
      amount: totalAmount,         // ✅ new field added
    })
    .select()
    .single();

  if (!error && data) {
    const bookingId = Math.random().toString(36).substring(2, 10).toUpperCase();

    setSelectedSlots([]);
    setUserId(null);
    fetchSlots();

    // ✅ REDIRECT
    router.push(
      `/whatsapp-confirmation?` +
        new URLSearchParams({
          sport,
          turfId,
          turfName: turfInfo?.name || "",
          date: formattedDate || "",
          slots: selectedSlots.join(","),
          price: String(totalAmount),
          bookingId,
          customerName: personalDetails.name,
          customerEmail: personalDetails.email,
          customerPhone: personalDetails.phone,
        }).toString()
    );
  } else {
    console.error("Booking failed:", error?.message);
  }
};


const handlePersonalDetailsSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const { name, email, phone } = personalDetails;
  if (!name.trim() || !email.trim() || !phone.trim()) return;

  setIsSubmitting(true);

  // Check for existing user
  const { data: existingUsers, error: checkError } = await supabase
    .from("users")
    .select("*")
    .eq("phone", phone);

  if (checkError) {
    console.error("Error checking existing user:", checkError.message);
    setIsSubmitting(false);
    return;
  }

  const existing = existingUsers?.[0];

  if (existing) {
    // Check for conflicts
    const nameDiff = existing.name !== name;
    const emailDiff = existing.email !== email;

    if (nameDiff || emailDiff) {
      setExistingUser(existing);
      setConflictFields({ name: nameDiff, email: emailDiff });
      setShowConflictDialog(true);
      setIsSubmitting(false);
      return;
    }

    // No conflict, use existing
    setUserId(existing.id);
    setShowPersonalDetailsModal(false);
    setIsSubmitting(false);
    handleConfirmBooking(existing.id);
    return;
  }

  // No existing user, insert new
  const generatedUserId = crypto.randomUUID();
  const { error: insertError } = await supabase.from("users").insert({
    id: generatedUserId,
    name,
    email,
    phone,
  });

  if (insertError) {
    console.error("Error saving user details:", insertError.message);
    setIsSubmitting(false);
    return;
  }

  setUserId(generatedUserId);
  setShowPersonalDetailsModal(false);
  setIsSubmitting(false);
  handleConfirmBooking(generatedUserId);
};


  const handlePersonalDetailsChange = (field: string, value: string) => {
    setPersonalDetails((prev) => ({ ...prev, [field]: value }));
  };

  const groupedSlots: { [key: string]: Slot[] } = {
    day: [],
    evening: []
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
        <h1 className="text-2xl font-bold">Book Your Slot</h1>
      </div>

      {turfInfo && (
        <Card className="mb-12 overflow-hidden shadow-md bg-card border-border rounded-3xl">
  <div className="md:flex">
    {/* Image */}
    <div className="md:w-1/3">
      <img
        src={turfInfo.image}
        alt={turfInfo.name}
        className="h-full w-full object-cover aspect-video md:aspect-auto"
      />
    </div>

    {/* Content */}
    <div className="md:w-2/3 p-8">
      <h2 className="text-2xl font-bold mb-3">{turfInfo.name}</h2>
      <div className="flex items-center text-muted-foreground mb-6 text-base">
        <MapPin className="h-5 w-5 mr-2" />
        <span>{turfInfo.location}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Price per 30 min</p>
          <p className="text-3xl font-bold text-primary">₹{turfInfo.price}</p>
        </div>

        <div className="flex items-center gap-3">
          <Badge className="text-base bg-primary text-white hover:bg-mint-dark border-none px-3 py-1.5 rounded-full">
            Available Now
          </Badge>
          {/* {turfInfo.rating && (
            <div className="flex items-center text-sm text-yellow-600 font-medium">
              <Star className="h-4 w-4 mr-1" />
              {turfInfo.rating}
            </div>
          )} */}
        </div>
      </div>
    </div>
  </div>
</Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
  {/* Select Date Card */}
  <Card className="bg-card border-border rounded-3xl">
  <CardHeader className="pb-4 pt-6 px-8">
    <CardTitle className="flex items-center gap-3 text-xl">
      <CalendarIcon className="h-6 w-6 text-primary" />
      Select Date
    </CardTitle>
  </CardHeader>
  <CardContent className="px-8 pb-8">
    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal py-6 text-base rounded-xl border-border bg-secondary text-foreground"
        >
          <CalendarIcon className="mr-3 h-5 w-5" />
          {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-card border-border">
        <Calendar
          mode="single"
          selected={selectedDate!}
            onSelect={(selected) => {
              if (selected) {
                setSelectedDate(selected);
               setIsCalendarOpen(false); // Close popover after selection
              }
  }}
          initialFocus
          disabled={(date) => isBefore(date, startOfDay(new Date()))}
          className="rounded-md border-border"
        />
      </PopoverContent>
    </Popover>
  </CardContent>
</Card>

  {/* Selected Time Slots Card */}
  <Card className="bg-card border-border rounded-3xl">
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
            {selectedSlots.map((slotId) => {
              const slotObj = slots.find((s) => s.id === slotId);
              return (
                <Badge key={slotId} className="bg-primary text-white px-3 py-2 rounded-full text-base">
                  {slotObj?.start_time}
                </Badge>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground">{selectedSlots.length} × 30 minute periods</p>
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

      <Card className="mb-10 bg-card border-border rounded-3xl">
  <CardHeader className="pb-4 pt-6 px-8">
    <CardTitle className="flex items-center gap-3 text-xl">
      <Clock className="h-6 w-6 text-green-500" />
      Available Time Slots
    </CardTitle>
    <p className="text-sm text-muted-foreground mt-2">
      Select multiple adjacent slots for longer booking periods
    </p>
  </CardHeader>
  <CardContent className="px-8 pb-8">
    {loading ? (
      <p>Loading...</p>
    ) : (
      Object.keys(groupedSlots).map((period) => (
        <div key={period} className="mb-6">
          <h3 className="capitalize text-md font-medium mb-2 text-muted-foreground">{period}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
{groupedSlots[period].map((slot) => {
  const isSelected = selectedSlots.includes(slot.id);

  // Determine if slot is in the past (only if selected date is today)
  let isPast = false;
  if (selectedDate) {
    const today = new Date();
    const selected = new Date(selectedDate);
    if (
      selected.getFullYear() === today.getFullYear() &&
      selected.getMonth() === today.getMonth() &&
      selected.getDate() === today.getDate()
    ) {
      const [slotHour, slotMinute] = slot.start_time.split(":").map(Number);
      const slotDateTime = new Date(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate(),
        slotHour,
        slotMinute
      );
      isPast = slotDateTime < today;
    }
  }

  return (
<div key={slot.id} className="relative group">
<Button
  key={slot.id}
  variant={isSelected ? "default" : "outline"}
  className={cn(
    "h-auto py-3 text-sm rounded-xl relative justify-center w-full group",
    (slot.isBooked || isPast) &&
      "bg-secondary border-border text-muted-foreground cursor-not-allowed opacity-50",
    isSelected && "bg-primary text-white border-primary",
    !isSelected &&
      !slot.isBooked &&
      !isPast &&
      "hover:border-primary hover:text-foreground bg-secondary border-border"
  )}
  disabled={slot.isBooked || isPast}
  onClick={() => handleSlotToggle(slot.id)}
  onTouchEnd={(e) => {
    e.preventDefault();
    handleSlotToggle(slot.id);
  }}
>
  {/* 🕓 Time - show by default, hide on hover (desktop only) */}
  <span className="block sm:group-hover:hidden">
    {slot.start_time} - {slot.end_time}
  </span>

  {/* 💸 Price - hidden by default, show on hover (desktop only) */}
  <span className="hidden sm:group-hover:block font-semibold">
    ₹{slotPrices[slot.id] ?? turfInfo.price}
  </span>
</Button>


</div>


  );
})}

          </div>
        </div>
      ))
    )}
  </CardContent>
</Card>
{/* Booking Summary - visible on all devices */}
<div className="mb-32 md:mb-12"> {/* leave space for sticky bar */}
  <Card className="bg-card border-border shadow-md rounded-3xl">
    <CardContent className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold mb-2">Booking Summary</h3>
          <div className="flex items-center gap-2 text-muted-foreground text-base">
            <span>
              {sport.charAt(0).toUpperCase() + sport.slice(1)} - {turfInfo?.name}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-base">
            <CalendarIcon className="h-5 w-5" />
            <span>{selectedDate ? format(selectedDate, "PPP") : "Select a date"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-base">
            <Clock className="h-5 w-5" />
            <span>
              {selectedSlots.length > 0
                ? `${slots.find(s => s.id === selectedSlots[0])?.start_time} - ${slots.find(s => s.id === selectedSlots[selectedSlots.length - 1])?.end_time} (${selectedSlots.length} periods)`
                : "Select time slot(s)"}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-base text-muted-foreground">Total Amount</p>
          <p className="text-3xl font-bold text-primary">
            ₹{selectedSlots.reduce((sum, id) => sum + (slotPrices[id] || turfInfo?.price || 0), 0)}
          </p>
          <p className="text-sm text-muted-foreground">
            {selectedSlots.length > 0 ? `${selectedSlots.length} x 30 minutes` : "No slots selected"}
          </p>
        </div>
      </div>

      {/* Keep confirm button here for desktop */}
      <div className="hidden md:block">
        <Button
          className="w-full bg-primary hover:bg-mint-dark text-white rounded-full"
          size="lg"
          disabled={!selectedDate || selectedSlots.length === 0}
          onClick={() => setShowPersonalDetailsModal(true)}
        >
          Confirm Booking
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </CardContent>
  </Card>
</div>


{/* Mobile Sticky Total Bar
<div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg px-4 py-3 md:hidden">
  <div className="flex justify-between items-center">
    <div>
      <p className="text-sm text-muted-foreground">Total Amount</p>
      <p className="text-xl font-bold text-primary">
        ₹{selectedSlots.reduce((sum, id) => sum + (slotPrices[id] || turfInfo?.price || 0), 0)}
      </p>
    </div>
    <Button
      className="bg-primary hover:bg-mint-dark text-white rounded-full px-6 py-3"
      size="sm"
      disabled={!selectedDate || selectedSlots.length === 0}
      onClick={() => setShowPersonalDetailsModal(true)}
    >
      Confirm
      <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
  </div>
</div> */}




      {/* Modal */}
      <Dialog open={showPersonalDetailsModal} onOpenChange={setShowPersonalDetailsModal}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <User className="h-6 w-6 text-primary" /> Personal Details
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePersonalDetailsSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" type="text" value={personalDetails.name} onChange={(e) => handlePersonalDetailsChange("name", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input id="email" type="email" value={personalDetails.email} onChange={(e) => handlePersonalDetailsChange("email", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" type="tel" value={personalDetails.phone} onChange={(e) => handlePersonalDetailsChange("phone", e.target.value)} required />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowPersonalDetailsModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 bg-primary text-white">
                {isSubmitting ? "Processing..." : "Complete Booking"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
  <DialogContent className="sm:max-w-md bg-card border-border">
    <DialogHeader>
      <DialogTitle className="text-lg font-semibold">User Already Exists</DialogTitle>
    </DialogHeader>
    <p className="text-sm text-muted-foreground mb-4">
      A user with this phone number already exists.
    </p>
    <ul className="mb-4 text-sm">
      {conflictFields.name && (
        <li>
          <strong>Name:</strong> {existingUser?.name} → {personalDetails.name}
        </li>
      )}
      {conflictFields.email && (
        <li>
          <strong>Email:</strong> {existingUser?.email} → {personalDetails.email}
        </li>
      )}
    </ul>
    <div className="flex gap-3">
      <Button
        variant="outline"
        className="flex-1"
        onClick={() => {
          setUserId(existingUser.id);
          setShowConflictDialog(false);
          setShowPersonalDetailsModal(false);
          handleConfirmBooking(existingUser.id);
        }}
      >
        Keep Existing
      </Button>
      <Button
        className="flex-1 bg-primary text-white"
        onClick={async () => {
          const updates: any = {};
          if (conflictFields.name) updates.name = personalDetails.name;
          if (conflictFields.email) updates.email = personalDetails.email;

          await supabase.from("users").update(updates).eq("id", existingUser.id);
          setUserId(existingUser.id);
          setShowConflictDialog(false);
          setShowPersonalDetailsModal(false);
          handleConfirmBooking(existingUser.id);
        }}
      >
        Update Info
      </Button>
    </div>
  </DialogContent>
</Dialog>{/* Sticky Mobile Footer for Total & Confirm */}
<div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg px-4 py-3 md:hidden">
  <div className="flex justify-between items-center">
    <div>
      <p className="text-sm text-muted-foreground">Total</p>
      <p className="text-lg font-bold text-primary">
        ₹{selectedSlots.reduce((sum, id) => sum + (slotPrices[id] || turfInfo?.price || 0), 0)}
      </p>
    </div>
    <Button
      className="bg-primary hover:bg-mint-dark text-white rounded-full px-6 py-3"
      size="sm"
      disabled={!selectedDate || selectedSlots.length === 0}
      onClick={() => setShowPersonalDetailsModal(true)}
    >
      Confirm
      <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
  </div>
</div>

    </main>
  );
}
