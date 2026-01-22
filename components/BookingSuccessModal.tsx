"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Calendar, Clock, MapPin, Loader2, XCircle, Wallet, Ticket } from "lucide-react";
import { format } from "date-fns";
import { UniversalLoader } from "@/components/ui/universal-loader";

interface BookingSuccessModalProps {
  onSuccess: () => void; // Callback to refresh parent data
}

export function BookingSuccessModal({ onSuccess }: BookingSuccessModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Params from Payment Gateway
  const bookingId = searchParams.get("booking_id");
  const paymentStatus = searchParams.get("payment_status"); // 'succeeded' or 'failed'

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Only activate if we have a booking_id in the URL
    if (bookingId) {
      setIsOpen(true);
      verifyBooking(bookingId);
    }
  }, [bookingId, paymentStatus]);

  const verifyBooking = async (id: string) => {
    setLoading(true);
    try {
      // 1. Fetch current status
      const { data, error } = await supabase
        .from("bookings")
        .select("*, turfs(name, location)")
        .eq("id", id)
        .single();

      if (error || !data) throw new Error("Booking not found");

      // 2. Handle Logic based on Gateway Status
      if (paymentStatus === 'succeeded') {
        // If still pending in DB, update it (Optimistic update)
        if (data.status !== 'confirmed' || data.payment_status !== 'paid') {
           await supabase
            .from("bookings")
            .update({ status: 'confirmed', payment_status: 'paid' })
            .eq("id", id);
           
           // Update local state to reflect confirmation
           data.status = 'confirmed';
           data.payment_status = 'paid';
        }
      } else if (paymentStatus === 'failed') {
         setError("Payment transaction failed.");
      }

      setBooking(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Remove params from URL without refreshing
    const newUrl = window.location.pathname;
    window.history.replaceState({}, '', newUrl);
    // Trigger parent refresh
    onSuccess();
  };

  if (!bookingId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md w-[90vw] rounded-3xl p-0 overflow-hidden bg-transparent border-none shadow-none">
        {loading ? (
           <div className="bg-background/90 backdrop-blur-xl p-8 rounded-3xl flex flex-col items-center justify-center min-h-[300px]">
              <UniversalLoader />
              <p className="mt-4 text-muted-foreground font-medium animate-pulse">Verifying Payment...</p>
           </div>
        ) : error || (booking && booking.payment_status === 'failed') ? (
           <div className="bg-background p-6 rounded-3xl border border-red-100 shadow-xl">
              <div className="flex flex-col items-center text-center gap-4">
                 <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                    <XCircle className="h-8 w-8" />
                 </div>
                 <div>
                    <h2 className="text-xl font-bold text-red-700">Payment Failed</h2>
                    <p className="text-muted-foreground text-sm mt-1">{error || "The transaction could not be completed."}</p>
                 </div>
                 <Button onClick={handleClose} variant="outline" className="w-full rounded-xl">Close</Button>
              </div>
           </div>
        ) : booking ? (
           <div className="relative w-full drop-shadow-2xl">
              {/* --- TICKET UI --- */}
              <div className="bg-background rounded-3xl overflow-hidden relative" style={{ maskImage: `radial-gradient(circle at 0 13rem, transparent 1rem, black 1rem), radial-gradient(circle at 100% 13rem, transparent 1rem, black 1rem)` }}>
                
                {/* Header */}
                <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-6 pb-8 text-white">
                  <div className="flex justify-between items-start">
                    <div>
                        <Badge className="bg-white/20 text-white hover:bg-white/30 border-none mb-3 backdrop-blur-md">BOOKING CONFIRMED</Badge>
                        <DialogTitle className="text-2xl font-bold leading-tight text-white">{booking.turfs.name}</DialogTitle>
                        <p className="text-white/80 text-sm flex items-center gap-1 mt-1"><MapPin className="h-3 w-3"/> {booking.turfs.location}</p>
                    </div>
                    <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-sm"><Ticket className="h-8 w-8 text-white" /></div>
                  </div>
                </div>

                {/* Dashed Divider */}
                <div className="relative h-0"><div className="absolute top-0 left-4 right-4 border-t-2 border-dashed border-gray-200/50 -mt-[1px]"></div></div>

                {/* Details Body */}
                <div className="p-6 pt-8 bg-background">
                  <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                      <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Date</p>
                          <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /><span className="font-semibold text-base">{format(new Date(booking.date), "EEE, MMM d")}</span></div>
                      </div>
                      <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Slots</p>
                          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /><span className="font-semibold text-base">{booking.slot.length} Selected</span></div>
                      </div>
                  </div>

                  {/* Payment Breakdown Box */}
                  <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-100">
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-green-200/50">
                          <span className="text-xs font-bold text-green-700 uppercase">Paid Online (Advance)</span>
                          <span className="font-bold text-green-700 text-lg">₹{booking.advance_paid}</span>
                      </div>
                      {(booking.amount - booking.advance_paid) > 0 ? (
                          <div className="flex justify-between items-center pt-1">
                              <div className="flex items-center gap-1.5 text-orange-600">
                                  <Wallet className="h-3.5 w-3.5" />
                                  <span className="text-xs font-bold uppercase">Due at Venue</span>
                              </div>
                              <span className="font-bold text-orange-600 text-lg">₹{booking.amount - booking.advance_paid}</span>
                          </div>
                      ) : (
                          <div className="text-center pt-1">
                              <span className="text-xs font-bold text-green-600 uppercase flex items-center justify-center gap-1"><CheckCircle className="h-3 w-3"/> Fully Paid</span>
                          </div>
                      )}
                  </div>

                  <DialogFooter className="mt-6">
                    <Button onClick={handleClose} className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white h-12 text-base">
                        View My Bookings
                    </Button>
                  </DialogFooter>
                </div>
              </div>
           </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}