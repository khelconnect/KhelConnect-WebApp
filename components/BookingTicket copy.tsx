"use client";

import { useMemo } from "react";
import { 
  MapPin, Calendar, Clock, User, CheckCircle, Wallet, Download, Share2, Scissors, Activity, Trophy, Dumbbell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// --- Types ---
interface BookingTicketProps {
  booking: {
    id: string;
    date: string;
    status: string;
    payment_status: string;
    amount: number;
    advance_paid: number;
    sport: string;
    turfs: {
      name: string;
      location: string;
    };
  };
  formattedTimeRange: string;
  userName: string;
  onDownload: () => void;
  onShare: () => void;
}

// --- Helper: Get Sport Icon ---
const getSportIcon = (sportName: string = "default", className: string = "h-5 w-5") => {
    const fileName = sportName ? sportName.toLowerCase().trim() : "default";
    
    return (
        <img 
            src={`/icons/${fileName}.svg`} 
            alt={sportName} 
            className={cn("object-contain brightness-0 invert opacity-90", className)} 
            onError={(e) => {
                (e.target as HTMLImageElement).src = "/icons/default.svg"; 
            }}
        />
    );
};

// --- Helper: High Density Barcode ---
const RealisticBarcode = ({ id }: { id: string }) => {
    const bars = useMemo(() => {
        const elements = [];
        const totalBars = 55; 
        for (let i = 0; i < totalBars; i++) {
            const charCode = id.charCodeAt(i % id.length);
            const width = (charCode % 3) + 1; 
            const x = i * 5.5; 
            
            if (i > 2 && i < totalBars - 2 && (charCode % 7 === 0)) continue;

            elements.push(
                <rect key={i} x={x} y="0" width={width} height="100%" fill="currentColor" />
            );
        }
        return elements;
    }, [id]);

    return (
      <svg className="h-12 w-full text-white/90 mix-blend-screen" viewBox="0 0 300 50" preserveAspectRatio="none">
        {bars}
      </svg>
    );
};

export function BookingTicket({ booking, formattedTimeRange, userName, onDownload, onShare }: BookingTicketProps) {
  const isCompleted = booking.status === 'completed';

  // --- MASKS & CLIP PATHS ---

  // 1. Used Ticket: Ripped Edge
  const rippedEdgeClipPath = "polygon(0 0, 100% 0, 100% calc(100% - 10px), 98% 100%, 96% calc(100% - 10px), 94% 100%, 92% calc(100% - 10px), 90% 100%, 88% calc(100% - 10px), 86% 100%, 84% calc(100% - 10px), 82% 100%, 80% calc(100% - 10px), 78% 100%, 76% calc(100% - 10px), 74% 100%, 72% calc(100% - 10px), 70% 100%, 68% calc(100% - 10px), 66% 100%, 64% calc(100% - 10px), 62% 100%, 60% calc(100% - 10px), 58% 100%, 56% calc(100% - 10px), 54% 100%, 52% calc(100% - 10px), 50% 100%, 48% calc(100% - 10px), 46% 100%, 44% calc(100% - 10px), 42% 100%, 40% calc(100% - 10px), 38% 100%, 36% calc(100% - 10px), 34% 100%, 32% calc(100% - 10px), 30% 100%, 28% calc(100% - 10px), 26% 100%, 24% calc(100% - 10px), 22% 100%, 20% calc(100% - 10px), 18% 100%, 16% calc(100% - 10px), 14% 100%, 12% calc(100% - 10px), 10% 100%, 8% calc(100% - 10px), 6% 100%, 4% calc(100% - 10px), 2% 100%, 0 calc(100% - 10px))";

  // 2. Active Ticket Masks (For Transparent Holes)
  // Mask Bottom Corners (For Header)
  const maskBottomCorners = "radial-gradient(circle 10px at 0 100%, #0000 10px, #000 10.5px) 0 100% / 51% 100% no-repeat, radial-gradient(circle 10px at 100% 100%, #0000 10px, #000 10.5px) 100% 100% / 51% 100% no-repeat, linear-gradient(#000, #000) 0 0 / 100% calc(100% - 10px) no-repeat";
  
  // Mask Top & Bottom Corners (For Middle Body)
  const maskBothCorners = 
    "radial-gradient(circle 10px at 0 0, #0000 10px, #000 10.5px) 0 0 / 51% 51% no-repeat, " +
    "radial-gradient(circle 10px at 100% 0, #0000 10px, #000 10.5px) 100% 0 / 51% 51% no-repeat, " +
    "radial-gradient(circle 10px at 0 100%, #0000 10px, #000 10.5px) 0 100% / 51% 51% no-repeat, " +
    "radial-gradient(circle 10px at 100% 100%, #0000 10px, #000 10.5px) 100% 100% / 51% 51% no-repeat, " +
    "linear-gradient(#000, #000) center / 100% calc(100% - 20px) no-repeat";

  // Mask Top Corners (For Barcode Footer)
  const maskTopCorners = "radial-gradient(circle 10px at 0 0, #0000 10px, #000 10.5px) 0 0 / 51% 100% no-repeat, radial-gradient(circle 10px at 100% 0, #0000 10px, #000 10.5px) 100% 0 / 51% 100% no-repeat, linear-gradient(#000, #000) 0 10px / 100% 100% no-repeat";

  return (
    <div className="flex flex-col items-center w-full py-8 space-y-6">
        
        {/* --- TICKET CONTAINER --- */}
        <div className={cn(
            "relative w-[320px] drop-shadow-[0_15px_35px_rgba(0,0,0,0.6)] transition-all duration-300 font-mono select-none",
            isCompleted ? "h-auto" : "aspect-[9/16]"
        )}>
            
            {/* TICKET WRAPPER 
               - For Active: Just a container, backgrounds handled by children.
               - For Used: Applies the Zinc BG and ClipPath here.
            */}
            <div 
                className={cn(
                    "w-full rounded-3xl flex flex-col relative", 
                    isCompleted ? "bg-zinc-900 overflow-hidden" : "" 
                )}
                style={{
                    clipPath: isCompleted ? rippedEdgeClipPath : undefined,
                    boxShadow: isCompleted ? "inset 0 0 60px rgba(0,0,0,0.5)" : undefined
                }}
            >
                {/* --- USED STAMP --- */}
                {isCompleted && (
                    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                        <div className="border-4 border-red-600 rounded-lg px-5 py-0.5 -rotate-12 shadow-none backdrop-blur-none bg-transparent">
                            <span className="text-5xl font-bold text-red-600 pl-3 tracking-[0.2em]">USED</span>
                        </div>
                    </div>
                )}

                {/* --- HEADER --- */}
                <div 
                    className={cn(
                        "bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 p-6 pt-6 pb-6 text-white relative shrink-0",
                        // If active, round top corners. If used, parent rounds them.
                        !isCompleted && "rounded-t-3xl", 
                        isCompleted && "grayscale-[90%] opacity-80"
                    )}
                    style={{
                        // Active: Cut bottom corners for punch holes
                        mask: !isCompleted ? maskBottomCorners : undefined,
                        WebkitMask: !isCompleted ? maskBottomCorners : undefined,
                    }}
                >


                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-4">
                            <Badge className="bg-black/30 text-emerald-50 border border-dotted border-white/40 backdrop-blur-md tracking-widest font-bold px-3 py-1 text-[10px] rounded-sm shadow-sm">
                                {isCompleted ? "ARCHIVED" : "ENTRY PASS"}
                            </Badge>
                            

                        </div>
                        
                        <div className="flex items-center justify-between gap-2">
                            <DialogTitle className="font-sans text-3xl font-black leading-none text-white tracking-tight uppercase drop-shadow-sm break-words w-full">
                                {booking.turfs.name}
                            </DialogTitle>
                            <img src="/logo.png" alt="KhelConnect" className="h-8 w-auto brightness-0 invert opacity-90 shrink-0" />
                        </div>
                        
                        <div className="flex items-center gap-2 mt-2 text-emerald-100/80 text-sm font-bold uppercase tracking-wide">
                            {getSportIcon(booking.sport, "h-3.5 w-3.5")}
                            <span className="truncate max-w-[250px]">{booking.sport}</span>
                        </div>
                    </div>
                </div>

                {/* --- MAIN INFO SECTION --- */}
                <div 
                    className={cn(
                        "p-6 flex-1 flex flex-col relative bg-[url('/noise.png')] bg-repeat opacity-95",
                        !isCompleted && "bg-zinc-900", 
                        isCompleted && "grayscale-[90%]"
                    )}
                    style={{
                        // Active: Cut top corners (header join) AND bottom corners (barcode join)
                        mask: !isCompleted ? maskBothCorners : undefined,
                        WebkitMask: !isCompleted ? maskBothCorners : undefined,
                        boxShadow: !isCompleted ? "inset 0 0 60px rgba(0,0,0,0.5)" : undefined
                    }}
                >
                    {/* Grid Details */}
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                        <div>
                            <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-extrabold mb-1.5">Date</p>
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-lg text-white tracking-tight">
                                    {format(new Date(booking.date), "dd MMM yyyy")}
                                </span>
                            </div>
                        </div>
                        <div>
                            <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-extrabold mb-1.5 text-right">Time</p>
                            <div className="flex items-center justify-end gap-2">
                                <span className="font-medium text-lg text-white tracking-tight whitespace-nowrap">
                                    {formattedTimeRange}
                                </span>
                            </div>
                        </div>
                        <div className="col-span-2">
                            <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-extrabold mb-1.5">Player</p>
                            <div className="flex items-center gap-3 text-zinc-200 bg-white/5 p-2 rounded-xl border border-dotted border-white/20">
                                <div className="bg-emerald-500/20 p-1.5 rounded-full">
                                    <User className="h-4 w-4 text-emerald-400" />
                                </div>
                                <span className="font-medium truncate text-sm uppercase tracking-wide">{userName}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 border border-dashed border-zinc-700 rounded-xl p-4 bg-black/30 relative">
                        <div className="flex justify-between items-center text-sm mb-2">
                            <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">Paid Online</span>
                            <div className="flex items-center gap-1.5">
                                <CheckCircle className="h-3 w-3 text-emerald-600" />
                                <span className="font-bold text-lg text-emerald-400 tracking-tight">₹{booking.advance_paid}</span>
                            </div>
                        </div>

                        {(booking.amount - booking.advance_paid) > 0 && (
                            <div className="flex justify-between items-center text-sm mb-3">
                                <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">Due at Venue</span>
                                <div className="flex items-center gap-1.5">
                                    <Wallet className="h-3 w-3 text-orange-500" />
                                    <span className="font-bold text-lg text-orange-500 tracking-tight">₹{booking.amount - booking.advance_paid}</span>
                                </div>
                            </div>
                        )}

                        <div className="border-t border-dashed border-zinc-700 my-2"></div>

                        <div className="flex justify-end items-center gap-2">
                            <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest">Total Price</span>
                            <span className="text-xl font-black text-white">₹{booking.amount}</span>
                        </div>
                    </div>
                    
                    {/* Padding at bottom to ensure content doesn't hit the cut line */}
                    <div className="pb-4"></div>

                    {isCompleted && (
                        <div className="mt-auto text-center pb-1 opacity-60">
                            <p className="font-mono text-[10px] font-bold tracking-[0.25em] text-zinc-400 uppercase">TICKET NO LONGER VALID</p>
                        </div>
                    )}
                </div>

                {/* --- CUT SEPARATOR (Only Active) --- */}
                {!isCompleted && (
                    // This absolute container sits exactly where the masks create the gap
                    <div className="absolute left-0 w-full z-20 flex items-center justify-center pointer-events-none" style={{ top: "calc(100% - 100px - 38px)" /* Approximate position above barcode */ }}>
                        {/* The Dotted Line */}
                        <div className="w-[85%] border-b-[3px] border-dotted border-zinc-600/50"></div>
                        
                        {/* Scissor Icon */}
                        <div className="absolute right-6 bg-transparent px-1.5 text-zinc-500">
                            <Scissors className="h-4 w-4 rotate-180" />
                        </div>
                    </div>
                )}

                {/* --- BARCODE SECTION (Only Active) --- */}
                {!isCompleted && (
                    <div 
                        className={cn(
                            "bg-zinc-900 px-6 pb-8 pt-6 flex flex-col items-center justify-end relative grow min-h-[100px] rounded-b-3xl"
                        )}
                        style={{
                            // Active: Cut top corners for punch holes
                            mask: maskTopCorners,
                            WebkitMask: maskTopCorners
                        }}
                    >
                        <RealisticBarcode id={booking.id} />
                        <div className="flex justify-between w-full items-end mt-4 px-1 opacity-80">
                            <p className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">SEQ: 001</p>
                            <p className="font-mono text-[11px] font-bold tracking-[0.25em] text-emerald-400 ">KH31C0NN36T</p>
                            <p className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">GATE: A</p>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* --- FLOATING ACTIONS --- */}
        {!isCompleted && (
            <div className="flex gap-4 w-full max-w-[340px] animate-in slide-in-from-bottom-4 fade-in duration-500">
                <Button 
                    variant="outline" 
                    className="flex-1 h-12 rounded-2xl border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-200 font-bold uppercase text-xs tracking-wider backdrop-blur-sm" 
                    onClick={onDownload}
                >
                    <Download className="h-4 w-4 mr-2"/> Save Ticket
                </Button>
                <Button 
                    className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-xs tracking-wider shadow-lg shadow-emerald-900/20" 
                    onClick={onShare}
                >
                    <Share2 className="h-4 w-4 mr-2"/> Share
                </Button>
            </div>
        )}
    </div>
  );
}