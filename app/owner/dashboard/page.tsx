"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Clock, Users, Plus, Trash2, Loader2, AlertTriangle, CheckCircle, XCircle, Settings, LogOut, CalendarIcon, Lock, StickyNote
} from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { format, isPast, isSameDay } from "date-fns"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// --- TYPES ---
type TimeSlotDisplay = { id: string; time: string; endTime: string }

type BookingType = {
  id: string; 
  date: string; 
  slot: string; 
  slotId: string; 
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
  notes?: string;
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
  notes?: string;
};

type ManualBlockType = { id: string; date: string; slot: string; slotId: string; reason: string | null }
type OwnerType = { id: string; name: string; turf_name: string }
type TurfType = { id: string; name: string; price: number; booking_window_days: number; pending_booking_window_days: number | null }

// --- HELPER COMPONENT ---
function DashboardNotice({ message, isError = false }: { message: string, isError?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
      {isError ? <AlertTriangle className="h-12 w-12 text-destructive mb-4" /> : <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />}
      <h3 className="text-xl font-semibold mb-2">{isError ? "An Error Occurred" : "Loading Dashboard"}</h3>
      <p className="text-muted-foreground max-w-md">{message}</p>
    </div>
  )
}

// --- UNVERIFIED COMPONENT ---
function UnverifiedDashboard({ ownerName }: { ownerName?: string }) {
  const router = useRouter();
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("owner_id");
    router.push("/owner/login");
  };
  return (
    <div className="relative space-y-6 md:space-y-8 min-h-screen">
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 text-center bg-background/80 backdrop-blur-md">
        <div className="max-w-md w-full p-8 bg-card border rounded-3xl shadow-2xl">
          <div className="bg-yellow-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="h-10 w-10 text-yellow-600" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Verification Pending</h2>
          <p className="text-base sm:text-lg text-muted-foreground mb-8">
            Welcome, <span className="text-foreground font-medium">{ownerName || "Partner"}</span>! <br/><br/>
            Our admin team is reviewing your turf details. This dashboard will activate automatically once approved.
          </p>
          <Button variant="outline" className="w-full py-6 rounded-xl text-base gap-2" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>
      <div className="space-y-6 md:space-y-8 blur-sm opacity-50 pointer-events-none">
        <h1 className="text-2xl font-bold">Turf Owner Dashboard</h1>
      </div>
    </div>
  );
}

