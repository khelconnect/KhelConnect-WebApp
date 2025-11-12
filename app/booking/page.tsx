"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabaseClient";
import { format, startOfDay, isBefore, isSameDay } from "date-fns";
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
  Loader2, // Added Loader
  CheckCircle, // Added Check
} from "lucide-react";
import Link from "next/link";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Added CardDescription
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"; // Added DialogFooter

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

  // --- NEW: Reschedule Logic ---
  const rescheduleId = searchParams.get("reschedule_id");
  const slotCountParam = searchParams.get("slot_count");
  const requiredSlotCount = slotCountParam ? parseInt(slotCountParam, 10) : 0;
  const isRescheduleMode = !!rescheduleId && requiredSlotCount > 0;
  // --- END NEW ---

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
  
  // --- NEW: Reschedule Success Modal ---
  const [showRescheduleSuccessModal, setShowRescheduleSuccessModal] = useState(false);

  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;

  // --- MODIFIED: Pre-fill user data if rescheduling ---
  useEffect(() => {
    const initializePage = async () => {
      if (turfId) {
        fetchTurfInfo();
      }
      if (isRescheduleMode) {
        // Fetch the user data associated with the original booking
        setLoading(true);
        const { data: bookingData, error } = await supabase
          .from("bookings")
          .select("users ( name, email, phone )")
          .eq("id", rescheduleId)
          .single();
        
        if (bookingData?.users) {
          setPersonalDetails({
            name: bookingData.users.name,
            email: bookingData.users.email,
            phone: bookingData.users.phone,
          });
        }
        setLoading(false);
      }
    };
    initializePage();
  }, [turfId, isRescheduleMode, rescheduleId]);

  const fetchTurfInfo = async () => {
    const { data, error } = await supabase
      .from("turfs")
      .select("id, name, image, location, rating, price")
      .eq("id", turfId)
      .single();

    if (!error && data) setTurfInfo(data);
  };
  
  const fetchSlots = async () => {
    if (!turfId || !formattedDate || !selectedDate || !turfInfo) return;
    setLoading(true);

    try {
      const { data: allSlots, error: slotError } = await supabase
        .from("time_slots")
        .select("*")
        .order("start_time", { ascending: true });

      if (slotError) throw slotError;

      let query = supabase
        .from("bookings")
        .select("slot")
        .eq("turf_id", turfId)
        .eq("date", formattedDate)
        .eq("sport", sport)
        .not("status", "in", "('cancelled', 'completed')");

      const { data: existingBookings, error: bookingError } = await query;
      if (bookingError) throw bookingError;

      const bookedSlotIds = (existingBookings || []).flatMap((booking) => booking.slot);
      const slotsWithStatus = (allSlots || []).map((slot: any) => ({
        ...slot,
        isBooked: bookedSlotIds.includes(slot.id),
      }));

      setSlots(slotsWithStatus);

      // Price fetching logic
      const dayOfWeek = selectedDate.getDay();
      const { data: pricingRules, error: priceError } = await supabase
        .from("turf_prices")
        .select("*")
        .eq("turf_id", turfId)
        .eq("sport", sport);
      if (priceError) throw priceError;

      const priceMap: Record<string, number> = {};
      for (const slot of slotsWithStatus) {
        const applicablePrices = pricingRules
          .filter((rule) => {
            if (rule.date && rule.date !== formattedDate) return false;
            if (rule.day_of_week !== null && rule.day_of_week !== dayOfWeek) return false;
            if (rule.slot_id && rule.slot_id !== slot.id) return false;
            if (rule.period && rule.period !== slot.period) return false;
            if (rule.day_type) {
              const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
              if (rule.day_type === 'weekday' && isWeekend) return false;
              if (rule.day_type === 'weekend' && !isWeekend) return false;
            }
            if (rule.start_time && (!slot.start_time || slot.start_time < rule.start_time)) return false;
            if (rule.end_time && (!slot.end_time || slot.end_time > rule.end_time)) return false;
            return true; 
          })
          .sort((a, b) => b.priority - a.priority);
        
        if (applicablePrices.length > 0) {
          priceMap[slot.id] = applicablePrices[0].price;
        } else {
          priceMap[slot.id] = turfInfo.price;
        }
      }
      setSlotPrices(priceMap);
    } catch (error: any) {
      console.error("Error fetching slots or prices:", error.message);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (turfInfo && formattedDate) {
      setSelectedSlots([]); // Clear slots on date change
      fetchSlots();
    }
  }, [turfInfo, formattedDate, turfId, sport]); // Re-run if turfInfo is loaded

  // --- MODIFIED: Enforce slot count ---
  const handleSlotToggle = async (id: string) => {
    const isSelected = selectedSlots.includes(id);
    if (isSelected) {
      setSelectedSlots((prev) => prev.filter((s) => s !== id));
    } else {
      // --- NEW LOGIC ---
      if (isRescheduleMode && selectedSlots.length >= requiredSlotCount) {
        alert(`You can only select ${requiredSlotCount} slot(s) for this reschedule.`);
        return;
      }
      // --- END NEW LOGIC ---
      setSelectedSlots((prev) => [...prev, id]);
    }
  };

  // --- MODIFIED: Handle both new bookings and reschedules ---
  const handleConfirmBooking = async (customUserId?: string) => {
    if (!selectedDate || selectedSlots.length === 0 || !turfInfo || !formattedDate) return;

    const finalUserId = customUserId || userId;
    if (!finalUserId) {
      alert("User session error. Please try again.");
      return;
    }
    
    const totalAmount = selectedSlots.reduce((sum, id) => sum + (slotPrices[id] || turfInfo.price), 0);

    // --- NEW: Reschedule vs New Booking Logic ---
    if (isRescheduleMode) {
      // --- RESCHEDULE LOGIC ---
      setIsSubmitting(true);
      try {
        const { error } = await supabase
          .from("bookings")
          .update({
            date: formattedDate,
            slot: selectedSlots,
            amount: totalAmount,
            status: "pending", // Reset status
            payment_status: "pending", // Reset payment
            // user_id and turf_id remain the same
          })
          .eq("id", rescheduleId);

        if (error) throw error;

        // Show success modal
        setShowPersonalDetailsModal(false);
        setShowRescheduleSuccessModal(true);
        fetchSlots(); // Refresh slots in background

      } catch (error: any) {
        console.error("Reschedule failed:", error.message);
        alert("Reschedule failed: " + error.message);
      } finally {
        setIsSubmitting(false);
      }
      
    } else {
      // --- EXISTING NEW BOOKING LOGIC ---
      try {
        const { data, error } = await supabase
          .from("bookings")
          .insert({
            turf_id: turfId,
            sport: sport,
            date: formattedDate,
            slot: selectedSlots,
            user_id: finalUserId,
            payment_status: "pending",
            status: "pending",
            amount: totalAmount,
          })
          .select()
          .single();

        if (error) throw error;

        const bookingId = Math.random().toString(36).substring(2, 10).toUpperCase();
        setSelectedSlots([]);
        setUserId(null);
        fetchSlots();

        router.push(
          `/whatsapp-confirmation?` +
            new URLSearchParams({
              sport,
              turfId,
              turfName: turfInfo?.name || "",
              date: formattedDate,
              slots: selectedSlots.join(","), // You may want to convert these IDs to times
              price: String(totalAmount),
              bookingId,
              customerName: personalDetails.name,
              customerEmail: personalDetails.email,
              customerPhone: personalDetails.phone,
            }).toString()
        );
      } catch (error: any) {
        console.error("Booking failed:", error?.message);
        alert("Booking failed: " + error.message);
      }
    }
  };


  const handlePersonalDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, phone } = personalDetails;
    if (!name.trim() || !email.trim() || !phone.trim()) return;

    setIsSubmitting(true);

    try {
      const { data: existingUsers, error: checkError } = await supabase
        .from("users")
        .select("*")
        .eq("phone", phone);
      if (checkError) throw checkError;

      const existing = existingUsers?.[0];

      if (existing) {
        const nameDiff = existing.name !== name;
        const emailDiff = existing.email !== email;

        if ((nameDiff || emailDiff) && !isRescheduleMode) { // Don't show conflict on reschedule
          setExistingUser(existing);
          setConflictFields({ name: nameDiff, email: emailDiff });
          setShowConflictDialog(true);
          setIsSubmitting(false);
          return;
        }

        setUserId(existing.id);
        setShowPersonalDetailsModal(false);
        handleConfirmBooking(existing.id); // Pass ID
      } else {
        const { data: newUserData, error: insertError } = await supabase
          .from("users")
          .insert({ name, email, phone })
          .select("id")
          .single();
        if (insertError) throw insertError;
        
        setUserId(newUserData.id);
        setShowPersonalDetailsModal(false);
        handleConfirmBooking(newUserData.id); // Pass new ID
      }
    } catch (error: any) {
      console.error("Error saving user details:", error.message);
      alert("Error: " + error.message);
    } finally {
      // Only set submitting false if NOT in reschedule mode
      // (because reschedule mode has its own finally block)
      if (!isRescheduleMode) {
        setIsSubmitting(false);
      }
    }
  };


  const handlePersonalDetailsChange = (field: string, value: string) => {
    setPersonalDetails((prev) => ({ ...prev, [field]: value }));
  };

  const groupedSlots: { [key: string]: Slot[] } = { day: [], evening: [] };
  slots.forEach((slot) => {
    if (groupedSlots[slot.period]) groupedSlots[slot.period].push(slot);
    else groupedSlots.day.push(slot);
  });

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

  return (
    <main className="container mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-foreground">
          <Link href={isRescheduleMode ? "/my-bookings" : `/turfs?sport=${sport}`}>
            <ArrowLeft className="h-4 w-4" />
            {isRescheduleMode ? "Back to My Bookings" : "Back to Turfs"}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">
          {isRescheduleMode ? "Reschedule Your Slot" : "Book Your Slot"}
        </h1>
      </div>

      {turfInfo && (
        <Card className="mb-12 overflow-hidden shadow-md bg-card border-border rounded-3xl">
          <div className="md:flex">
            <div className="md:w-1/3">
              <img src={turfInfo.image} alt={turfInfo.name} className="h-full w-full object-cover aspect-video md:aspect-auto" />
            </div>
            <div className="md:w-2/3 p-8">
              <h2 className="text-2xl font-bold mb-3">{turfInfo.name}</h2>
              <div className="flex items-center text-muted-foreground mb-6 text-base">
                <MapPin className="h-5 w-5 mr-2" />
                <span>{turfInfo.location}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Price starts from</p>
                  <p className="text-3xl font-bold text-primary">₹{turfInfo.price}</p>
                </div>
                {turfInfo.rating && (
                  <div className="flex items-center text-lg font-medium text-primary">
                    <Star className="h-5 w-5 fill-primary mr-1" />
                    {turfInfo.rating}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {isRescheduleMode && (
        <Card className="mb-6 bg-yellow-500/10 border-yellow-500">
          <CardContent className="p-4 text-center text-yellow-700">
            <p className="font-semibold">Reschedule Mode</p>
            <p className="text-sm">You must select exactly **{requiredSlotCount}** new slot(s) to replace your old booking.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <Card className="bg-card border-border rounded-3xl">
          <CardHeader className="pb-4 pt-6 px-8"><CardTitle className="flex items-center gap-3 text-xl"><CalendarIcon className="h-6 w-6 text-primary" />Select Date</CardTitle></CardHeader>
          <CardContent className="px-8 pb-8">
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal py-6 text-base rounded-xl border-border bg-secondary text-foreground">
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
                      setIsCalendarOpen(false);
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

        <Card className="bg-card border-border rounded-3xl">
          <CardHeader className="pb-4 pt-6 px-8"><CardTitle className="flex items-center gap-3 text-xl"><Clock className="h-6 w-6 text-primary" />Selected Time Slots</CardTitle></CardHeader>
          <CardContent className="px-8 pb-8">
            {selectedSlots.length > 0 ? (
              <div className="bg-secondary p-6 rounded-xl">
                <p className="text-sm text-muted-foreground mb-2">Your selected time slots</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedObjs.map((slotObj) => (
                    <Badge key={slotObj!.id} className="bg-primary text-white px-3 py-2 rounded-full text-base">
                      {slotObj!.start_time}
                    </Badge>
                  ))}
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
          <CardTitle className="flex items-center gap-3 text-xl"><Clock className="h-6 w-6 text-green-500" />Available Time Slots</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Select {isRescheduleMode ? `exactly ${requiredSlotCount}` : "multiple adjacent"} slots for your booking.
          </p>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          {loading ? (
            <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            Object.keys(groupedSlots).map((period) => (
              <div key={period} className="mb-6">
                <h3 className="capitalize text-md font-medium mb-2 text-muted-foreground">{period}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {groupedSlots[period].map((slot) => {
                    const isSelected = selectedSlots.includes(slot.id);
                    let isPast = false;
                    if (selectedDate && isSameDay(selectedDate, new Date())) {
                      const [slotHour, slotMinute] = slot.start_time.split(":").map(Number);
                      const slotDateTime = new Date(selectedDate);
                      slotDateTime.setHours(slotHour, slotMinute, 0, 0);
                      isPast = slotDateTime < new Date();
                    }
                    return (
                      <div key={slot.id} className="relative group">
                        <Button
                          key={slot.id}
                          variant={isSelected ? "default" : "outline"}
                          className={cn(
                            "h-auto py-3 text-sm rounded-xl relative justify-center w-full group",
                            (slot.isBooked || isPast) && "bg-secondary border-border text-muted-foreground cursor-not-allowed opacity-50",
                            isSelected && "bg-primary text-white border-primary",
                            !isSelected && !slot.isBooked && !isPast && "hover:border-primary hover:text-foreground bg-secondary border-border"
                          )}
                          disabled={slot.isBooked || isPast}
                          onClick={() => handleSlotToggle(slot.id)}
                        >
                          <span className="block sm:group-hover:hidden">{slot.start_time} - {slot.end_time}</span>
                          <span className="hidden sm:group-hover:block font-semibold">₹{slotPrices[slot.id] ?? turfInfo?.price}</span>
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
      
      {/* Booking Summary */}
      <div className="mb-32 md:mb-12">
        <Card className="bg-card border-border shadow-md rounded-3xl">
          <CardContent className="p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Booking Summary</h3>
                <div className="flex items-center gap-2 text-muted-foreground text-base">
                  <span>{sport.charAt(0).toUpperCase() + sport.slice(1)} - {turfInfo?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-base">
                  <CalendarIcon className="h-5 w-5" />
                  <span>{selectedDate ? format(selectedDate, "PPP") : "Select a date"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-base">
                  <Clock className="h-5 w-5" />
                  <span>{summaryText}</span>
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
            
            {/* --- UPDATED: Disable button based on slot count --- */}
            <div className="hidden md:block">
              <Button
                className="w-full bg-primary hover:bg-mint-dark text-white rounded-full"
                size="lg"
                disabled={!selectedDate || selectedSlots.length === 0 || (isRescheduleMode && selectedSlots.length !== requiredSlotCount)}
                onClick={() => setShowPersonalDetailsModal(true)}
              >
                {isRescheduleMode ? "Confirm Reschedule" : "Confirm Booking"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sticky Mobile Footer */}
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
            // --- UPDATED: Disable button based on slot count ---
            disabled={!selectedDate || selectedSlots.length === 0 || (isRescheduleMode && selectedSlots.length !== requiredSlotCount)}
            onClick={() => setShowPersonalDetailsModal(true)}
          >
            {isRescheduleMode ? "Reschedule" : "Confirm"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Personal Details Modal */}
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
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                  isRescheduleMode ? "Complete Reschedule" : "Complete Booking"
                }
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Conflict Dialog */}
      <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">User Already Exists</DialogTitle>
            <DialogDescription>
              A user with this phone number already exists with different details.
            </DialogDescription>
          </DialogHeader>
          <ul className="mb-4 text-sm">
            {conflictFields.name && (
              <li><strong>Name:</strong> {existingUser?.name} → {personalDetails.name}</li>
            )}
            {conflictFields.email && (
              <li><strong>Email:</strong> {existingUser?.email} → {personalDetails.email}</li>
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
      </Dialog>
      
      {/* --- NEW: Reschedule Success Modal --- */}
      <Dialog open={showRescheduleSuccessModal} onOpenChange={() => router.push("/my-bookings")}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center text-primary">
              Booking Rescheduled!
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground pt-2">
              Your booking has been successfully updated with the new date and time.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          </div>
          <DialogFooter>
            <Button
              onClick={() => router.push("/my-bookings")}
              className="w-full"
            >
              View My Bookings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </main>
  );
}