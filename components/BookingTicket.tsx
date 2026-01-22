"use client";

import { 
  MapPin, Calendar, Clock, User, CheckCircle, Wallet, Download, Share2, Ticket as TicketIcon, Barcode
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DialogTitle } from "@/components/ui/dialog"; // Used for accessibility in the header
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Types matching your database structure
interface BookingTicketProps {
  booking: {
    id: string;
    date: string;
    status: string;
    payment_status: string;
    amount: number;
    advance_paid: number;
    turfs: {
      name: string;
      location: string;
    };
  };
  formattedTimeRange: string; // Passed from parent to avoid re-fetching slots
  userName: string;
  onDownload: () => void;
  onShare: () => void;
}

export function BookingTicket({ booking, formattedTimeRange, userName, onDownload, onShare }: BookingTicketProps) {
  const isCompleted = booking.status === 'completed';

  return (
    // Added aspect-[9/16] and max-w for the tall ticket shape
    <div className="relative w-full drop-shadow-2xl aspect-[9/16] max-w-[350px] mx-auto h-full">
      <div 
        className={cn("bg-background rounded-3xl overflow-hidden relative transition-all h-full flex flex-col", isCompleted ? "grayscale-[90%]" : "")}
        style={{
          // Ticket Cut-out shape CSS (Ripped effect for completed, smooth notches for active)
          clipPath: isCompleted ? "polygon(0 0, 100% 0, 100% calc(100% - 15px), 95% 100%, 90% calc(100% - 15px), 85% 100%, 80% calc(100% - 15px), 75% 100%, 70% calc(100% - 15px), 65% 100%, 60% calc(100% - 15px), 55% 100%, 50% calc(100% - 15px), 45% 100%, 40% calc(100% - 15px), 35% 100%, 30% calc(100% - 15px), 25% 100%, 20% calc(100% - 15px), 15% 100%, 10% calc(100% - 15px), 5% 100%, 0 calc(100% - 15px))" : undefined,
          maskImage: !isCompleted ? `radial-gradient(circle at 0 13rem, transparent 1rem, black 1rem), radial-gradient(circle at 100% 13rem, transparent 1rem, black 1rem)` : undefined,
          WebkitMaskImage: !isCompleted ? `radial-gradient(circle at 0 13rem, transparent 1rem, black 1rem), radial-gradient(circle at 100% 13rem, transparent 1rem, black 1rem)` : undefined
        }}
      >
        {/* --- HEADER (Green Gradient) --- */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 pb-8 text-white relative shrink-0">
          {isCompleted && (
            // Updated USED stamp color to red
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 overflow-hidden">
              <span className="text-7xl font-black text-red-600/30 -rotate-45 border-4 border-red-600/30 px-4 py-2 rounded-xl">USED</span>
            </div>
          )}
          <div className="flex justify-between items-start relative z-10">
            <div>
              <Badge className="bg-white/20 text-white hover:bg-white/30 border-none mb-3 backdrop-blur-md">
                {isCompleted ? "COMPLETED" : "CONFIRMED"}
              </Badge>
              <DialogTitle className="text-2xl font-bold leading-tight text-white">
                {booking.turfs.name}
              </DialogTitle>
              <p className="text-white/80 text-sm flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3"/> {booking.turfs.location}
              </p>
            </div>
            <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-sm">
              <TicketIcon className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        {/* --- DASHED DIVIDER (Notch area) --- */}
        {!isCompleted && (
          <div className="relative h-0 shrink-0">
            <div className="absolute top-0 left-4 right-4 border-t-2 border-dashed border-gray-200/50 -mt-[1px]"></div>
          </div>
        )}

        {/* --- BODY (Fills remaining space) --- */}
        <div className="p-6 pt-8 bg-background flex-1 flex flex-col">
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Date</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-semibold text-base">{format(new Date(booking.date), "EEE, MMM d")}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Time</p>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-semibold text-base">{formattedTimeRange}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Player</p>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <span className="font-medium truncate max-w-[120px]">{userName}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Total Amount</p>
              <p className="text-xl font-bold text-foreground">₹{booking.amount}</p>
            </div>
          </div>
          
          {/* --- PAYMENT BREAKDOWN --- */}
          <div className="mt-6 p-4 bg-secondary/30 rounded-xl border border-dashed border-border">
              <div className="flex justify-between items-center mb-2">
                  <p className="text-xs text-muted-foreground font-bold uppercase">Booking ID</p>
                  <p className="font-mono text-xs">{booking.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="flex justify-between items-center border-t border-border/50 pt-2">
                  <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Paid Online (Advance)</span>
                  </div>
                  <span className="font-bold text-green-600">₹{booking.advance_paid > 0 ? booking.advance_paid : booking.amount}</span>
              </div>
              {(booking.amount - booking.advance_paid) > 0 && (
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-orange-500" />
                          <span className="text-sm font-medium">Balance Due (at Venue)</span>
                      </div>
                      <span className="font-bold text-orange-600">₹{booking.amount - booking.advance_paid}</span>
                  </div>
              )}
          </div>

          {/* --- ACTIONS (Pushed to bottom of body section) --- */}
          <div className="mt-auto pt-6">
            {!isCompleted ? (
                <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={onDownload}>
                    <Download className="h-4 w-4 mr-2"/> Save
                </Button>
                <Button className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onShare}>
                    <Share2 className="h-4 w-4 mr-2"/> Share
                </Button>
                </div>
            ) : (
                <div className="text-center text-xs text-muted-foreground font-medium uppercase tracking-widest pb-2">
                Ticket No Longer Valid
                </div>
            )}
          </div>
        </div>

        {/* --- BARCODE SECTION (Only if not completed) --- */}
        {!isCompleted && (
            <div className="shrink-0 bg-background pb-6 px-6">
                {/* Dashed separator */}
                <div className="border-t-2 border-dashed border-gray-200/50 mb-4"></div>
                {/* Barcode Mockup */}
                <div className="flex flex-col items-center justify-center opacity-80">
                    <Barcode className="h-12 w-full text-foreground" />
                    <p className="font-mono text-xs tracking-[0.3em] mt-1">{booking.id.toUpperCase().slice(0,12)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase mt-1">Scan at venue entry</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}