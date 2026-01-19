"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils"
// 1. ADDED: isAfter and addDays imports
import { format, startOfDay, isBefore, isSameDay, addDays, isAfter } from "date-fns";
import { supabase } from "@/lib/supabaseClient";
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import {
  CalendarIcon, Clock, ArrowRight, ArrowLeft, MapPin, Star, Loader2, CheckCircle, LogIn
} from "lucide-react";
import Link from "next/link";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// --- TYPES ---
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
  booking_window_days: number; // This value comes from the DB
}

interface UserSession {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    phone?: string;
  };
}

export default function BookingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Params
  const turfId = searchParams.get("turf") || "";
  const sport = searchParams.get("sport") || "football";
  
  // Reschedule Params
  const rescheduleId = searchParams.get("reschedule_id");
  const slotCountParam = searchParams.get("slot_count");
  const requiredSlotCount = slotCountParam ? parseInt(slotCountParam, 10) : 0;
  const isRescheduleMode = !!rescheduleId && requiredSlotCount > 0;

  // --- STATE ---
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [slotPrices, setSlotPrices] = useState<{ [slotId: string]: number }>({});
  const [turfInfo, setTurfInfo] = useState<Turf | null>(null);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false); 
  const [showRescheduleSuccessModal, setShowRescheduleSuccessModal] = useState(false);

  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;

  // --- 1. INITIALIZATION & RESTORE STATE ---
  useEffect(() => {
    const init = async () => {
      // A. Check Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUser(user);

      // B. Fetch Turf Info
      if (turfId) {
        const { data } = await supabase.from("turfs").select("*").eq("id", turfId).single();
        if (data) setTurfInfo(data);
      }

      // C. Restore Pending Booking
      const pendingData = localStorage.getItem("khelconnect_pending_booking");
      if (pendingData) {
        const parsed = JSON.parse(pendingData);
        if (parsed.turfId === turfId && parsed.sport === sport) {
          setSelectedDate(new Date(parsed.date));
          setSelectedSlots(parsed.slots);
          localStorage.removeItem("khelconnect_pending_booking");
        }
      }
    };
    init();
  }, [turfId, sport]);

  // --- 2. FETCH SLOTS & PRICING ---
  const fetchSlotsAndPrices = async () => {
    if (!turfId || !formattedDate || !selectedDate || !turfInfo) return;
    setLoading(true);

    try {
      const [allSlotsResult, bookingsResult, pricingResult] = await Promise.all([
        supabase.from("time_slots").select("*").order("start_time", { ascending: true }),
        supabase.from("bookings").select("slot")
          .eq("turf_id", turfId).eq("date", formattedDate).eq("sport", sport)
          .not("status", "in", "('cancelled', 'completed')"),
        supabase.from("turf_prices").select("*")
          .eq("turf_id", turfId).eq("sport", sport)
      ]);

      if (allSlotsResult.error) throw allSlotsResult.error;

      const bookedSlotIds = (bookingsResult.data || []).flatMap((b) => b.slot);
      const slotsWithStatus = (allSlotsResult.data || []).map((slot) => ({
        ...slot,
        isBooked: bookedSlotIds.includes(slot.id),
      }));
      setSlots(slotsWithStatus);

      const dayOfWeek = selectedDate.getDay();
      const priceMap: Record<string, number> = {};
      
      slotsWithStatus.forEach(slot => {
        const applicablePrices = (pricingResult.data || [])
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

        priceMap[slot.id] = applicablePrices.length > 0 ? applicablePrices[0].price : turfInfo.price;
      });
      setSlotPrices(priceMap);

    } catch (error) {
      console.error("Error loading slots:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (turfInfo && formattedDate) {
      const pendingData = localStorage.getItem("khelconnect_pending_booking");
      if(!pendingData) setSelectedSlots([]); 
      fetchSlotsAndPrices();
    }
  }, [turfInfo, formattedDate, turfId, sport]);


  // --- 3. SLOT SELECTION LOGIC ---
  const handleSlotToggle = (id: string) => {
    const clickedSlotIndex = slots.findIndex((s) => s.id === id);
    if (clickedSlotIndex === -1) return;

    const isSelected = selectedSlots.includes(id);

    if (isSelected) {
      const currentIndices = selectedSlots
        .map((sId) => slots.findIndex((s) => s.id === sId))
        .sort((a, b) => a - b);
      const minIdx = currentIndices[0];
      const maxIdx = currentIndices[currentIndices.length - 1];

      if (clickedSlotIndex === minIdx || clickedSlotIndex === maxIdx) {
        setSelectedSlots((prev) => prev.filter((s) => s !== id));
      } else {
        alert("Please deselect slots from the ends to keep the time block continuous.");
      }
    } else {
      if (selectedSlots.length === 0) {
        setSelectedSlots([id]);
        return;
      }

      const currentIndices = selectedSlots
        .map((sId) => slots.findIndex((s) => s.id === sId))
        .sort((a, b) => a - b);
      const minIdx = currentIndices[0];
      const maxIdx = currentIndices[currentIndices.length - 1];

      const isAdjacent = clickedSlotIndex === minIdx - 1 || clickedSlotIndex === maxIdx + 1;

      if (isAdjacent) {
        if (isRescheduleMode && selectedSlots.length >= requiredSlotCount) {
          alert(`You can only select exactly ${requiredSlotCount} slot(s) for this reschedule.`);
          return;
        }
        setSelectedSlots((prev) => [...prev, id]);
      } else {
        if (confirm("Non-consecutive slot selected. Start a new selection?")) {
          setSelectedSlots([id]);
        }
      }
    }
  };

  // --- 4. REDIRECT TO LOGIN ---
  const handleLoginRedirect = () => {
    const bookingState = {
      turfId,
      sport,
      date: selectedDate,
      slots: selectedSlots
    };
    localStorage.setItem("khelconnect_pending_booking", JSON.stringify(bookingState));
    router.push("/login");
  };

  // --- 5. BOOKING CONFIRMATION ---
  const handleConfirmBooking = async () => {
    if (!selectedDate || selectedSlots.length === 0 || !turfInfo || !formattedDate) return;

    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }

    const totalAmount = selectedSlots.reduce((sum, id) => sum + (slotPrices[id] || turfInfo.price), 0);
    setIsSubmitting(true);

    try {
      if (isRescheduleMode) {
        // Reschedule
        const { error } = await supabase
          .from("bookings")
          .update({
            date: formattedDate,
            slot: selectedSlots,
            amount: totalAmount,
            status: "pending",
            payment_status: "pending",
          })
          .eq("id", rescheduleId)
          .eq("user_id", currentUser.id);

        if (error) throw error;
        setShowRescheduleSuccessModal(true);
        fetchSlotsAndPrices();

      } else {
        // New Booking
        const { data: bookingData, error } = await supabase
          .from("bookings")
          .insert({
            turf_id: turfId,
            sport: sport,
            date: formattedDate,
            slot: selectedSlots,
            user_id: currentUser.id, 
            payment_status: "pending",
            status: "pending",
            amount: totalAmount,
          })
          .select("id")
          .single();

        if (error) throw error;

        let paymentUrl = "";
        const paymentPayload = {
            bookingId: bookingData.id,
            amount: totalAmount,
            customerName: currentUser.user_metadata?.full_name || "Valued Player",
            customerEmail: currentUser.email,
        };

        if (Capacitor.isNativePlatform()) {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://khelconnect.in";
            const response = await CapacitorHttp.post({
                url: `${baseUrl}/api/payment/create`,
                headers: { "Content-Type": "application/json" },
                data: paymentPayload
            });

            if (response.status !== 200) throw new Error("Native Payment API Error");
            paymentUrl = response.data.paymentUrl;
        } else {
            const response = await fetch("/api/payment/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(paymentPayload),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            paymentUrl = result.paymentUrl;
        }

        window.location.href = paymentUrl;
      }
    } catch (error: any) {
      console.error("Booking Error:", error);
      alert("Booking failed: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- UI HELPERS ---
  const groupedSlots: { [key: string]: Slot[] } = { day: [], evening: [] };
  slots.forEach((slot) => {
    if (groupedSlots[slot.period]) groupedSlots[slot.period].push(slot);
    else groupedSlots.day.push(slot); 
  });

  const selectedObjs = selectedSlots
    .map(id => slots.find(s => s.id === id))
    .filter(Boolean)
    .sort((a, b) => a!.start_time.localeCompare(b!.start_time));

  return (
    <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-32">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2 text-foreground/80 hover:text-foreground">
          <Link href={isRescheduleMode ? "/my-bookings" : `/turfs?sport=${sport}`}>
            <ArrowLeft className="h-4 w-4" />
            {isRescheduleMode ? "Back to My Bookings" : "Back to Turfs"}
          </Link>
        </Button>
      </div>
      <h1 className="text-3xl font-bold mb-8">
        {isRescheduleMode ? "Reschedule Your Slot" : "Book Your Slot"}
      </h1>

      {/* Turf Info Card */}
      {turfInfo && (
        <Card className="mb-10 overflow-hidden shadow-sm bg-card border-border rounded-3xl">
          <div className="md:flex">
            <div className="md:w-1/3 h-48 md:h-auto relative">
              <img src={turfInfo.image} alt={turfInfo.name} className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="md:w-2/3 p-6 sm:p-8">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-2xl font-bold">{turfInfo.name}</h2>
                {turfInfo.rating && (
                  <Badge variant="secondary" className="flex items-center gap-1 text-base px-3 py-1">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    {turfInfo.rating}
                  </Badge>
                )}
              </div>
              <div className="flex items-center text-muted-foreground mb-6">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{turfInfo.location}</span>
              </div>
              <p className="text-sm text-muted-foreground">Base Price</p>
              <p className="text-3xl font-bold text-primary">₹{turfInfo.price}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Date & Selected Slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        
        {/* Date Selector */}
        <Card className="bg-card border-border rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarIcon className="h-5 w-5 text-primary" /> Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn(
                  "w-full justify-start text-left font-normal py-6 text-base rounded-xl",
                  !selectedDate && "text-muted-foreground"
                )}>
                  <CalendarIcon className="mr-3 h-5 w-5" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate!}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setIsCalendarOpen(false);
                    }
                  }}
                  // --- FIX IMPLEMENTED HERE ---
                  disabled={(date) => {
                    const today = startOfDay(new Date());
                    // 1. Block past dates
                    if (isBefore(date, today)) return true;
                    
                    // 2. Block future dates based on turf settings
                    if (turfInfo?.booking_window_days) {
                      const maxDate = addDays(today, turfInfo.booking_window_days);
                      if (isAfter(date, maxDate)) return true;
                    }
                    
                    return false;
                  }}
                  className="rounded-md border"
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {/* Selected Slots Preview */}
        <Card className="bg-card border-border rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" /> Selected Slots
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedSlots.length > 0 ? (
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl">
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedObjs.map((s) => (
                    <Badge key={s!.id} className="bg-primary text-primary-foreground px-3 py-1 text-sm">
                      {s!.start_time} - {s!.end_time}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Total: {selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''}
                </p>
              </div>
            ) : (
              <div className="bg-secondary/50 p-6 rounded-xl text-center border border-dashed border-border">
                <p className="text-muted-foreground">No slots selected yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Slots Grid */}
      <Card className="mb-10 bg-card border-border rounded-3xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Available Time Slots</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-8">
              {Object.keys(groupedSlots).map((period) => (
                <div key={period}>
                  <h3 className="capitalize text-sm font-semibold text-muted-foreground mb-4 border-b pb-2">{period} Slots</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {groupedSlots[period].map((slot) => {
                      const isSelected = selectedSlots.includes(slot.id);
                      let isPast = false;
                      if (selectedDate && isSameDay(selectedDate, new Date())) {
                        const [h, m] = slot.start_time.split(":").map(Number);
                        const slotDate = new Date(selectedDate);
                        slotDate.setHours(h, m, 0, 0);
                        isPast = slotDate < new Date();
                      }

                      return (
                        <Button
                          key={slot.id}
                          variant={isSelected ? "default" : "outline"}
                          className={cn(
                            "h-auto py-3 px-2 flex flex-col items-center justify-center rounded-xl transition-all",
                            (slot.isBooked || isPast) && "opacity-40 cursor-not-allowed bg-secondary",
                            isSelected && "ring-2 ring-primary ring-offset-2"
                          )}
                          disabled={slot.isBooked || isPast}
                          onClick={() => handleSlotToggle(slot.id)}
                        >
                          <span className="text-sm font-medium">{slot.start_time}</span>
                          <span className="text-xs mt-1 text-muted-foreground font-normal">
                            ₹{slotPrices[slot.id] ?? turfInfo?.price}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border z-20">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold text-primary">
              ₹{selectedSlots.reduce((sum, id) => sum + (slotPrices[id] || turfInfo?.price || 0), 0)}
            </p>
          </div>
          <Button 
            size="lg" 
            className="rounded-full px-8 font-semibold shadow-lg shadow-primary/20"
            disabled={selectedSlots.length === 0 || isSubmitting || (isRescheduleMode && selectedSlots.length !== requiredSlotCount)}
            onClick={handleConfirmBooking}
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : isRescheduleMode ? "Confirm Reschedule" : "Book Now"}
          </Button>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Login Required Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex flex-col items-center gap-4 pt-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <LogIn className="h-8 w-8 text-primary" />
              </div>
              <span className="text-2xl">Login Required</span>
            </DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              You need to be logged in to book a turf. <br/>
              Don't worry, we've saved your slot selection!
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-6">
            <Button size="lg" className="w-full rounded-xl" onClick={handleLoginRedirect}>
              Log In / Sign Up
            </Button>
            <Button variant="ghost" onClick={() => setShowLoginModal(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Success Modal */}
      <Dialog open={showRescheduleSuccessModal} onOpenChange={() => router.push("/my-bookings")}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex flex-col items-center gap-4 pt-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <span className="text-2xl">Rescheduled!</span>
            </DialogTitle>
            <DialogDescription className="text-center text-base">
              Your booking has been successfully updated to the new time slot.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button className="w-full" onClick={() => router.push("/my-bookings")}>
              View My Bookings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </main>
  );
}