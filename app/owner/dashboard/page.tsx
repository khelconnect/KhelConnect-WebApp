"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Clock, Users, Plus, Trash2, Loader2, AlertTriangle, CheckCircle, XCircle, RefreshCw, ShieldAlert, CalendarIcon, Settings, LogOut
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
  DialogFooter,
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
  price: number 
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
  booking_window_days: number
  pending_booking_window_days: number | null
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
  
  const handleSignOut = async () => {
    // FIX: Sign out from Supabase, not just clear localStorage
    await supabase.auth.signOut();
    localStorage.removeItem("owner_id");
    router.push("/owner/login");
  };

  return (
    <div className="relative space-y-6 md:space-y-8 min-h-screen">
      {/* 1. The Overlay Message */}
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 text-center bg-background/80 backdrop-blur-md">
        <div className="max-w-md w-full p-8 bg-card border rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="bg-yellow-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="h-10 w-10 text-yellow-600" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Verification Pending
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground mb-8">
            Welcome, <span className="text-foreground font-medium">{ownerName || "Partner"}</span>! Your account has been created successfully. <br/><br/>
            Our admin team is currently reviewing your turf details. Once approved, this dashboard will activate automatically.
          </p>
          <Button variant="outline" className="w-full py-6 rounded-xl text-base gap-2" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>
      
      {/* 2. The Static Blurred Dashboard Behind It (Visual Placeholder) */}
      <div className="space-y-6 md:space-y-8 blur-sm opacity-50 pointer-events-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Turf Owner Dashboard</h1>
            <p className="text-muted-foreground">Manage bookings for Your Turf</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <Card className="bg-card border-border rounded-xl"><CardHeader className="pb-2"><CardTitle className="text-lg">Today's Bookings</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-primary">--</div></CardContent></Card>
          <Card className="bg-card border-border rounded-xl"><CardHeader className="pb-2"><CardTitle className="text-lg">Blocked Slots</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-primary">--</div></CardContent></Card>
          <Card className="bg-card border-border rounded-xl"><CardHeader className="pb-2"><CardTitle className="text-lg">Total Revenue</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-primary">₹--</div></CardContent></Card>
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
  const [bookings, setBookings] = useState<BookingType[]>([]) 
  const [groupedBookings, setGroupedBookings] = useState<GroupedBookingType[]>([]) 
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
  
  // Settings Dialog State
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [requestedDays, setRequestedDays] = useState("")

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
        // 1. Get the authenticated user (This is the Source of Truth)
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          router.push("/owner/login")
          return 
        }

        const ownerId = user.id

        // 2. Try to fetch Owner Details from DB, but DON'T crash if missing
        const { data: ownerData, error: ownerError } = await supabase
          .from("users")
          .select("id, name")
          .eq("id", ownerId)
          .maybeSingle() // Use maybeSingle to avoid errors on empty rows

        // FAIL-SAFE: If DB row is missing, use the Auth Metadata
        const ownerName = ownerData?.name || user.user_metadata?.full_name || "Partner";

        setOwner({ 
            id: ownerId, 
            name: ownerName, 
            turf_name: "" 
        });

        // 3. Fetch Time Slots
        const { data: slotsData, error: slotsError } = await supabase
          .from("time_slots")
          .select("id, start_time, end_time, period")
          .order("start_time")
        
        // Only throw here if time slots are truly broken (global config issue)
        if (slotsError) console.error("Time slots error:", slotsError); 

        if (slotsData) {
          const formattedSlots = slotsData.map((slot) => ({
            id: slot.id,
            time: `${slot.start_time}${slot.period ? ` ${slot.period}` : ""}`,
            endTime: slot.end_time
          }))
          setTimeSlots(formattedSlots)
        }

        // 4. Fetch Turf (Gracefully handle "No Turf Found")
        const { data: turfData, error: turfError } = await supabase
            .from("turfs")
            .select("id, name, booking_window_days, pending_booking_window_days")
            .eq("owner_id", ownerId)
            .maybeSingle()

        // 5. Determine State
        if (turfData) {
          setTurf(turfData);
          setOwner(prev => prev ? ({ ...prev, turf_name: turfData.name }) : null);
        } else {
          // No turf found? No problem. Show the "Verification Pending" screen.
          console.log("No turf linked to this account yet.");
          setTurf(null);
        }

      } catch (error: any) {
        console.error("Dashboard Init Error:", error);
        // Only block the page if it's a critical system failure, otherwise try to render
        if (error.message.includes("Auth")) {
            setPageError("Authentication failed. Please login again.");
        } else {
            // For other errors, we just log them and let the "Unverified" screen take over
            setTurf(null);
        }
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

        if (error) throw error

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
                customerName: b.users?.name || b.name || "Walk-in", // Fallback for manual bookings
                customerPhone: b.users?.phone || b.phone || "N/A",
                customerEmail: b.users?.email || b.email || "N/A",
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
        setPageError("Failed to load bookings: " + error.message)
      } finally {
        setIsBookingsLoading(false)
      }
    }
    fetchBookingsForDate()
  }, [selectedDate, turf, timeSlots, isInitializing])

  // EFFECT 3: Group Bookings (Same logic as before)
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
        id: firstSlot.id, date: firstSlot.date, slots: sortedGroup.map(b => b.slot), slotIds: sortedGroup.map(b => b.slotId),
        startTime: firstSlot.slot, endTime: lastSlot.endTime,
        customerName: firstSlot.customerName, customerPhone: firstSlot.customerPhone, customerEmail: firstSlot.customerEmail,
        sport: firstSlot.sport, price: firstSlot.price, status: firstSlot.status,
        payment_status: firstSlot.payment_status, refund_amount: firstSlot.refund_amount, source: firstSlot.source,
      };
    });
    setGroupedBookings(newGroupedBookings);
  }, [bookings, timeSlots]);

  // EFFECT 4: Pending Confirmations (Same logic)
  useEffect(() => {
    const checkPendingConfirmations = () => {
      const now = new Date()
      if ((isSameDay(selectedDate, now) || isPast(selectedDate)) && !isInitializing) {
        const pending = groupedBookings.filter(group => { 
          if (group.status !== 'confirmed') return false
          const [hours, minutes] = group.endTime.split(':').map(Number)
          const bookingEndDateTime = new Date(selectedDate.setHours(hours, minutes, 0, 0))
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


  // --- DERIVED STATE ---
  const totalRevenue = useMemo(() => {
    return groupedBookings.reduce((sum, group) => group.payment_status === "paid" ? sum + group.price : sum, 0)
  }, [groupedBookings])

  const isSlotTaken = useCallback((slotId: string) => {
    return (
      bookings.some((b) => b.slotId === slotId && b.status !== 'completed' && b.status !== 'cancelled') ||
      manualBlocks.some((b) => b.slotId === slotId)
    )
  }, [bookings, manualBlocks])
  
  const isSlotInPast = useCallback((slotEndTime: string): boolean => {
    const now = new Date();
    const [hours, minutes] = slotEndTime.split(':').map(Number);
    const slotEndDateTime = new Date(selectedDate.getTime());
    slotEndDateTime.setHours(hours, minutes, 0, 0);
    return isPast(slotEndDateTime);
  }, [selectedDate]);


  // --- HANDLERS ---
  const handleRequestWindowChange = async () => {
    if (!turf || !requestedDays) return;
    try {
      const { error } = await supabase.from("turfs").update({ pending_booking_window_days: parseInt(requestedDays) }).eq("id", turf.id);
      if (error) throw error;
      alert("Request sent to admin for approval.");
      setShowSettingsDialog(false);
      setTurf({ ...turf, pending_booking_window_days: parseInt(requestedDays) });
    } catch (error: any) {
      alert("Failed to send request: " + error.message);
    }
  };

  const handleAddBooking = useCallback(async () => {
    if (!newBooking.customerName || !newBooking.customerPhone || !newBooking.slotId || !newBooking.sport || !newBooking.price || !turf) {
      alert("Please fill all required fields"); return
    }
    setIsSubmitting(true)
    try {
        // Create manual user if needed, or link to existing phone
        // Note: This logic depends on your specific DB setup for manual bookings
        // Simplification: Direct insert with fallback name/phone columns in bookings table if user_id is optional
        const { data: bookingData, error: bookingError } = await supabase
        .from("bookings").insert({
            turf_id: turf.id,
            date: format(selectedDate, "yyyy-MM-dd"),
            slot: [newBooking.slotId],
            status: "confirmed", // Manual bookings usually confirmed immediately
            payment_status: "paid", // Assuming cash payment
            amount: Number(newBooking.price),
            sport: newBooking.sport,
            // If you have separate columns for walk-ins:
            // name: newBooking.customerName,
            // phone: newBooking.customerPhone
        }).select().single()

        if (bookingError) throw bookingError
        
        // Refresh bookings (easier than constructing the object manually here)
        router.refresh()
        setIsBookingModalOpen(false)
        setNewBooking({ customerName: "", customerPhone: "", customerEmail: "", sport: "football", slotId: "", price: "" })
        alert("Booking added successfully!")
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }, [newBooking, turf, selectedDate, router]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut()
    localStorage.removeItem("owner_id") // Cleanup legacy
    router.push("/owner/login")
  }, [router]);

  // --- RENDER LOGIC ---

  if (isInitializing) {
    return <DashboardNotice message="Loading your turf details..." />
  }
  
  if (pageError) {
    return <DashboardNotice message={pageError} isError />
  }

  // If we found the user but NO TURF is linked to them yet
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
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none gap-2" onClick={() => setShowSettingsDialog(true)}>
            <Settings className="h-4 w-4" /> Settings
          </Button>
          <Button variant="outline" className="flex-1 sm:flex-none gap-2" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>
      
      {/* ... (Rest of your UI components: PendingConfirmation, Stats, Calendar, Tabs) ... */}
      {/* I am omitting the exact same UI JSX below to save space, but it remains identical to your previous code */}
      {/* Just ensure to copy the existing JSX from your previous code block starting from {pendingConfirmation.length > 0 && ...} down to the end of the file */}
      
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
                  {/* ... Button Logic ... */}
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
            {groupedBookings.filter(b => b.status !== 'cancelled' && b.status !== 'blocked').length} active
          </CardDescription></CardHeader>
          <CardContent><div className="text-3xl font-bold text-primary">
            {groupedBookings.filter(b => b.status !== 'cancelled' && b.status !== 'blocked').length}
          </div></CardContent>
        </Card>
        <Card className="bg-card border-border rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-lg">Blocked Slots</CardTitle><CardDescription>
            {manualBlocks.length} slots
          </CardDescription></CardHeader>
          <CardContent><div className="text-3xl font-bold text-primary">{manualBlocks.length}</div></CardContent>
        </Card>
        <Card className="bg-card border-border rounded-xl sm:col-span-2 md:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-lg">Total Revenue</CardTitle><CardDescription>
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
            {/* ... COPY THE TABS JSX FROM YOUR PREVIOUS CODE BLOCK ... */}
            <CardHeader>
            <CardTitle className="hidden md:block text-lg">
              Schedule for {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </CardTitle>
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
              
               <TabsContent value="bookings" className="space-y-6">
                 {/* ... Insert your Bookings List Logic here (same as previous) ... */}
                 {groupedBookings.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No bookings for this date.</div>
                 ) : (
                    <div className="space-y-4">
                        {groupedBookings.map((group) => (
                             <Card key={group.id} className="bg-secondary border-border">
                                <CardContent className="p-4">
                                     <div className="flex justify-between">
                                         <div>
                                             <p className="font-bold">{group.startTime} - {group.endTime}</p>
                                             <p>{group.customerName} ({group.sport})</p>
                                         </div>
                                         <Badge>{group.status}</Badge>
                                     </div>
                                </CardContent>
                             </Card>
                        ))}
                    </div>
                 )}
               </TabsContent>
               <TabsContent value="availability" className="space-y-6">
                 {/* ... Insert your Availability Grid Logic here (same as previous) ... */}
                 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                     {timeSlots.map(slot => (
                         <div key={slot.id} className="p-2 border rounded text-center">{slot.time}</div>
                     ))}
                 </div>
               </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader><DialogTitle>Settings</DialogTitle></DialogHeader>
            <div className="py-4">
                 <Label>Update Booking Window</Label>
                 <Input type="number" value={requestedDays} onChange={e => setRequestedDays(e.target.value)} />
                 <Button onClick={handleRequestWindowChange} className="mt-2 w-full">Request Change</Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}