"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Clock, Users, Plus, Trash2, Loader2, AlertTriangle, CheckCircle, XCircle, RefreshCw, ShieldAlert, CalendarIcon 
} from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { format, isPast, isSameDay, differenceInHours } from "date-fns"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// --- TYPES ---
type TimeSlotDisplay = {
  id: string
  time: string
  endTime: string
}

type BookingType = {
  id: string
  date: string
  slot: string
  slotId: string
  endTime: string
  customerName: string
  customerPhone: string
  customerEmail: string
  sport: string
  price: number // TOTAL price
  status: string
  payment_status: string
  refund_amount: number | null
  source: "app" | "manual"
}

type GroupedBookingType = {
  id: string;
  date: string;
  slots: string[];
  slotIds: string[];
  startTime: string;
  endTime: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  sport: string;
  price: number;
  status: string;
  payment_status: string;
  refund_amount: number | null;
  source: "app" | "manual";
};

type ManualBlockType = {
  id: string
  date: string
  slot: string
  slotId: string
  reason: string | null
}

type OwnerType = {
  id: string
  name: string
  turf_name: string
}

type TurfType = {
  id: string
  name: string
}

// --- HELPER COMPONENT for Loading/Error ---
function DashboardNotice({ message, isError = false }: { message: string, isError?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
      {isError ? (
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
      ) : (
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      )}
      <h3 className="text-xl font-semibold mb-2">{isError ? "An Error Occurred" : "Loading Dashboard"}</h3>
      <p className="text-muted-foreground max-w-md">{message}</p>
    </div>
  )
}

