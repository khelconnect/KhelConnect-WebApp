"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format, isPast, isToday, differenceInHours, addDays, isAfter, differenceInMinutes } from 'date-fns';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from "@/lib/userStore";
import { 
  Loader2, ArrowLeft, Calendar, Clock, DollarSign
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// --- TYPES ---
interface DetailedBooking {
  id: string;
  date: string;
  slot: string[];
  created_at: string;
  amount: number;
  status: string;
  payment_status: string;
  sport: string;
  turf_id: string;
  reschedule_count: number;
  turfs: {
    name: string;
    allow_rescheduling: boolean;
    allow_refunds: boolean;
    reschedule_window_days: number;
  } | null;
}

interface TimeSlot {
  id: string;
  time: string;
}

// --- MAIN COMPONENT ---
export default function MyBookingsPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<DetailedBooking[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for mapping slot IDs to times
  const [timeSlots, setTimeSlots] = useState<Map<string, string>>(new Map());
  
  const router = useRouter();

  // 1. Fetch time slots once on mount
  useEffect(() => {
    const fetchTimeSlots = async () => {
      try {
        const { data, error } = await supabase
          .from("time_slots")
          .select("id, start_time, period");
        if (error) throw error;
        
        const slotMap = new Map<string, string>();
        data.forEach(slot => {
          slotMap.set(slot.id, `${slot.start_time}${slot.period ? ` ${slot.period}` : ""}`);
        });
        setTimeSlots(slotMap);
      } catch (error: any) {
        console.error("Error fetching time slots:", error.message);
      }
    };
    fetchTimeSlots();
  }, []);
  
  // 2. Optimized booking fetch function with Auto-Cleanup
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    setBookings([]);

    try {
      // First, get the user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, name')
        .eq('phone', phone)
        .single();

      if (userError || !user) {
        throw new Error('No user found with this phone number.');
      }

      setUserId(user.id);
      useUserStore.getState().setName(user.name);

      // THEN, get all bookings for that user
      const { data: userBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, date, slot, created_at, amount, status, payment_status, sport, turf_id, reschedule_count, turfs(name, allow_rescheduling, allow_refunds, reschedule_window_days)')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (bookingsError) {
        throw new Error('Could not fetch bookings.');
      }

      const allBookings = (userBookings as DetailedBooking[]) || [];
      const now = new Date();
      const updatedBookings = [];

      // --- AUTO-CANCEL EXPIRED PENDING BOOKINGS ---
      // This frees up the slot immediately if the Cron job hasn't run yet
      for (const b of allBookings) {
        // If pending and older than 15 minutes
        if (b.status === 'pending' && b.payment_status === 'pending') {
          const createdTime = new Date(b.created_at);
          const minutesDiff = differenceInMinutes(now, createdTime);
          
          if (minutesDiff > 15) {
             // It's expired. Mark it locally as cancelled/expired so it moves to History
             // and fire a background request to update DB to free the slot.
             const expiredBooking = { ...b, status: 'cancelled', payment_status: 'n/a' }; // UI shows as Cancelled/Expired
             updatedBookings.push(expiredBooking);
             
             // Fire and forget update
             supabase.from('bookings').update({ status: 'cancelled', payment_status: 'n/a' }).eq('id', b.id).then(({ error }) => {
               if(error) console.error("Auto-cancel failed for", b.id, error);
             });
             continue;
          }
        }
        updatedBookings.push(b);
      }

      setBookings(updatedBookings);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [phone]);

  // 3. New Reschedule Handler
  const handleReschedule = useCallback((booking: DetailedBooking) => {
    if (!booking) return;
    
    router.push(
      `/booking?sport=${booking.sport}` +
      `&turf=${booking.turf_id}` +
      `&reschedule_id=${booking.id}` +
      `&slot_count=${booking.slot.length}`
    );
  }, [router]);

  // 4. Cancel Handler (Updated Logic)
  const handleConfirmCancel = useCallback(async (booking: DetailedBooking) => {
    const ADVANCE_AMOUNT = 350; 
    let confirmMsg = "";
    let refundAmount = 0;
    
    // 1. Check Turf Policy
    if (!booking.turfs?.allow_refunds) {
        confirmMsg = `This turf has a strict No Refund policy. If you cancel, you will NOT receive a refund. Proceed?`;
        refundAmount = 0;
    } else {
        // 2. Check Time Window (24 hours)
        const bookingDate = new Date(booking.date);
        const hoursDiff = differenceInHours(bookingDate, new Date());
        
        if (hoursDiff < 24) {
             confirmMsg = `Cancellation is within 24 hours. A fee applies (No Refund of Advance). Proceed?`;
             refundAmount = 0;
        } else {
             // 3. Check Payment Status
             if (booking.payment_status === 'paid') {
                 confirmMsg = `You are eligible for a refund of ₹${ADVANCE_AMOUNT}. Proceed to cancel?`;
                 refundAmount = ADVANCE_AMOUNT;
             } else {
                 confirmMsg = "Cancel this booking?";
                 refundAmount = 0;
             }
        }
    }

    if (!confirm(confirmMsg)) return;
    
    // 4. Determine new Payment Status
    const newPaymentStatus = refundAmount > 0 ? 'refund_initiated' : 'n/a';

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
            status: 'cancelled', 
            payment_status: newPaymentStatus,
            refund_amount: refundAmount
        })
        .eq('id', booking.id);
      
      if (error) throw error;
      fetchBookings();
    } catch (error: any) {
      console.error("Error cancelling booking:", error.message);
      setError("Failed to cancel booking. Please try again.");
    } finally { setIsSubmitting(false); }
  }, [fetchBookings]);

  // 5. Helper to convert slot IDs to times
  const getSlotTimes = useCallback((slotIds: string[]): string => {
    if (timeSlots.size === 0) return "Loading times...";
    const times = slotIds.map(id => timeSlots.get(id) || "Unknown");
    return times.join(', ');
  }, [timeSlots]);

  // 6. Memoized filters for tabs
  const { upcomingBookings, pastBookings } = useMemo(() => {
    const now = new Date();
    const upcoming: DetailedBooking[] = [];
    const past: DetailedBooking[] = [];

    bookings.forEach(b => {
      const bookingDate = new Date(b.date);
      // Explicitly check for cancelled status to move to history immediately
      if (b.status === 'cancelled' || b.status === 'completed') {
        past.push(b);
      } else if (isPast(bookingDate) && !isToday(bookingDate)) {
        past.push(b);
      } else {
        upcoming.push(b);
      }
    });
    return { upcomingBookings: upcoming, pastBookings: past };
  }, [bookings]);

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="max-w-md mx-auto">
        <Card className="bg-card border-border shadow-lg rounded-3xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">My Bookings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              variant="ghost"
              onClick={() => router.push('/')}
              className="text-primary hover:text-primary/80 w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>

            {!userId && (
              <form onSubmit={(e) => { e.preventDefault(); fetchBookings(); }} className="space-y-4">
                <Label htmlFor="phone">Enter your phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g., 9876543210"
                  className="w-full p-3 border border-border rounded-md bg-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Button
                  type="submit"
                  disabled={loading || !phone}
                  className="bg-primary w-full text-white py-3 rounded-md hover:bg-primary/90 transition"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'View Bookings'}
                </Button>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              </form>
            )}

            {userId && (
              <Tabs defaultValue="upcoming" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
                  <TabsTrigger value="history">History ({pastBookings.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="upcoming" className="space-y-4 pt-4">
                  <AnimatePresence>
                    {upcomingBookings.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No upcoming bookings found.</p>
                    ) : (
                      upcomingBookings.map((booking) => (
                        <BookingCard 
                          key={booking.id}
                          booking={booking}
                          getSlotTimes={getSlotTimes}
                          onCancelClick={handleConfirmCancel}
                          onRescheduleClick={handleReschedule}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </TabsContent>
                
                <TabsContent value="history" className="space-y-4 pt-4">
                  <AnimatePresence>
                    {pastBookings.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No past bookings found.</p>
                    ) : (
                      pastBookings.map((booking) => (
                        <BookingCard 
                          key={booking.id}
                          booking={booking}
                          getSlotTimes={getSlotTimes}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

// --- HELPER COMPONENTS ---

function BookingCard({ 
  booking, 
  getSlotTimes, 
  onCancelClick,
  onRescheduleClick
}: { 
  booking: DetailedBooking, 
  getSlotTimes: (ids: string[]) => string,
  onCancelClick?: (booking: DetailedBooking) => void,
  onRescheduleClick?: (booking: DetailedBooking) => void
}) {
  
  const isPending = booking.payment_status === 'pending';
  const isPaid = booking.payment_status === 'paid';
  const isActive = booking.status === 'pending' || booking.status === 'confirmed';
  const isExpired = booking.status === 'cancelled' && booking.payment_status === 'n/a';
  
  // --- RESCHEDULE RULES ---
  const settings = booking.turfs;
  const rescheduleCount = booking.reschedule_count || 0;
  
  let showReschedule = settings?.allow_rescheduling ?? true;
  
  // Rule: Allowed Once?
  if (rescheduleCount >= 1) {
    showReschedule = false;
  }
  
  // Rule: Within Reschedule Window?
  if (showReschedule && settings?.reschedule_window_days) {
    const bookingDate = new Date(booking.date);
    const maxRescheduleDate = addDays(new Date(), settings.reschedule_window_days);
    
    // You can only reschedule bookings that are within the allowed window from today
    if (isAfter(bookingDate, maxRescheduleDate)) {
        showReschedule = false;
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "bg-secondary border border-border rounded-xl p-4 shadow-sm",
        isExpired && "opacity-60"
      )}
    >
      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-lg">{booking.turfs?.name || "Unknown Turf"}</h3>
        <div className="flex flex-col items-end gap-1">
            {/* Show "Expired" if it was auto-cancelled due to non-payment */}
            {isExpired ? <Badge variant="secondary" className="bg-gray-500/20 text-gray-500 hover:bg-gray-500/30">Expired</Badge> : <StatusBadge status={booking.status} />}
            {rescheduleCount > 0 && <Badge variant="outline" className="text-[10px]">Rescheduled</Badge>}
        </div>
      </div>
      
      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
        <p className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {format(new Date(booking.date), 'EEE, dd MMM yyyy')}</p>
        <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> {getSlotTimes(booking.slot)}</p>
      </div>

      <div className="flex justify-between items-end mt-3 pt-3 border-t border-border/50">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-xl font-bold text-primary"><DollarSign className="h-5 w-5" />{booking.amount}</p>
          <StatusBadge status={booking.payment_status} />
        </div>
        
        <div className="flex gap-2">
            {isActive && isPending && onCancelClick && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onCancelClick(booking)}
              >
                Cancel
              </Button>
            )}
            
            {/* UPDATED BUTTON LOGIC:
               1. Show Reschedule if: Active, Paid, Allowed by Settings
            */}
            {isActive && isPaid && showReschedule && onRescheduleClick && (
              <Button
                variant="default" 
                size="sm"
                onClick={() => onRescheduleClick(booking)}
              >
                Reschedule
              </Button>
            )}

            {/* 2. Show Cancel if: Active AND Paid.
               This shows ALONGSIDE Reschedule, or alone if Reschedule is disallowed.
            */}
            {isActive && isPaid && onCancelClick && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive hover:bg-destructive/10"
                onClick={() => onCancelClick(booking)}
              >
                Cancel
              </Button>
            )}
        </div>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let className = "";
  switch (status) {
    case "paid":
    case "confirmed":
    case "completed":
      className = "bg-green-600 text-white hover:bg-green-600/80";
      break;
    case "pending":
      className = "bg-yellow-500 text-black hover:bg-yellow-500/80";
      break;
    case "cancelled":
    case "blocked":
      className = "bg-red-600 text-white hover:bg-red-600/80";
      break;
    case "refund_initiated":
    case "refund processed":
      className = "bg-blue-500 text-white hover:bg-blue-500/80";
      break;
    default:
      className = "bg-gray-500 text-white hover:bg-gray-500/80";
  }
  
  return (
    <Badge className={cn("capitalize text-xs", className)}>
      {status.replace('_', ' ')}
    </Badge>
  );
}