// --- MAIN DASHBOARD COMPONENT ---
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
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [requestedDays, setRequestedDays] = useState("")

  // Form State
  const [newBooking, setNewBooking] = useState({
    sport: "football", slotId: "", comments: ""
  })
  
  // UPDATED: Added 'comments' to block state
  const [newBlock, setNewBlock] = useState({ 
    slotId: "", 
    sport: "football",
    reason: "", 
    otherReason: "",
    comments: "" 
  })

  // --- 1. INITIALIZE DASHBOARD ---
  useEffect(() => {
    const initializeDashboard = async () => {
      setIsInitializing(true)
      setPageError(null)
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) { router.push("/owner/login"); return }

        const ownerId = user.id
        const { data: ownerData } = await supabase.from("users").select("id, name").eq("id", ownerId).maybeSingle()
        setOwner({ id: ownerId, name: ownerData?.name || user.user_metadata?.full_name || "Partner", turf_name: "" });

        const { data: slotsData } = await supabase.from("time_slots").select("id, start_time, end_time, period").order("start_time")
        if (slotsData) {
          setTimeSlots(slotsData.map((slot) => ({
            id: slot.id, time: `${slot.start_time}${slot.period ? ` ${slot.period}` : ""}`, endTime: slot.end_time
          })))
        }

        const { data: turfData } = await supabase.from("turfs").select("id, name, price, booking_window_days, pending_booking_window_days").eq("owner_id", ownerId).maybeSingle()
        if (turfData) {
          setTurf(turfData);
          setOwner(prev => prev ? ({ ...prev, turf_name: turfData.name }) : null);
        } else {
          setTurf(null); 
        }
      } catch (error: any) {
        if (error.message.includes("Auth")) setPageError("Authentication failed.");
        else setTurf(null);
      } finally {
        setIsInitializing(false)
      }
    }
    initializeDashboard()
  }, [router])

  // --- 2. FETCH BOOKINGS & BLOCKS ---
  const fetchBookingsForDate = useCallback(async () => {
    if (isInitializing || !turf || timeSlots.length === 0) return
    setIsBookingsLoading(true)
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
          const displayTime = timeSlot ? timeSlot.time : "Unknown"
          const endTime = timeSlot ? timeSlot.endTime : "00:00"
          
          if (b.status === "blocked") {
            // Note: We use the 'notes' field as the reason for display
            newBlocks.push({
              id: b.id, date: b.date, slot: displayTime, slotId: slotId, reason: b.notes || b.sport,
            })
            // Add to Bookings list too so it's visible there
            newBookings.push({
                id: b.id, date: b.date, slot: displayTime, slotId: slotId, endTime: endTime,
                customerName: `Blocked: ${b.notes || b.sport}`,
                customerPhone: "N/A", customerEmail: "N/A",
                sport: b.sport, price: 0, status: "blocked",
                payment_status: "n/a", refund_amount: null, source: "manual",
                notes: b.notes
            })
          } else {
            newBookings.push({
              id: b.id, date: b.date, slot: displayTime, slotId: slotId, endTime: endTime,
              customerName: b.users?.name || b.name || "Walk-in Customer", 
              customerPhone: b.users?.phone || b.phone || "N/A",
              customerEmail: b.users?.email || b.email || "N/A",
              sport: b.sport, price: b.amount, status: b.status,
              payment_status: b.payment_status, refund_amount: b.refund_amount,
              source: b.user_id ? "app" : "manual",
              notes: b.notes
            })
          }
        })
      })
      setBookings(newBookings)
      setManualBlocks(newBlocks)
    } catch (error: any) {
      console.error("Fetch bookings error:", error);
    } finally {
      setIsBookingsLoading(false)
    }
  }, [selectedDate, turf, timeSlots, isInitializing]);

  useEffect(() => { fetchBookingsForDate() }, [fetchBookingsForDate]);

  // --- 3. GROUP BOOKINGS ---
  useEffect(() => {
    if (timeSlots.length === 0) return;
    const groups: { [key: string]: BookingType[] } = {};
    for (const booking of bookings) {
      if (!groups[booking.id]) { groups[booking.id] = [] }
      groups[booking.id].push(booking);
    }
    const newGroupedBookings: GroupedBookingType[] = Object.values(groups).map(group => {
      const sorted = group.sort((a, b) => timeSlots.findIndex(ts => ts.id === a.slotId) - timeSlots.findIndex(ts => ts.id === b.slotId));
      return {
        id: sorted[0].id, date: sorted[0].date, slots: sorted.map(b => b.slot), slotIds: sorted.map(b => b.slotId),
        startTime: sorted[0].slot, endTime: sorted[sorted.length - 1].endTime,
        customerName: sorted[0].customerName, customerPhone: sorted[0].customerPhone, customerEmail: sorted[0].customerEmail,
        sport: sorted[0].sport, price: sorted[0].price, status: sorted[0].status,
        payment_status: sorted[0].payment_status, refund_amount: sorted[0].refund_amount, source: sorted[0].source,
        notes: sorted[0].notes
      };
    });
    setGroupedBookings(newGroupedBookings);
  }, [bookings, timeSlots]);

  // --- 4. PENDING CONFIRMATION ---
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


  // --- HANDLERS ---
  const handleRequestWindowChange = async () => {
    if (!turf || !requestedDays) return;
    try {
      await supabase.from("turfs").update({ pending_booking_window_days: parseInt(requestedDays) }).eq("id", turf.id);
      alert("Request sent."); setShowSettingsDialog(false);
    } catch (e) { alert("Error sending request."); }
  };

  // HANDLER: Add Manual Booking
  const handleAddBooking = useCallback(async () => {
    if (!newBooking.slotId || !turf) return alert("Please select a slot");
    setIsSubmitting(true);
    try {
        const { error: bookingError } = await supabase.from("bookings").insert({
            turf_id: turf.id, 
            date: format(selectedDate, "yyyy-MM-dd"),
            slot: [newBooking.slotId], 
            status: "confirmed", 
            payment_status: "paid", 
            amount: Number(turf.price || 0), // Use base price
            sport: newBooking.sport,
            user_id: null, 
            notes: newBooking.comments
        });

        if (bookingError) throw bookingError;
        
        setIsBookingModalOpen(false); 
        alert("Booking added!");
        setNewBooking({ sport: "football", slotId: "", comments: "" });
        fetchBookingsForDate(); 
    } catch (e: any) { 
        console.error(e); alert("Error: " + e.message); 
    } finally { setIsSubmitting(false); }
  }, [newBooking, turf, selectedDate, fetchBookingsForDate]);

  // UPDATED HANDLER: Add Block with Sport & Comments
  const handleAddBlock = async () => {
      if(!newBlock.slotId || !turf) return;
      setIsSubmitting(true);
      
      let finalReason = newBlock.reason;
      if (newBlock.reason === "Others") finalReason = newBlock.otherReason;
      // Combine reason and comments for the notes field
      const fullNotes = newBlock.comments ? `${finalReason} - ${newBlock.comments}` : finalReason;

      try {
          const { error } = await supabase.from("bookings").insert({
              turf_id: turf.id, 
              date: format(selectedDate, "yyyy-MM-dd"), 
              slot: [newBlock.slotId], 
              status: "blocked", 
              payment_status: "n/a", 
              amount: 0, 
              sport: newBlock.sport, // <--- SAVING THE SPORT
              notes: fullNotes,      // <--- SAVING REASON + COMMENTS
              user_id: null 
          });
          if(error) throw error;
          setIsBlockModalOpen(false); 
          alert("Slot blocked.");
          setNewBlock({ slotId: "", sport: "football", reason: "", otherReason: "", comments: "" }); // Reset
          fetchBookingsForDate();
      } catch(e: any) { console.error(e); alert("Error: " + e.message); } finally { setIsSubmitting(false); }
  };

  const handleCancelBooking = async (id: string) => {
      if(!confirm("Cancel this booking?")) return;
      await supabase.from("bookings").update({ status: 'cancelled' }).eq("id", id);
      fetchBookingsForDate();
  };

  const handleMarkCompleted = async (id: string) => {
      await supabase.from("bookings").update({ status: 'completed' }).eq("id", id);
      fetchBookingsForDate();
  };

  const handleDeleteBlock = async (id: string) => {
      if(!confirm("Unblock slot?")) return;
      await supabase.from("bookings").delete().eq("id", id);
      fetchBookingsForDate();
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push("/owner/login"); };

  // --- RENDER ---
  const totalRevenue = groupedBookings.reduce((sum, g) => g.payment_status === "paid" ? sum + g.price : sum, 0);
  
  if (isInitializing) return <DashboardNotice message="Loading..." />;
  if (pageError) return <DashboardNotice message={pageError} isError />;
  if (!turf) return <UnverifiedDashboard ownerName={owner?.name} />;

  // Common UI State Logic
  const isSlotTaken = (slotId: string) => bookings.some(b => b.slotId === slotId && b.status !== 'cancelled' && b.status !== 'completed') || manualBlocks.some(b => b.slotId === slotId);
  const isSlotInPast = (endTime: string) => {
      const [h, m] = endTime.split(':').map(Number);
      return isPast(new Date(selectedDate).setHours(h, m, 0, 0));
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Turf Owner Dashboard</h1>
          <p className="text-muted-foreground">Manage bookings for <span className="font-medium text-primary">{turf.name}</span></p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowSettingsDialog(true)}>
            <Settings className="h-4 w-4" /> Settings
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border rounded-xl">
            <CardHeader className="pb-2"><CardTitle className="text-lg">Today's Bookings</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-primary">{groupedBookings.filter(b => b.status !== 'cancelled' && b.status !== 'blocked').length}</div></CardContent>
        </Card>
        <Card className="bg-card border-border rounded-xl">
            <CardHeader className="pb-2"><CardTitle className="text-lg">Blocked Slots</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-primary">{manualBlocks.length}</div></CardContent>
        </Card>
        <Card className="bg-card border-border rounded-xl">
            <CardHeader className="pb-2"><CardTitle className="text-lg">Total Revenue</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-primary">₹{totalRevenue}</div></CardContent>
        </Card>
      </div>

      {/* Pending Confirmation */}
      {pendingConfirmation.length > 0 && (
        <Card className="bg-card border-border rounded-xl border-primary/50">
          <CardHeader>
            <CardTitle className="text-lg text-primary flex items-center gap-2"><CheckCircle className="h-5 w-5" /> Pending Confirmation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingConfirmation.map(group => (
              <Card key={group.id} className="bg-secondary border-border p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{group.startTime} - {group.endTime} • {group.customerName}</p>
                    <p className="text-sm text-muted-foreground">{group.sport}</p>
                  </div>
                  <Button size="sm" onClick={() => handleMarkCompleted(group.id)}>Mark Completed</Button>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Calendar */}
        <Card className="hidden md:block md:col-span-1 bg-card border-border rounded-xl">
          <CardHeader><CardTitle className="text-lg">Select Date</CardTitle></CardHeader>
          <CardContent>
            <Calendar mode="single" selected={selectedDate} onSelect={d => d && setSelectedDate(d)} className="rounded-md border-border" />
          </CardContent>
        </Card>

        {/* Tabs Area */}
        <Card className="col-span-1 md:col-span-3 bg-card border-border rounded-xl">
          <CardHeader>
             <CardTitle className="hidden md:block text-lg">Schedule for {format(selectedDate, "EEEE, MMMM d, yyyy")}</CardTitle>
             <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
               <PopoverTrigger asChild><Button variant="ghost" className="md:hidden justify-start pl-0 text-lg font-semibold">{format(selectedDate, "PPP")} <CalendarIcon className="ml-2 h-4 w-4" /></Button></PopoverTrigger>
               <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={selectedDate} onSelect={d => { if(d) setSelectedDate(d); setIsCalendarOpen(false); }} /></PopoverContent>
             </Popover>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6 w-full grid grid-cols-2">
                <TabsTrigger value="bookings" className="gap-2"><Users className="h-4 w-4" /> Bookings</TabsTrigger>
                <TabsTrigger value="availability" className="gap-2"><Clock className="h-4 w-4" /> Availability</TabsTrigger>
              </TabsList>

              {/* BOOKINGS TAB */}
              <TabsContent value="bookings" className="space-y-6">
                 <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Bookings</h3>
                    <Button onClick={() => setIsBookingModalOpen(true)} className="gap-2"><Plus className="h-4 w-4"/> Add Booking</Button>
                 </div>
                 {isBookingsLoading ? <Loader2 className="animate-spin mx-auto"/> : groupedBookings.length === 0 ? <p className="text-center text-muted-foreground py-8">No bookings or blocks for this date.</p> : (
                    <div className="space-y-4">
                       {groupedBookings.map(group => {
                          const isPastBooking = isSlotInPast(group.endTime);
                          const isBlocked = group.status === 'blocked';
                          return (
                            <Card key={group.id} className={cn("bg-secondary border-border", (group.status === 'cancelled' || isPastBooking) && "opacity-60", isBlocked && "bg-destructive/5 border-destructive/20")}>
                               <CardContent className="p-4">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                     <div className="flex items-start gap-4">
                                        <div className={cn("p-3 rounded-full hidden sm:flex", isBlocked ? "bg-destructive/10" : "bg-primary/10")}>
                                           {group.status === 'cancelled' ? <XCircle className="h-5 w-5 text-red-500" /> : isBlocked ? <Lock className="h-5 w-5 text-destructive" /> : <Clock className="h-5 w-5 text-primary" />}
                                        </div>
                                        <div>
                                           <div className="flex items-center gap-2">
                                              <h4 className={cn("font-medium", group.status === 'cancelled' && "line-through")}>{group.startTime} - {group.endTime}</h4>
                                              <Badge variant={group.source === "app" ? "default" : "outline"} className="text-xs">{group.source === "app" ? "App" : "Manual"}</Badge>
                                           </div>
                                           <p className="text-sm text-muted-foreground font-medium">{group.customerName}</p>
                                           {group.notes && <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1"><StickyNote className="h-3 w-3"/> {group.notes}</div>}
                                           {!isBlocked && <p className="text-sm text-muted-foreground mt-1">{group.sport} • {group.customerPhone} • ₹{group.price}</p>}
                                           
                                           <div className="flex flex-wrap gap-2 mt-2">
                                              <Badge variant="secondary" className={cn("capitalize", 
                                                group.status === 'confirmed' ? 'bg-green-600 text-white' : 
                                                group.status === 'pending' ? 'bg-yellow-500 text-black' : 
                                                group.status === 'cancelled' ? 'bg-red-600 text-white' : 
                                                isBlocked ? 'bg-destructive text-white' : '')}>{group.status}</Badge>
                                              {!isBlocked && <Badge variant="secondary" className={cn("capitalize", group.payment_status === 'paid' ? 'bg-green-600 text-white' : 'bg-red-500 text-white')}>Payment: {group.payment_status}</Badge>}
                                           </div>
                                        </div>
                                     </div>
                                     <div className="flex items-center gap-2 ml-auto">
                                        {(group.status === 'pending' || group.status === 'confirmed') && (
                                           <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleCancelBooking(group.id)} disabled={isPastBooking}><Trash2 className="h-4 w-4"/></Button>
                                        )}
                                        {isBlocked && (
                                           <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 gap-2" onClick={() => handleDeleteBlock(group.id)}><Trash2 className="h-4 w-4"/> Unblock</Button>
                                        )}
                                        {group.status === 'completed' && <Button variant="ghost" size="icon" className="text-green-600" disabled><CheckCircle className="h-4 w-4"/></Button>}
                                     </div>
                                  </div>
                               </CardContent>
                            </Card>
                          )
                       })}
                    </div>
                 )}
              </TabsContent>

              {/* AVAILABILITY TAB */}
              <TabsContent value="availability" className="space-y-6">
                 <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Slot Management</h3>
                    <Button onClick={() => setIsBlockModalOpen(true)} className="gap-2"><Plus className="h-4 w-4"/> Block Slot</Button>
                 </div>
                 {isBookingsLoading ? <Loader2 className="animate-spin mx-auto"/> : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                       {timeSlots.map(slot => {
                          const booking = bookings.find(b => b.slotId === slot.id && b.status !== 'cancelled') || bookings.find(b => b.slotId === slot.id);
                          const block = manualBlocks.find(b => b.slotId === slot.id);
                          const isAvailable = !booking && !block;
                          const isPastSlot = isSlotInPast(slot.endTime);
                          
                          let statusText = "Available";
                          let bgColor = "bg-secondary/50";
                          let borderColor = "";
                          
                          if (block) {
                             statusText = `Blocked: ${block.reason || 'Offline'}`;
                             bgColor = "bg-destructive/10 border-destructive/30";
                          } else if (booking) {
                             statusText = booking.status === 'completed' ? `Completed: ${booking.customerName}` : `Booked: ${booking.customerName}`;
                             bgColor = booking.status === 'completed' ? "bg-green-700/10 border-green-700/30" : "bg-primary/10 border-primary/30";
                          } else if (isAvailable && isPastSlot) {
                             bgColor = "bg-secondary/20 opacity-60 cursor-not-allowed";
                          } else if (isAvailable) {
                             bgColor = "bg-secondary/50 cursor-pointer hover:border-primary";
                          }

                          return (
                             <Card 
                               key={slot.id} 
                               onClick={() => isAvailable && !isPastSlot ? (setNewBlock({ slotId: slot.id, sport: "football", reason: "", otherReason: "", comments: "" }), setIsBlockModalOpen(true)) : undefined}
                               className={cn("border", bgColor, borderColor)}
                             >
                               <CardContent className="p-3 sm:p-4">
                                  <div className="flex justify-between items-center">
                                     <div>
                                        <p className="font-medium">{slot.time}</p>
                                        <p className="text-sm text-muted-foreground truncate w-24 sm:w-auto">{statusText}</p>
                                     </div>
                                     {block && (
                                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 -mr-2" onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id); }}><Trash2 className="h-4 w-4"/></Button>
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

      {/* --- DIALOGS --- */}
      {/* 1. Add Booking Dialog (Simplified) */}
      <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
           <DialogHeader><DialogTitle>Add Manual Booking</DialogTitle></DialogHeader>
           <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Sport</Label><Select value={newBooking.sport} onValueChange={v => setNewBooking({...newBooking, sport: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="football">Football</SelectItem><SelectItem value="cricket">Cricket</SelectItem><SelectItem value="badminton">Badminton</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Slot</Label><Select value={newBooking.slotId} onValueChange={v => setNewBooking({...newBooking, slotId: v})}><SelectTrigger><SelectValue placeholder="Select Slot"/></SelectTrigger><SelectContent>{timeSlots.map(s => <SelectItem key={s.id} value={s.id} disabled={isSlotTaken(s.id) || isSlotInPast(s.endTime)}>{s.time} {isSlotTaken(s.id) ? '(Booked)' : ''}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Comments</Label><Input placeholder="e.g. Walk-in, Paid UPI" value={newBooking.comments} onChange={e => setNewBooking({...newBooking, comments: e.target.value})}/></div>
              <Button onClick={handleAddBooking} className="w-full" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin"/> : "Confirm Booking"}</Button>
           </div>
        </DialogContent>
      </Dialog>

      {/* 2. Block Slot Dialog (Updated with Sport & Comments) */}
      <Dialog open={isBlockModalOpen} onOpenChange={setIsBlockModalOpen}>
         <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader><DialogTitle>Block Slot</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
               
               {/* Sport Field */}
               <div className="space-y-2">
                  <Label>Sport Category</Label>
                  <Select value={newBlock.sport} onValueChange={v => setNewBlock({...newBlock, sport: v})}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="football">Football</SelectItem>
                      <SelectItem value="cricket">Cricket</SelectItem>
                      <SelectItem value="badminton">Badminton</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
               </div>

               <div className="space-y-2">
                  <Label>Slot</Label>
                  <Select value={newBlock.slotId} onValueChange={v => setNewBlock({...newBlock, slotId: v})} disabled={!!newBlock.slotId && !timeSlots.find(s => s.id === newBlock.slotId)?.time}>
                    <SelectTrigger><SelectValue placeholder="Select Slot"/></SelectTrigger>
                    <SelectContent>{timeSlots.map(s => <SelectItem key={s.id} value={s.id} disabled={isSlotTaken(s.id) || isSlotInPast(s.endTime)}>{s.time}</SelectItem>)}</SelectContent>
                  </Select>
               </div>

               <div className="space-y-2">
                  <Label>Reason</Label>
                  <Select value={newBlock.reason || ''} onValueChange={v => setNewBlock({...newBlock, reason: v})}>
                    <SelectTrigger><SelectValue placeholder="Select Reason"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Personal">Personal</SelectItem>
                      <SelectItem value="Offline Booking">Offline Booking</SelectItem>
                      <SelectItem value="Others">Others</SelectItem>
                    </SelectContent>
                  </Select>
               </div>

               {newBlock.reason === "Others" && (
                 <div className="space-y-2">
                   <Label>Specify Reason</Label>
                   <Input value={newBlock.otherReason} onChange={e => setNewBlock({...newBlock, otherReason: e.target.value})} placeholder="e.g. Tournament" />
                 </div>
               )}

               {/* Comments Field */}
               <div className="space-y-2">
                  <Label>Additional Comments</Label>
                  <Input value={newBlock.comments} onChange={e => setNewBlock({...newBlock, comments: e.target.value})} placeholder="Optional details..." />
               </div>

               <Button onClick={handleAddBlock} className="w-full" disabled={isSubmitting}>Block Slot</Button>
            </div>
         </DialogContent>
      </Dialog>

      {/* 3. Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
         <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader><DialogTitle>Settings</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
               <div className="space-y-2"><Label>Request Booking Window (Days)</Label><Input type="number" value={requestedDays} onChange={e => setRequestedDays(e.target.value)}/></div>
               <Button onClick={handleRequestWindowChange} className="w-full">Submit Request</Button>
            </div>
         </DialogContent>
      </Dialog>

    </div>
  )
}