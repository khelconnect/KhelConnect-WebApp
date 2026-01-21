"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils"
// 1. ADDED: Time utilities
import { format, startOfDay, isBefore, isSameDay, addDays, isAfter, differenceInSeconds, parseISO, addMinutes } from "date-fns";
import { supabase } from "@/lib/supabaseClient";
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import {
  CalendarIcon, Clock, ArrowRight, ArrowLeft, MapPin, Star, CheckCircle, LogIn, Info
} from "lucide-react";
import Link from "next/link";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { UniversalLoader } from "@/components/ui/universal-loader"

// --- TYPES ---
interface Slot {
  id: string;
  start_time: string;
  end_time: string;
  period: string;
  isBooked: boolean;
  // 2. ADDED: Tracking data for pending slots
  pendingCreatedAt?: string | null; 
}

interface Turf {
  id: string;
  name: string;
  image: string;
  location: string;
  rating: number;
  price: number;
  booking_window_days: number;
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
  
  // 3. ADDED: Real-time ticker for animations
  const [now, setNow] = useState(new Date());

  // UI State
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false); 
  const [showRescheduleSuccessModal, setShowRescheduleSuccessModal] = useState(false);

  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;

  // --- 4. ADDED: Ticker Effect ---
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000); // Update every second
    return () => clearInterval(interval);
  }, []);

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
        
        // Fetch bookings to check status
        supabase.from("bookings")
          .select("slot, status, created_at")
          .eq("turf_id", turfId)
          .eq("date", formattedDate)
          .eq("sport", sport)
          .in("status", ["confirmed", "pending"]), 

        supabase.from("turf_prices").select("*")
          .eq("turf_id", turfId).eq("sport", sport)
      ]);

      if (allSlotsResult.error) throw allSlotsResult.error;

      // Map bookings to slots
      const activeBookings = bookingsResult.data || [];
      
      const slotsWithStatus = (allSlotsResult.data || []).map((slot) => {
        // Find if this slot is part of any active booking
        const booking = activeBookings.find(b => b.slot.includes(slot.id));
        
        // It is "hard booked" if status is confirmed
        const isConfirmed = booking?.status === 'confirmed';
        
        // It is "pending" if status is pending (we will check time expiry in Render)
        const pendingCreatedAt = booking?.status === 'pending' ? booking.created_at : null;

        return {
          ...slot,
          isBooked: isConfirmed, // Base booked state (confirmed only)
          pendingCreatedAt: pendingCreatedAt // Store timestamp for dynamic calculation
        };
      });
      setSlots(slotsWithStatus);

      // Pricing Logic
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

  // --- CALCULATIONS FOR FOOTER ---
  const totalAmount = selectedSlots.reduce((sum, id) => sum + (slotPrices[id] || turfInfo?.price || 0), 0);
  const totalSlots = selectedSlots.length;

  return (
    <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-32">
      {isSubmitting && <UniversalLoader />}
      
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
        <Card className="mb-10 overflow-hidden shadow-lg bg-card border-border rounded-3xl">
          <div className="md:flex h-full">
            <div className="md:w-1/3 h-56 md:h-auto relative bg-secondary">
              <img src={turfInfo.image || "/placeholder-turf.jpg"} alt={turfInfo.name} className="absolute inset-0 w-full h-full object-cover transition-transform hover:scale-105 duration-500" />
              <div className="absolute top-4 left-4"><Badge className="bg-black/70 hover:bg-black/70 text-white backdrop-blur-md border-none">{sport.charAt(0).toUpperCase() + sport.slice(1)}</Badge></div>
            </div>
            <div className="md:w-2/3 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3"><h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{turfInfo.name}</h2>{turfInfo.rating && (<Badge variant="secondary" className="flex items-center gap-1.5 text-base px-3 py-1 bg-yellow-500/10 text-yellow-700 border-yellow-200"><Star className="h-4 w-4 fill-yellow-500 text-yellow-500" /><span className="font-bold">{turfInfo.rating}</span></Badge>)}</div>
                <div className="flex items-center text-muted-foreground mb-6"><MapPin className="h-4 w-4 mr-2 text-primary" /><span className="font-medium">{turfInfo.location}</span></div>
                <div className="grid grid-cols-2 gap-4 max-w-md"><div className="bg-secondary/30 p-3 rounded-xl border border-border"><p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Standard Rate</p><p className="text-2xl font-bold text-primary">₹{turfInfo.price}<span className="text-sm font-normal text-muted-foreground">/slot</span></p></div><div className="bg-secondary/30 p-3 rounded-xl border border-border flex flex-col justify-center"><p className="text-xs text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3"/> Booking Window</p><p className="font-medium text-foreground">{turfInfo.booking_window_days} Days Advance</p></div></div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Date & Selected Slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <Card className="bg-card border-border rounded-3xl shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><CalendarIcon className="h-5 w-5 text-primary" /> Select Date</CardTitle></CardHeader>
          <CardContent><Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal py-6 text-base rounded-xl border-2 hover:border-primary/50 transition-colors", !selectedDate && "text-muted-foreground")}><CalendarIcon className="mr-3 h-5 w-5 text-primary" />{selectedDate ? <span className="font-semibold text-foreground">{format(selectedDate, "PPPP")}</span> : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={selectedDate!} onSelect={(date) => { if (date) { setSelectedDate(date); setIsCalendarOpen(false); }}} disabled={(date) => { const today = startOfDay(new Date()); if (isBefore(date, today)) return true; if (turfInfo?.booking_window_days) { const maxDate = addDays(today, turfInfo.booking_window_days); if (isAfter(date, maxDate)) return true; } return false; }} className="rounded-md border" /></PopoverContent></Popover></CardContent>
        </Card>
        <Card className="bg-card border-border rounded-3xl shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Clock className="h-5 w-5 text-primary" /> Selected Slots</CardTitle></CardHeader>
          <CardContent>{selectedSlots.length > 0 ? (<div className="bg-primary/5 border border-primary/20 p-4 rounded-xl"><div className="flex flex-wrap gap-2 mb-3">{selectedObjs.map((s) => (<Badge key={s!.id} className="bg-primary text-primary-foreground px-3 py-1.5 text-sm rounded-lg shadow-sm">{s!.start_time} - {s!.end_time}</Badge>))}</div><div className="flex justify-between items-center pt-2 border-t border-primary/10"><p className="text-sm font-medium text-muted-foreground">Total: <span className="text-foreground">{selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''}</span></p><p className="text-lg font-bold text-primary">₹{totalAmount}</p></div></div>) : (<div className="bg-secondary/30 p-6 rounded-xl text-center border-2 border-dashed border-border flex flex-col items-center justify-center h-[120px]"><Clock className="h-8 w-8 text-muted-foreground/50 mb-2" /><p className="text-muted-foreground font-medium">No slots selected yet</p></div>)}</CardContent>
        </Card>
      </div>

      {/* Slots Grid */}
      <Card className="mb-10 bg-card border-border rounded-3xl shadow-sm">
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
             <CardTitle className="text-xl">Available Time Slots</CardTitle>
             <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full border border-primary bg-primary/20"></div> Available</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-primary"></div> Selected</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-secondary"></div> Booked</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full border-2 border-green-500 bg-secondary/50"></div> Pending</div>
             </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? ( <UniversalLoader /> ) : (
            <div className="space-y-10">
              {Object.keys(groupedSlots).map((period) => (
                <div key={period}>
                  <h3 className="capitalize text-sm font-bold text-primary mb-4 flex items-center gap-2">{period === 'day' ? <span className="text-orange-500">☀</span> : <span className="text-blue-500">☾</span>} {period} Slots</h3>
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
                      
                      // 5. DYNAMIC ROTATIONAL BORDER LOGIC
                      let isBlockedByPending = false;
                      let progressPercentage = 0;

                      if (slot.pendingCreatedAt) {
                         const secondsElapsed = differenceInSeconds(now, parseISO(slot.pendingCreatedAt));
                         const totalDuration = 5 * 60; // 5 minutes in seconds
                         
                         if (secondsElapsed < totalDuration) {
                             isBlockedByPending = true;
                             // Calculate percentage: 0s = 0%, 300s = 100%
                             progressPercentage = (secondsElapsed / totalDuration) * 100;
                         } else {
                             // Timer expired locally! Slot is free!
                             isBlockedByPending = false;
                         }
                      }

                      // Final "Booked" State: Confirmed OR (Pending AND Not Expired)
                      const isActuallyBooked = slot.isBooked || isBlockedByPending;
                      const price = slotPrices[slot.id] ?? turfInfo?.price;

                      return (
                        <Button
                          key={slot.id}
                          variant={isSelected ? "default" : "outline"}
                          className={cn(
                            "h-auto py-3 px-2 flex flex-col items-center justify-center rounded-xl transition-all border-2 relative overflow-hidden",
                            (isActuallyBooked && !isBlockedByPending) && "opacity-40 cursor-not-allowed bg-secondary border-transparent shadow-none",
                            isPast && "opacity-40 cursor-not-allowed bg-secondary border-transparent shadow-none",
                            
                            // 6. APPLY DYNAMIC BORDER FOR PENDING
                            // We use inline styles for the rotation, but base styles here
                            isBlockedByPending && "cursor-not-allowed bg-secondary/10 border-transparent",

                            !isActuallyBooked && !isPast && !isSelected && "hover:border-primary/50 hover:bg-secondary/50",
                            isSelected && "ring-0 border-primary bg-primary shadow-lg shadow-primary/20 scale-[1.02]"
                          )}
                          // 7. INLINE STYLE FOR CONIC GRADIENT
                          style={isBlockedByPending ? {
                              background: `
                                linear-gradient(var(--card), var(--card)) padding-box,
                                conic-gradient(#22c55e ${progressPercentage}%, transparent 0) border-box
                              `,
                              border: '2px solid transparent'
                          } : undefined}
                          disabled={isActuallyBooked || isPast}
                          onClick={(e) => { e.currentTarget.blur(); handleSlotToggle(slot.id); }}
                        >
                          <span className="text-sm font-bold">{slot.start_time}</span>
                          <span className={cn("text-xs mt-1 font-medium", isSelected ? "text-primary-foreground/90" : "text-muted-foreground")}>
                            {isBlockedByPending ? "Held" : `₹${price}`}
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
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border z-40 pb-safe">
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col"><p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">{totalSlots} Slot{totalSlots !== 1 ? 's' : ''} Selected</p><div className="flex items-baseline gap-2"><span className="text-2xl font-bold text-foreground">₹{totalAmount}</span>{totalSlots > 0 && (<span className="text-xs text-muted-foreground hidden sm:inline-block">(₹{Math.round(totalAmount / totalSlots)} / slot avg)</span>)}</div></div>
            <Button size="lg" className="rounded-xl px-8 sm:px-12 font-bold text-lg shadow-xl shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]" disabled={selectedSlots.length === 0 || isSubmitting || (isRescheduleMode && selectedSlots.length !== requiredSlotCount)} onClick={handleConfirmBooking}>{isRescheduleMode ? "Confirm Reschedule" : (<span className="flex items-center gap-2">Book Now <ArrowRight className="h-5 w-5" /></span>)}</Button>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle className="flex flex-col items-center gap-4 pt-4"><div className="p-4 bg-primary/10 rounded-full"><LogIn className="h-8 w-8 text-primary" /></div><span className="text-2xl">Login Required</span></DialogTitle><DialogDescription className="text-center text-base pt-2">You need to be logged in to book a turf. <br/>Don't worry, we've saved your slot selection!</DialogDescription></DialogHeader><div className="flex flex-col gap-3 pt-6"><Button size="lg" className="w-full rounded-xl" onClick={handleLoginRedirect}>Log In / Sign Up</Button><Button variant="ghost" onClick={() => setShowLoginModal(false)}>Cancel</Button></div></DialogContent></Dialog>
      <Dialog open={showRescheduleSuccessModal} onOpenChange={() => router.push("/my-bookings")}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle className="flex flex-col items-center gap-4 pt-4"><CheckCircle className="h-12 w-12 text-green-500" /><span className="text-2xl">Rescheduled!</span></DialogTitle><DialogDescription className="text-center text-base">Your booking has been successfully updated to the new time slot.</DialogDescription></DialogHeader><DialogFooter className="pt-4"><Button className="w-full" onClick={() => router.push("/my-bookings")}>View My Bookings</Button></DialogFooter></DialogContent></Dialog>
    </main>
  );
}