// --- Unverified State Component ---
function UnverifiedDashboard({ ownerName }: { ownerName?: string }) {
  const router = useRouter();
  const handleSignOut = () => {
    localStorage.removeItem("owner_id");
    router.push("/owner/login");
  };

  return (
    <div className="relative space-y-6 md:space-y-8">
      {/* 1. The Overlay Message */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center bg-background/80 backdrop-blur-sm rounded-3xl">
        <div className="max-w-md w-full p-6 sm:p-8 bg-card border rounded-3xl shadow-2xl">
          <ShieldAlert className="h-12 w-12 sm:h-16 sm:w-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Welcome, {ownerName || "Owner"}!
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground mb-6">
            Your account is pending verification. Please sit tight! Our admin team will review your application and activate your turf dashboard shortly.
          </p>
          <Button variant="outline" className="gap-2" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>
      
      {/* 2. The Static Blurred Dashboard Behind It */}
      <div className="space-y-6 md:space-y-8 blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Turf Owner Dashboard</h1>
            <p className="text-muted-foreground">
              Manage bookings for <span className="font-medium text-primary">Your Turf</span>
            </p>
          </div>
          <Button variant="outline" className="gap-2" disabled>Sign Out</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <Card className="bg-card border-border rounded-xl"><CardHeader className="pb-2"><CardTitle className="text-lg">Today's Bookings</CardTitle><CardDescription>0 bookings today</CardDescription></CardHeader><CardContent><div className="text-3xl font-bold text-primary">0</div></CardContent></Card>
          <Card className="bg-card border-border rounded-xl"><CardHeader className="pb-2"><CardTitle className="text-lg">Blocked Slots</CardTitle><CardDescription>0 slots blocked</CardDescription></CardHeader><CardContent><div className="text-3xl font-bold text-primary">0</div></CardContent></Card>
          <Card className="bg-card border-border rounded-xl"><CardHeader className="pb-2"><CardTitle className="text-lg">Total Paid Revenue</CardTitle><CardDescription>From all paid bookings</CardDescription></CardHeader><CardContent><div className="text-3xl font-bold text-primary">₹0</div></CardContent></Card>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
          <Card className="bg-card border-border rounded-xl md:col-span-1"><CardHeader><CardTitle className="text-lg">Select Date</CardTitle></CardHeader><CardContent><Calendar mode="single" selected={new Date()} disabled className="rounded-md border-border" /></CardContent></Card>
          <Card className="bg-card border-border rounded-xl md:col-span-3"><CardHeader><CardTitle className="text-lg">Schedule</CardTitle></CardHeader><CardContent><div className="text-center py-12 text-muted-foreground">Dashboard is inactive</div></CardContent></Card>
        </div>
      </div>
    </div>
  );
}


// --- MAIN COMPONENT ---
export default function OwnerDashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("bookings")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  
  // Data State
  const [owner, setOwner] = useState<OwnerType | null>(null)
  const [turf, setTurf] = useState<TurfType | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlotDisplay[]>([])
  const [bookings, setBookings] = useState<BookingType[]>([]) // Raw
  const [groupedBookings, setGroupedBookings] = useState<GroupedBookingType[]>([]) // For UI
  const [manualBlocks, setManualBlocks] = useState<ManualBlockType[]>([])
  const [pendingConfirmation, setPendingConfirmation] = useState<GroupedBookingType[]>([])
  
  // UI/Loading State
  const [isInitializing, setIsInitializing] = useState(true)
  const [isBookingsLoading, setIsBookingsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  
  // Form State
  const [newBooking, setNewBooking] = useState({
    customerName: "", customerPhone: "", customerEmail: "",
    sport: "football", slotId: "", price: "",
  })
  const [newBlock, setNewBlock] = useState({ 
    slotId: "", reason: "", otherReason: ""
  })

  // --- DATA FETCHING ---

  // EFFECT 1: Initialize Dashboard
  useEffect(() => {
    const initializeDashboard = async () => {
      setIsInitializing(true)
      setPageError(null)
      try {
        const ownerId = localStorage.getItem("owner_id")
        if (!ownerId) { router.push("/owner/login"); return }

        const [ownerResult, slotsResult] = await Promise.all([
          supabase.from("turf_owners").select("*, turfs (id, name)").eq("id", ownerId).single(),
          supabase.from("time_slots").select("id, start_time, end_time, period").order("start_time")
        ])

        if (ownerResult.error || !ownerResult.data) {
          throw new Error("Failed to fetch owner details. Check RLS on 'turf_owners' and 'turfs' tables.")
        }
        setOwner(ownerResult.data);
        
        const ownerTurfs = ownerResult.data.turfs;
        if (Array.isArray(ownerTurfs) && ownerTurfs.length > 0) {
          setTurf(ownerTurfs[0]);
        } else {
          console.log("Owner loaded, but no turf associated. Showing pending screen.");
        }

        if (slotsResult.error || !slotsResult.data) {
          throw new Error("Failed to fetch time slots. Check RLS on 'time_slots' table.")
        }
        const formattedSlots = slotsResult.data.map((slot) => ({
          id: slot.id,
          time: `${slot.start_time}${slot.period ? ` ${slot.period}` : ""}`,
          endTime: slot.end_time
        }))
        setTimeSlots(formattedSlots)

      } catch (error: any) {
        setPageError(error.message)
      } finally {
        setIsInitializing(false)
      }
    }
    initializeDashboard()
  }, [router])

  // EFFECT 2: Fetch Bookings
  useEffect(() => {
    if (isInitializing || !turf || timeSlots.length === 0) return

    const fetchBookingsForDate = async () => {
      setIsBookingsLoading(true)
      setPageError(null)
      const formattedDate = format(selectedDate, "yyyy-MM-dd")

      try {
        const { data, error } = await supabase
          .from("bookings")
          .select("*, users (name, phone, email)")
          .eq("turf_id", turf.id)
          .eq("date", formattedDate)

        if (error) {
          throw new Error("Failed to fetch bookings. Check RLS on 'bookings' and 'users' tables.")
        }

        const newBookings: BookingType[] = []
        const newBlocks: ManualBlockType[] = []

        data.forEach((b) => {
          b.slot.forEach((slotId: string) => {
            const timeSlot = timeSlots.find(ts => ts.id === slotId)
            const displayTime = timeSlot ? timeSlot.time : "Unknown Slot"
            const endTime = timeSlot ? timeSlot.endTime : "00:00"
            
            if (b.status === "blocked") {
              newBlocks.push({
                id: b.id, date: b.date, slot: displayTime, slotId: slotId,
                reason: b.sport,
              })
            } else {
              newBookings.push({
                id: b.id, date: b.date, slot: displayTime, slotId: slotId,
                endTime: endTime,
                customerName: b.users?.name || "N/A",
                customerPhone: b.users?.phone || "N/A",
                customerEmail: b.users?.email || "N/A",
                sport: b.sport,
                price: b.amount,
                status: b.status,
                payment_status: b.payment_status,
                refund_amount: b.refund_amount,
                source: b.user_id ? "app" : "manual",
              })
            }
          })
        })
        setBookings(newBookings)
        setManualBlocks(newBlocks)
      } catch (error: any) {
        setPageError(error.message)
      } finally {
        setIsBookingsLoading(false)
      }
    }
    fetchBookingsForDate()
  }, [selectedDate, turf, timeSlots, isInitializing])

  // EFFECT 3: Group Bookings
  useEffect(() => {
    if (timeSlots.length === 0) return;
    const groups: { [key: string]: BookingType[] } = {};
    for (const booking of bookings) {
      if (!groups[booking.id]) { groups[booking.id] = [] }
      groups[booking.id].push(booking);
    }
    const newGroupedBookings: GroupedBookingType[] = Object.values(groups).map(bookingGroup => {
      const sortedGroup = bookingGroup.sort((a, b) => {
        const aIndex = timeSlots.findIndex(ts => ts.id === a.slotId);
        const bIndex = timeSlots.findIndex(ts => ts.id === b.slotId);
        return aIndex - bIndex;
      });
      const firstSlot = sortedGroup[0];
      const lastSlot = sortedGroup[sortedGroup.length - 1];
      return {
        id: firstSlot.id,
        date: firstSlot.date,
        slots: sortedGroup.map(b => b.slot),
        slotIds: sortedGroup.map(b => b.slotId),
        startTime: firstSlot.slot,
        endTime: lastSlot.endTime,
        customerName: firstSlot.customerName,
        customerPhone: firstSlot.customerPhone,
        customerEmail: firstSlot.customerEmail,
        sport: firstSlot.sport,
        price: firstSlot.price,
        status: firstSlot.status,
        payment_status: firstSlot.payment_status,
        refund_amount: firstSlot.refund_amount,
        source: firstSlot.source,
      };
    });
    setGroupedBookings(newGroupedBookings);
  }, [bookings, timeSlots]);

  // EFFECT 4: Check for Post-Booking Confirmation
  useEffect(() => {
    const checkPendingConfirmations = () => {
      const now = new Date()
      if ((isSameDay(selectedDate, now) || isPast(selectedDate)) && !isInitializing) {
        const pending = groupedBookings.filter(group => { 
          if (group.status !== 'confirmed') return false
          const [hours, minutes] = group.endTime.split(':').map(Number)
          const bookingEndDateTime = new Date(selectedDate); // Clone date
          bookingEndDateTime.setHours(hours, minutes, 0, 0);
          return isPast(bookingEndDateTime)
        })
        setPendingConfirmation(pending)
      } else {
        setPendingConfirmation([])
      }
    }
    checkPendingConfirmations()
    const interval = setInterval(checkPendingConfirmations, 300000) 
    return () => clearInterval(interval)
  }, [groupedBookings, selectedDate, isInitializing])


  // --- DERIVED STATE & MEMOS ---
  const totalRevenue = useMemo(() => {
    return groupedBookings.reduce(
      (sum, group) => group.payment_status === "paid" ? sum + group.price : sum,
      0
    )
  }, [groupedBookings])

  const isSlotTaken = useCallback((slotId: string) => {
    return (
      bookings.some((b) => 
        b.slotId === slotId && 
        b.status !== 'completed' && 
        b.status !== 'cancelled'
      ) ||
      manualBlocks.some((b) => b.slotId === slotId)
    )
  }, [bookings, manualBlocks])
  
  // --- OPTIMIZATION / NEW FEATURE ---
  // Helper function to check if a slot's end time is in the past
  const isSlotInPast = useCallback((slotEndTime: string): boolean => {
    const now = new Date();
    const [hours, minutes] = slotEndTime.split(':').map(Number);
    const slotEndDateTime = new Date(selectedDate.getTime());
    slotEndDateTime.setHours(hours, minutes, 0, 0);
    return isPast(slotEndDateTime);
  }, [selectedDate]);


  // --- CRUD HANDLERS (OPTIMIZED) ---
  const handleAddBooking = useCallback(async () => {
    if (!newBooking.customerName || !newBooking.customerPhone || !newBooking.slotId || !newBooking.sport || !newBooking.price || !turf) {
      alert("Please fill all required fields"); return
    }
    setIsSubmitting(true)
    try {
      const { data: userData, error: userError } = await supabase
        .from("users").upsert({
          name: newBooking.customerName, phone: newBooking.customerPhone,
          email: newBooking.customerEmail || null,
        }, { onConflict: "phone" }).select("id").single()
      if (userError) throw userError
      
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings").insert({
          turf_id: turf.id,
          date: format(selectedDate, "yyyy-MM-dd"),
          slot: [newBooking.slotId],
          user_id: userData.id,
          status: "pending",
          payment_status: "pending",
          amount: Number(newBooking.price),
          sport: newBooking.sport,
        }).select("*, users (name, phone, email)").single()
      if (bookingError) throw bookingError
      
      const timeSlot = timeSlots.find(ts => ts.id === bookingData.slot[0])
      const addedBooking: BookingType = {
        id: bookingData.id, date: bookingData.date,
        slot: timeSlot ? timeSlot.time : "Unknown",
        slotId: bookingData.slot[0],
        endTime: timeSlot ? timeSlot.endTime : "00:00",
        customerName: bookingData.users?.name || "N/A",
        customerPhone: bookingData.users?.phone || "N/A",
        customerEmail: bookingData.users?.email || "N/A",
        sport: bookingData.sport, price: bookingData.amount,
        status: bookingData.status,
        payment_status: bookingData.payment_status,
        refund_amount: null,
        source: "manual",
      }
      setBookings(prev => [...prev, addedBooking])
      setNewBooking({ customerName: "", customerPhone: "", customerEmail: "", sport: "football", slotId: "", price: "" })
      setIsBookingModalOpen(false)
    } catch (error: any) {
      console.error("Error adding booking:", error)
      alert(`Error: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }, [newBooking, turf, selectedDate, timeSlots, bookings]);

  const handleOpenBlockModal = useCallback((slotId: string = "") => {
    setNewBlock({ slotId: slotId, reason: "", otherReason: "" });
    setIsBlockModalOpen(true);
  }, [setNewBlock, setIsBlockModalOpen]);
  
  const handleAddBlock = useCallback(async () => {
    if (!newBlock.slotId) { alert("Please select a slot"); return; }
    if (!newBlock.reason) { alert("Please select a reason"); return; }
    if (newBlock.reason === 'Others' && !newBlock.otherReason) {
      alert("Please specify a reason in the 'Other Reason' field"); return;
    }
    if (!turf) { alert("Turf is not loaded. Cannot block slot."); return; }

    setIsSubmitting(true)
    const reasonToSave = newBlock.reason === 'Others' ? newBlock.otherReason : null;
    
    try {
      const { data: blockData, error: blockError } = await supabase
        .from("bookings").insert({
          turf_id: turf.id,
          date: format(selectedDate, "yyyy-MM-dd"),
          slot: [newBlock.slotId],
          user_id: null, status: "blocked", payment_status: "n/a",
          amount: 0, 
          sport: reasonToSave,
        }).select().single()
      if (blockError) throw blockError
      
      const timeSlot = timeSlots.find(ts => ts.id === blockData.slot[0])
      const addedBlock: ManualBlockType = {
        id: blockData.id, date: blockData.date,
        slot: timeSlot ? timeSlot.time : "Unknown",
        slotId: blockData.slot[0],
        reason: blockData.sport,
      }
      setManualBlocks(prev => [...prev, addedBlock])
      setNewBlock({ slotId: "", reason: "", otherReason: "" })
      setIsBlockModalOpen(false)
    } catch (error: any) {
      console.error("Error adding block:", error)
      alert(`Error: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }, [newBlock, turf, selectedDate, timeSlots, manualBlocks]);

  const handleCancelBooking = useCallback(async (id: string) => {
    const ADVANCE_AMOUNT = 350;
    const group = groupedBookings.find(g => g.id === id);
    if (!group) { alert("Error: Could not find booking to cancel."); return; }
    const firstSlotTime = timeSlots.find(ts => ts.id === group.slotIds[0])?.time.split(' ')[0];
    if (!firstSlotTime) { alert("Error: Could not parse booking time."); return; }
    const [hours, minutes] = firstSlotTime.split(':').map(Number);
    const bookingDate = new Date(selectedDate.getTime()); 
    const bookingStartDateTime = bookingDate.setHours(hours, minutes, 0, 0);
    const now = new Date();
    const hoursRemaining = differenceInHours(bookingStartDateTime, now);
    let refundAmount = 0;
    let confirmMessage = "";
    if (hoursRemaining < 24) {
      refundAmount = 0;
      confirmMessage = `This booking is within 24 hours. The cancellation fee of ₹${ADVANCE_AMOUNT} applies (no refund). Are you sure you want to cancel?`;
    } else {
      if (group.payment_status === 'paid') { refundAmount = ADVANCE_AMOUNT; }
      else { refundAmount = 0; }
      confirmMessage = `This booking is eligible for a refund of ₹${refundAmount}. Proceed to initiate refund?`;
    }
    if (!confirm(confirmMessage)) return;
    
    const oldBookings = bookings;
    setBookings(bookings.map(b => b.id === id ? { ...b, status: 'cancelled', payment_status: 'refund_initiated', refund_amount: refundAmount } : b ))
    
    try {
      const { error } = await supabase.from("bookings").update({ status: 'cancelled', payment_status: 'refund_initiated', refund_amount: refundAmount }).eq("id", id);
      if (error) throw error;
    } catch (error: any) {
      console.error("Error initiating refund:", error);
      alert("Failed to initiate refund.");
      setBookings(oldBookings);
    }
  }, [groupedBookings, bookings, timeSlots, selectedDate]);

  const handleProcessRefund = useCallback(async (id: string) => {
    if (!confirm("Have you processed this refund externally? This action will mark the payment as 'refund processed'.")) return;
    const oldBookings = bookings;
    setBookings(bookings.map(b => b.id === id ? { ...b, payment_status: 'refund processed' } : b ));
    try {
      const { error } = await supabase.from("bookings").update({ payment_status: 'refund processed' }).eq("id", id);
      if (error) throw error;
    } catch (error: any) {
      console.error("Error processing refund:", error);
      alert("Failed to process refund.");
      setBookings(oldBookings);
    }
  }, [bookings]);

  const handleDeleteBlock = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to remove this block?")) return
    const oldBlocks = manualBlocks
    setManualBlocks(manualBlocks.filter((b) => b.id !== id))
    try {
      const { error } = await supabase.from("bookings").delete().eq("id", id)
      if (error) throw error;
    } catch (error: any) {
      console.error("Error removing block:", error)
      alert("Failed to remove block.")
      setManualBlocks(oldBlocks)
    }
  }, [manualBlocks]);

  const handleMarkCompleted = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to mark this booking as completed?")) return;
    const oldBookings = bookings
    setBookings(bookings.map(b => b.id === id ? { ...b, status: 'completed' } : b))
    setPendingConfirmation(pendingConfirmation.filter((b) => b.id !== id))
    try {
      const { data, error } = await supabase.from("bookings").update({ status: 'completed' }).eq('id', id).select()
      if (error) throw error; 
      if (data && data[0]) {
        setBookings(prevBookings => prevBookings.map(b => b.id === id ? { ...b, status: 'completed' } : b));
      } else {
        setBookings(oldBookings); 
      }
    } catch (error: any) {
      console.error("Error marking as completed:", error)
      alert("Failed to mark booking as completed.");
      setBookings(oldBookings)
    }
  }, [bookings, pendingConfirmation]);

  const handleSignOut = useCallback(() => {
    localStorage.removeItem("owner_id")
    router.push("/owner/login")
  }, [router]);

  // --- RENDER LOGIC ---

  if (isInitializing) {
    return <DashboardNotice message="Verifying your account..." />
  }
  if (pageError) {
    return <DashboardNotice message={pageError} isError />
  }
  if (!turf) {
    return <UnverifiedDashboard ownerName={owner?.name} />;
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Turf Owner Dashboard</h1>
          <p className="text-muted-foreground">
            Manage bookings for <span className="font-medium text-primary">{turf.name}</span>
          </p>
        </div>
        <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>
      
      {/* Pending Confirmation Section */}
      {pendingConfirmation.length > 0 && (
        <Card className="bg-card border-border rounded-xl border-primary/50">
          <CardHeader>
            <CardTitle className="text-lg text-primary flex items-center gap-2">
              <CheckCircle className="h-5 w-5" /> Pending Confirmation
            </CardTitle>
            <CardDescription>
              These bookings are finished. Please confirm they were completed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingConfirmation.map(group => (
              <Card key={group.id} className="bg-secondary border-border p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {group.startTime} - {group.endTime} - {group.customerName}
                      </p>
                      <p className="text-sm text-muted-foreground">{group.sport} • {group.customerPhone}</p>
                    </div>
                  </div>
                  <Button size="sm" className="bg-primary hover:bg-mint-dark text-white gap-2"
                    onClick={() => handleMarkCompleted(group.id)}>
                    <CheckCircle className="h-4 w-4" />
                    Mark as Completed
                  </Button>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <Card className="bg-card border-border rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-lg">Today's Bookings</CardTitle><CardDescription>
            {groupedBookings.filter(b => b.status !== 'cancelled' && b.status !== 'blocked').length} active booking{groupedBookings.length !== 1 && "s"}
          </CardDescription></CardHeader>
          <CardContent><div className="text-3xl font-bold text-primary">
            {groupedBookings.filter(b => b.status !== 'cancelled' && b.status !== 'blocked').length}
          </div></CardContent>
        </Card>
        <Card className="bg-card border-border rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-lg">Blocked Slots</CardTitle><CardDescription>
            {manualBlocks.length} slot{manualBlocks.length !== 1 && "s"} blocked
          </CardDescription></CardHeader>
          <CardContent><div className="text-3xl font-bold text-primary">{manualBlocks.length}</div></CardContent>
        </Card>
        <Card className="bg-card border-border rounded-xl sm:col-span-2 md:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-lg">Total Paid Revenue</CardTitle><CardDescription>
            From all paid bookings
          </CardDescription></CardHeader>
          <CardContent><div className="text-3xl font-bold text-primary">₹{totalRevenue}</div></CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        {/* Calendar (Desktop) */}
        <Card className="hidden md:block md:col-span-1 bg-card border-border rounded-xl">
          <CardHeader><CardTitle className="text-lg">Select Date</CardTitle></CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border-border"
            />
          </CardContent>
        </Card>

        {/* Schedule Tabs (All Screens) */}
        <Card className="col-span-1 md:col-span-3 bg-card border-border rounded-xl">
          <CardHeader>
            {/* Desktop Title */}
            <CardTitle className="hidden md:block text-lg">
              Schedule for {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </CardTitle>
            {/* Mobile Title + Popover Trigger */}
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="md:hidden text-lg font-semibold w-full justify-start px-1"
                >
                  {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  <CalendarIcon className="ml-auto h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) setSelectedDate(date);
                    setIsCalendarOpen(false);
                  }}
                  className="rounded-md border-border"
                />
              </PopoverContent>
            </Popover>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6 w-full grid grid-cols-2">
                <TabsTrigger value="bookings" className="flex items-center gap-2">
                  <Users className="h-4 w-4" /> Bookings
                </TabsTrigger>
                <TabsTrigger value="availability" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Availability
                </TabsTrigger>
              </TabsList>

              {pageError && (
                <div className="mb-4">
                  <DashboardNotice message={pageError} isError />
                </div>
              )}

              {/* Bookings Tab */}
              <TabsContent value="bookings" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Bookings</h3>
                  <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-primary hover:bg-mint-dark text-white gap-2">
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Add Booking</span>
                      </Button>
                    </DialogTrigger>
                    {/* Add Booking Dialog */}
                    <DialogContent className="sm:max-w-md bg-card border-border">
                      <DialogHeader><DialogTitle>Add Manual Booking</DialogTitle></DialogHeader>
                      <ScrollArea className="max-h-[70vh] sm:max-h-none">
                        <div className="space-y-4 py-4 px-6 sm:px-0">
                          <div className="space-y-2">
                            <Label htmlFor="customerName">Customer Name*</Label>
                            <Input id="customerName" value={newBooking.customerName} onChange={(e) => setNewBooking({ ...newBooking, customerName: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="customerPhone">Phone Number*</Label>
                            <Input id="customerPhone" value={newBooking.customerPhone} onChange={(e) => setNewBooking({ ...newBooking, customerPhone: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="customerEmail">Email (Optional)</Label>
                            <Input id="customerEmail" value={newBooking.customerEmail} onChange={(e) => setNewBooking({ ...newBooking, customerEmail: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="sport">Sport*</Label>
                            <Select value={newBooking.sport} onValueChange={(value) => setNewBooking({ ...newBooking, sport: value })}>
                              <SelectTrigger><SelectValue placeholder="Select sport" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="football">football</SelectItem>
                                <SelectItem value="cricket">Cricket</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="slot">Time Slot*</Label>
                            <Select value={newBooking.slotId} onValueChange={(value) => setNewBooking({ ...newBooking, slotId: value })}>
                              <SelectTrigger><SelectValue placeholder="Select time slot" /></SelectTrigger>
                              <SelectContent>
                                {timeSlots.map((slot) => {
                                  // --- UPDATED: Disable past slots ---
                                  const isPastSlot = isSlotInPast(slot.endTime);
                                  return (
                                    <SelectItem 
                                      key={slot.id} 
                                      value={slot.id} 
                                      disabled={isSlotTaken(slot.id) || isPastSlot}
                                    >
                                      {slot.time} 
                                      {isSlotTaken(slot.id) && " (Booked)"}
                                      {isPastSlot && " (Past)"}
                                    </SelectItem>
                                  )
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="price">Price (₹)*</Label>
                            <Input id="price" value={newBooking.price} type="number" onChange={(e) => setNewBooking({ ...newBooking, price: e.target.value })} />
                          </div>
                          <Button onClick={handleAddBooking} className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Add Booking"}
                          </Button>
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </div>

                {isBookingsLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : groupedBookings.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No bookings for this date.</div>
                ) : (
                  <div className="space-y-4">
                    {groupedBookings.map((group) => {
                      // --- UPDATED: Check if booking is in the past ---
                      const isPastBooking = isSlotInPast(group.endTime);
                      
                      return (
                        <Card 
                          key={group.id} 
                          className={cn(
                            "bg-secondary border-border",
                            (group.status === 'cancelled' || isPastBooking) && "opacity-60" // Fade past bookings
                          )}
                        >
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-start gap-4">
                                <div className="bg-primary/10 p-3 rounded-full hidden sm:flex">
                                  {group.status === 'cancelled' ? <XCircle className="h-5 w-5 text-red-500" /> 
                                  : <Clock className="h-5 w-5 text-primary" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className={cn("font-medium", group.status === 'cancelled' && "line-through")}>
                                      {group.startTime} - {group.endTime}
                                    </h4>
                                    <Badge variant={group.source === "app" ? "default" : "outline"} className={cn("text-xs", group.source === "app" ? "bg-primary text-white" : "bg-secondary text-primary border-primary")}>
                                      {group.source === "app" ? "App" : "Manual"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{group.customerName} • {group.customerPhone}</p>
                                  <p className="text-sm text-muted-foreground">{group.sport} • ₹{group.price}</p>
                                  
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <Badge variant={'secondary'} className={cn("capitalize",
                                        group.status === 'confirmed' ? 'bg-green-600 text-white' :
                                        group.status === 'pending' ? 'bg-yellow-500 text-black' :
                                        group.status === 'completed' ? 'bg-blue-600 text-white' :
                                        group.status === 'cancelled' ? 'bg-red-600 text-white' : '')}>
                                      {group.status}
                                    </Badge>
                                    <Badge variant={'secondary'} className={cn("capitalize",
                                      group.payment_status === 'paid' ? 'bg-green-600 text-white' : 
                                      group.payment_status === 'refund processed' ? 'bg-blue-500 text-white' :
                                      group.payment_status === 'refund_initiated' ? 'bg-orange-500 text-white' :
                                      group.payment_status === 'pending' ? 'bg-red-500 text-white' : '')}>
                                      Payment: {group.payment_status.replace('_', ' ')}
                                    </Badge>
                                    {group.refund_amount != null && (
                                      <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
                                        Refund: ₹{group.refund_amount}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 ml-auto">
                                {(group.status === 'pending' || group.status === 'confirmed') && (
                                  <Button
                                    variant="ghost" size="icon"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleCancelBooking(group.id)}
                                    title="Cancel Booking"
                                    // --- UPDATED: Disable if booking is in the past ---
                                    disabled={isPastBooking}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                                
                                {group.status === 'completed' && (
                                  <Button variant="ghost" size="icon" className="text-green-600" disabled title="Completed">
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )}

                                {group.status === 'cancelled' && group.payment_status === 'refund processed' && (
                                  <Button variant="ghost" size="icon" className="text-red-500" disabled title="Cancelled & Refund Processed">
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                )}

                                {group.status === 'cancelled' && group.payment_status === 'refund_initiated' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-2 border-primary text-primary hover:bg-primary/10 hover:text-primary"
                                    onClick={() => handleProcessRefund(group.id)}
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                    Process Refund (₹{group.refund_amount})
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Availability Tab */}
              <TabsContent value="availability" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Blocked Slots</h3>
                  <Dialog open={isBlockModalOpen} onOpenChange={setIsBlockModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-primary hover:bg-mint-dark text-white gap-2">
                        <Plus className="h-4 w-4" /> 
                        <span className="hidden sm:inline">Block Slot</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-card border-border">
                      <DialogHeader><DialogTitle>Block Time Slot</DialogTitle></DialogHeader>
                      <ScrollArea className="max-h-[70vh] sm:max-h-none">
                      <div className="space-y-4 py-4 px-6 sm:px-0">
                        <div className="space-y-2">
                          <Label htmlFor="slot-block">Time Slot*</Label>
                          <Select 
                            value={newBlock.slotId} 
                            onValueChange={(value) => setNewBlock({ ...newBlock, slotId: value })}
                            disabled={!!newBlock.slotId}
                          >
                            <SelectTrigger id="slot-block">
                              <SelectValue placeholder="Select time slot" />
                            </SelectTrigger>
                            <SelectContent>
                              {timeSlots.map((slot) => {
                                const isPastSlot = isSlotInPast(slot.endTime);
                                return (
                                  <SelectItem 
                                    key={slot.id} 
                                    value={slot.id} 
                                    disabled={isSlotTaken(slot.id) || isPastSlot}
                                  >
                                    {slot.time} 
                                    {isSlotTaken(slot.id) && " (Booked)"}
                                    {isPastSlot && " (Past)"}
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reason-select">Reason*</Label>
                          <Select value={newBlock.reason} onValueChange={(value) => setNewBlock({ ...newBlock, reason: value })}>
                            <SelectTrigger id="reason-select">
                              <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Booked (Offline)">Booked (Offline)</SelectItem>
                              <SelectItem value="Others">Others</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {newBlock.reason === 'Others' && (
                          <div className="space-y-2">
                            <Label htmlFor="other-reason">Other Reason*</Label>
                            <Input 
                              id="other-reason" 
                              value={newBlock.otherReason} 
                              onChange={(e) => setNewBlock({ ...newBlock, otherReason: e.target.value })} 
                              placeholder="e.g., Maintenance" 
                            />
                          </div>
                        )}
                        <Button onClick={handleAddBlock} className="w-full" disabled={isSubmitting}>
                          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Block Slot"}
                        </Button>
                      </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </div>

                {isBookingsLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                    {timeSlots.map((slot) => {
                      const booking = bookings.find((b) => b.slotId === slot.id)
                      const block = manualBlocks.find((b) => b.slotId === slot.id)
                      const isAvailable = !booking && !block
                      
                      const isPastSlot = isSlotInPast(slot.endTime);
                      
                      // This is true ONLY for available, past slots
                      const isClickable = isAvailable && !isPastSlot;

                      let statusText = "Available"
                      if (block) {
                        statusText = `Blocked: ${block.reason || 'Offline'}`
                      } else if (booking) {
                        if (booking.status === 'completed') {
                          statusText = `Completed: ${booking.customerName}`
                        } else if (booking.status === 'cancelled') {
                          statusText = `Cancelled: ${booking.customerName}` 
                        } else {
                          statusText = `Booked: ${booking.customerName}`
                        }
                      }
                      
                      return (
                        <Card 
                          key={slot.id}
                          onClick={() => isClickable ? handleOpenBlockModal(slot.id) : undefined}
                          className={cn("border",
                            // --- NEW LOGIC ---
                            // 1. Is it blocked?
                            block ? "bg-destructive/10 border-destructive/30" :
                            
                            // 2. Is it completed?
                            booking?.status === 'completed' ? "bg-green-700/10 border-green-700/30" :
                            
                            // 3. Is it cancelled?
                            booking?.status === 'cancelled' ? "bg-red-500/10 border-red-500/30" :
                            
                            // 4. Is it actively booked?
                            booking ? "bg-primary/10 border-primary/30" :
                            
                            // 5. Is it available AND in the past? (Greyed out)
                            (isAvailable && isPastSlot) ? "bg-secondary/20 border-border opacity-60 cursor-not-allowed" :
                            
                            // 6. Is it available AND in the future? (Clickable)
                            isAvailable ? "bg-secondary/50 cursor-pointer hover:border-primary" :
                            
                            // Fallback
                            "bg-secondary/50"
                            // --- END NEW LOGIC ---
                          )}
                        >
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{slot.time}</p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {statusText}
                                </p>
                              </div>
                              {block && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 -mr-2"
                                  disabled={isPastSlot} // Disable if in the past
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteBlock(block.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}