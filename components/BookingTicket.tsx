"use client";

import { useMemo, useState, useRef } from "react";
import { 
  User, CheckCircle, Wallet, Camera, Link as LinkIcon, Hash, Check, Scissors
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner"; 

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
  onShare?: () => void; 
}

// --- Helper: Get Sport Icon ---
const getSportIcon = (sportName: string = "default", className: string = "h-5 w-5") => {
    const fileName = sportName ? sportName.toLowerCase().trim() : "default";
    return (
        <img 
            src={`/icons/${fileName}.svg`} 
            alt={sportName} 
            className={cn("object-contain brightness-0 invert opacity-90", className)} 
            onError={(e) => { (e.target as HTMLImageElement).src = "/icons/default.svg"; }}
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
            elements.push(<rect key={i} x={x} y="0" width={width} height="100%" fill="currentColor" />);
        }
        return elements;
    }, [id]);

    return (
      <svg className="h-12 w-full text-white/90 mix-blend-screen" viewBox="0 0 300 50" preserveAspectRatio="none">
        {bars}
      </svg>
    );
};

export function BookingTicket({ booking, formattedTimeRange, userName, onShare }: BookingTicketProps) {
  const [isCopied, setIsCopied] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  const isCompleted = booking.status === 'completed';

  // --- ACTIONS ---
  const handleShare = () => {
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
    const shareUrl = `${origin}/ticket/${booking.id}`;
    
    const legacyCopy = () => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = shareUrl;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) triggerSuccess();
            else toast.error("Could not copy link automatically.");
        } catch (err) {
            toast.error("Failed to copy link.");
        }
    };

    const triggerSuccess = () => {
        setIsCopied(true);
        toast.success("Link Copied!", { description: "Anyone with this link can view the ticket." });
        setTimeout(() => setIsCopied(false), 2000);
        if (onShare) onShare();
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl)
            .then(triggerSuccess)
            .catch(legacyCopy);
    } else {
        legacyCopy();
    }
  };

  // --- MASKS ---
  const rippedEdgeClipPath = "polygon(0 0, 100% 0, 100% calc(100% - 10px), 98% 100%, 96% calc(100% - 10px), 94% 100%, 92% calc(100% - 10px), 90% 100%, 88% calc(100% - 10px), 86% 100%, 84% calc(100% - 10px), 82% 100%, 80% calc(100% - 10px), 78% 100%, 76% calc(100% - 10px), 74% 100%, 72% calc(100% - 10px), 70% 100%, 68% calc(100% - 10px), 66% 100%, 64% calc(100% - 10px), 62% 100%, 60% calc(100% - 10px), 58% 100%, 56% calc(100% - 10px), 54% 100%, 52% calc(100% - 10px), 50% 100%, 48% calc(100% - 10px), 46% 100%, 44% calc(100% - 10px), 42% 100%, 40% calc(100% - 10px), 38% 100%, 36% calc(100% - 10px), 34% 100%, 32% calc(100% - 10px), 30% 100%, 28% calc(100% - 10px), 26% 100%, 24% calc(100% - 10px), 22% 100%, 20% calc(100% - 10px), 18% 100%, 16% calc(100% - 10px), 14% 100%, 12% calc(100% - 10px), 10% 100%, 8% calc(100% - 10px), 6% 100%, 4% calc(100% - 10px), 2% 100%, 0 calc(100% - 10px))";
  const maskBottomCorners = "radial-gradient(circle 10px at 0 100%, #0000 10px, #000 10.5px) 0 100% / 51% 100% no-repeat, radial-gradient(circle 10px at 100% 100%, #0000 10px, #000 10.5px) 100% 100% / 51% 100% no-repeat, linear-gradient(#000, #000) 0 0 / 100% calc(100% - 10px) no-repeat";
  const maskBothCorners = "radial-gradient(circle 10px at 0 0, #0000 10px, #000 10.5px) 0 0 / 51% 51% no-repeat, radial-gradient(circle 10px at 100% 0, #0000 10px, #000 10.5px) 100% 0 / 51% 100% no-repeat, radial-gradient(circle 10px at 0 100%, #0000 10px, #000 10.5px) 0 100% / 51% 51% no-repeat, radial-gradient(circle 10px at 100% 100%, #0000 10px, #000 10.5px) 100% 100% / 51% 51% no-repeat, linear-gradient(#000, #000) center / 100% calc(100% - 20px) no-repeat";
  const maskTopCorners = "radial-gradient(circle 10px at 0 0, #0000 10px, #000 10.5px) 0 0 / 51% 100% no-repeat, radial-gradient(circle 10px at 100% 0, #0000 10px, #000 10.5px) 100% 0 / 51% 100% no-repeat, linear-gradient(#000, #000) 0 10px / 100% 100% no-repeat";

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[85vh] sm:min-h-0 py-2 sm:py-8 space-y-0">
        
        {/* --- SCALABLE WRAPPER --- */}
        <div className="flex flex-col items-center scale-[0.82] sm:scale-100 origin-center transition-all duration-300">
            
            {/* CONDITIONAL: ONLY SHOW ID IN PROFILE VIEW (WHERE onShare IS PASSED) */}
            {onShare && (
              <div className="w-[320px] flex items-center justify-between opacity-80 text-emerald-400 font-bold font-mono text-[12px] sm:text-[12px] mb-4 px-1 tracking-tight">
                  <div className="flex items-center gap-1.5"><Hash className="h-4 w-4 shrink-0" /><span>ID:</span></div>
                  <span className="uppercase break-all text-right ml-4">
                      {booking.id}
                  </span>
              </div>
            )}

            {/* TICKET CONTAINER */}
            <div 
                ref={ticketRef}
                className={cn(
                    "relative w-[320px] drop-shadow-[0_20px_60px_rgba(0,0,0,0.6)] transition-all duration-300 font-mono select-none",
                    isCompleted ? "h-auto" : "aspect-[9/16]"
                )}
            >
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
                    {isCompleted && (
                        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                            <div className="border-4 border-red-600 rounded-lg px-5 py-0.5 -rotate-12 bg-transparent">
                                <span className="text-5xl font-bold text-red-600 pl-3 tracking-[0.2em]">USED</span>
                            </div>
                        </div>
                    )}

                    <div 
                        className={cn(
                            "bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 p-6 pt-6 pb-6 text-white relative shrink-0",
                            !isCompleted && "rounded-t-3xl", 
                            isCompleted && "grayscale-[90%] opacity-80"
                        )}
                        style={{
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
                                <h2 className="font-sans text-3xl font-black leading-none text-white tracking-tight uppercase drop-shadow-sm break-words w-full">
                                    {booking.turfs.name}
                                </h2>
                                <img src="/logo.png" alt="KhelConnect" className="h-8 w-auto brightness-0 invert opacity-90 shrink-0" />
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-emerald-100/80 text-sm font-bold uppercase tracking-wide">
                                {getSportIcon(booking.sport, "h-3.5 w-3.5")}
                                <span className="truncate max-w-[250px]">{booking.sport}</span>
                            </div>
                        </div>
                    </div>

                    <div className={cn("p-6 flex-1 flex flex-col relative bg-zinc-900", isCompleted && "grayscale-[90%]")}>
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
                    </div>

                    {!isCompleted && (
                        <div 
                            className={cn("bg-zinc-900 px-6 pb-8 pt-6 flex flex-col items-center justify-end relative grow min-h-[100px] rounded-b-3xl")}
                            style={{ mask: maskTopCorners, WebkitMask: maskTopCorners }}
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

            {/* --- ACTIONS --- */}
            {!isCompleted && onShare && (
                <div className="flex flex-col items-center gap-4 mt-10 sm:mt-14">
                    <div className="w-[320px]">
                        <Button 
                            className={cn(
                                "w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-sm tracking-widest shadow-2xl transition-all active:scale-95",
                                isCopied && "bg-emerald-800 cursor-default"
                            )}
                            onClick={handleShare}
                        >
                            {isCopied ? <Check className="h-5 w-5 mr-3" /> : <LinkIcon className="h-5 w-5 mr-3" />}
                            {isCopied ? "Copied Link" : "Share Match Link"}
                        </Button>
                    </div>
                    
                    <div className="w-[320px] flex items-center justify-center gap-2 opacity-80 text-[13px] sm:text-[14px] font-normal text-white tracking-widest uppercase">
                        <Camera className="h-4 w-4" />
                        <span>Screenshot to use offline</span>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
}