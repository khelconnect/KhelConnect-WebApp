"use client";

import { useState, useEffect } from "react";
import { 
  X, ChevronRight, Trash2, Wallet, AlertCircle, Clock 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, isValid } from "date-fns";

const formatToIST = (dateString: string | null) => {
  if (!dateString) return "Unknown";
  try {
    const date = new Date(dateString);
    if (!isValid(date)) return "Invalid Date";
    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true
    });
  } catch (e) { return "Unknown"; }
};

function BookingTimer({ createdAt }: { createdAt: string | null }) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!createdAt) return;
    const calculate = () => {
      try {
        const createdTime = new Date(createdAt).getTime(); 
        if (isNaN(createdTime)) return 0;
        const expiryTime = createdTime + (5 * 60 * 1000); 
        const nowTime = new Date().getTime(); 
        const secondsRemaining = Math.floor((expiryTime - nowTime) / 1000);
        return secondsRemaining > 0 ? secondsRemaining : 0;
      } catch (e) { return 0; }
    };
    
    setTimeLeft(calculate());
    const interval = setInterval(() => setTimeLeft(calculate()), 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  if (!createdAt || timeLeft === null) return null;
  if (timeLeft === 0) return <Badge variant="outline" className="border-red-200 bg-red-50 text-red-600 gap-1 text-[9px] px-1.5 h-5 shrink-0"><X className="h-3 w-3" /> Expired</Badge>;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  return <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 gap-1 font-mono text-[9px] px-1.5 h-5 shrink-0"><Clock className="h-3 w-3" /> {timeString}</Badge>;
}

interface SlidingActionCardProps {
  data: {
    id: string;
    title: string;
    date: string;
    createdAt: string | null;
    timeRange: string;
    amount: number;
    advancePaid: number;
    status: string;
    paymentStatus: string;
  };
  actions: {
    onPay: () => void;
    onCancel: () => void;
    isProcessing: boolean;
  };
  theme: {
    borderLeft: string;
    actionBackground: string;
    actionBorder: string;
    primaryBtn: string;
    secondaryBtn: string;
    toggleBtnActive: string;
    statusText: string;
    alertIconColor: string;
  };
}

export function SlidingActionCard({ data, actions, theme }: SlidingActionCardProps) {
    const [showActions, setShowActions] = useState(false);

    return (
        <Card className={cn("bg-card rounded-xl shadow-sm border-l-4 relative overflow-hidden h-[140px] sm:h-[150px]", theme.borderLeft)}>
            
            {/* 1. ACTION LAYER (Behind) */}
            <div 
                className={cn("absolute inset-0 flex items-center transition-all duration-300 z-0", theme.actionBackground, showActions ? "opacity-100" : "opacity-0")}
                onClick={() => setShowActions(false)}
            >
                 <div className={cn("h-full flex items-center justify-center gap-3 px-2 border-r relative w-[130px] sm:w-1/2", theme.actionBorder)}>
                     <div className="flex sm:hidden gap-2">
                        <Button 
                            variant="ghost" size="icon"
                            className={cn("rounded-full h-11 w-11", theme.secondaryBtn)}
                            onClick={(e) => { e.stopPropagation(); actions.onCancel(); }}
                        >
                            <Trash2 className="h-5 w-5" />
                        </Button>
                        <Button 
                            size="icon"
                            className={cn("rounded-full h-11 w-11 shadow-md", theme.primaryBtn)}
                            onClick={(e) => { e.stopPropagation(); actions.onPay(); }}
                            disabled={actions.isProcessing}
                        >
                            <Wallet className="h-5 w-5" />
                        </Button>
                     </div>

                     <div className="hidden sm:flex flex-col gap-2 w-full max-w-[200px]">
                        <Button 
                            variant="ghost" 
                            className={cn("w-full flex items-center justify-center gap-2", theme.secondaryBtn)}
                            onClick={(e) => { e.stopPropagation(); actions.onCancel(); }}
                        >
                            <Trash2 className="h-4 w-4" /> Cancel
                        </Button>
                        <Button 
                            className={cn("w-full flex items-center justify-center gap-2 shadow-sm", theme.primaryBtn)}
                            onClick={(e) => { e.stopPropagation(); actions.onPay(); }}
                            disabled={actions.isProcessing}
                        >
                            <Wallet className="h-4 w-4" /> Pay Now
                        </Button>
                     </div>
                 </div>
            </div>

            {/* 2. MAIN CONTENT LAYER */}
            <div 
                className={cn(
                    "absolute inset-0 bg-card p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center transition-transform duration-300 ease-in-out z-10 cursor-pointer pr-14 sm:pr-16",
                    showActions ? "translate-x-[130px] sm:translate-x-[50%]" : "translate-x-0"
                )}
                style={{ boxShadow: showActions ? "-5px 0 15px -5px rgba(0,0,0,0.1)" : "none" }}
                onClick={() => setShowActions(!showActions)}
            >
                <div className="flex-1 min-w-0 w-full space-y-1">
                  <h3 className="font-bold text-sm sm:text-base truncate leading-tight">{data.title}</h3>
                  
                  <div className="flex items-center gap-2 overflow-hidden">
                      <p className={cn("text-[11px] sm:text-sm font-semibold flex items-center gap-1 shrink-0", theme.statusText)}>
                          <AlertCircle className={cn("h-3 w-3 sm:h-4 sm:w-4", theme.alertIconColor)} /> 
                          {data.paymentStatus === 'failed' ? 'Failed' : 'Pending'}
                      </p>
                      <BookingTimer createdAt={data.createdAt} />
                  </div>

                  <div className="space-y-0.5 sm:space-y-1 pt-0.5">
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate opacity-80">
                        Booked: {formatToIST(data.createdAt)}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                        Slot: {data.timeRange}
                    </p>
                  </div>
                </div>
                
                {/* Price Section with Bottom Padding Added */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 pb-2 sm:pt-0 sm:pb-0 border-t sm:border-0 border-dashed border-muted-foreground/20 mt-1 sm:mt-0">
                    <p className="text-lg sm:text-xl font-black tracking-tight">₹{data.advancePaid > 0 ? data.advancePaid : data.amount}</p>
                    {data.advancePaid > 0 && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-none text-[9px] px-1.5 py-0 h-4 uppercase font-black sm:mt-1">
                            Advance Due
                        </Badge>
                    )}
                </div>
            </div>

            {/* 3. FIXED TOGGLE BUTTON */}
            <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20">
                <Button 
                    variant="outline"
                    className={cn(
                        "transition-all border-dashed h-9 w-9 sm:h-10 sm:w-10 p-0 rounded-full bg-background shadow-sm hover:bg-accent", 
                        showActions ? theme.toggleBtnActive : ""
                    )}
                    onClick={(e) => { e.stopPropagation(); setShowActions(!showActions); }}
                >
                    {showActions ? <X className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                </Button>
            </div>
        </Card>
    )
}