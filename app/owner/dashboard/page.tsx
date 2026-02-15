"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Clock, Users, Plus, Trash2, AlertTriangle, CheckCircle, XCircle, Settings, LogOut, CalendarIcon, Lock, StickyNote, ChevronDown, Filter, RefreshCw, DollarSign, TrendingUp, Activity
} from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { format, isPast, isSameDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { UniversalLoader } from "@/components/ui/universal-loader"

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
  created_at?: string; // Needed for stats
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
type OwnerType = { id: string; name: string; }
type TurfType = { id: string; name: string; price: number; booking_window_days: number; pending_booking_window_days: number | null }

// --- HELPER COMPONENT: PULSE WIDGET ---
function StatsWidget({ title, value, subtext, icon: Icon, colorClass }: { title: string, value: string | number, subtext?: string, icon: any, colorClass: string }) {
    return (
        <div className={cn("relative overflow-hidden rounded-2xl p-6 border shadow-sm transition-all hover:shadow-md", colorClass)}>
            <div className="flex justify-between items-start relative z-10">
                <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
                    <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
                    {subtext && <p className="text-xs mt-1 opacity-80">{subtext}</p>}
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Icon className="h-6 w-6 opacity-90" />
                </div>
            </div>
            {/* Decorative BG Blob */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
        </div>
    )
}

// --- HELPER COMPONENT: DASHBOARD NOTICE (RESTORED) ---
function DashboardNotice({ message, isError = false }: { message: string, isError?: boolean }) {
  if (!isError) return <UniversalLoader />;
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
      <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
      <h3 className="text-xl font-semibold mb-2">An Error Occurred</h3>
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
  
  // Multi-Turf State
  const [allTurfs, setAllTurfs] = useState<TurfType[]>([])
  const [selectedTurf, setSelectedTurf] = useState<TurfType | null>(null)

  const [timeSlots, setTimeSlots] = useState<TimeSlotDisplay[]>([])
  const [bookings, setBookings] = useState<BookingType[]>([]) 
  const [allMonthBookings, setAllMonthBookings] = useState<BookingType[]>([]) // For Stats
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

  // Filters State
  const [filterSport, setFilterSport] = useState("all")
  const [filterPayment, setFilterPayment] = useState("all")
  const [filterSource, setFilterSource] = useState("all")

  // Form State
  const [newBooking, setNewBooking] = useState({ sport: "football", slotId: "", comments: "" })
  const [newBlock, setNewBlock] = useState({ slotId: "", sport: "football", reason: "", otherReason: "", comments: "" })

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
        setOwner({ id: ownerId, name: ownerData?.name || user.user_metadata?.full_name || "Partner" });

        const { data: slotsData } = await supabase.from("time_slots").select("id, start_time, end_time, period").order("start_time")
        if (slotsData) {
          setTimeSlots(slotsData.map((slot) => ({
            id: slot.id, time: `${slot.start_time}${slot.period ? ` ${slot.period}` : ""}`, endTime: slot.end_time
          })))
        }

        const { data: turfsData } = await supabase.from("turfs")
            .select("id, name, price, booking_window_days, pending_booking_window_days")
            .eq("turf_owner_id", ownerId);
        
        if (turfsData && turfsData.length > 0) {
          setAllTurfs(turfsData);
          setSelectedTurf(turfsData[0]); 
        } else {
          setAllTurfs([]);
          setSelectedTurf(null); 
        }
      } catch (error: any) {
        if (error.message.includes("Auth")) setPageError("Authentication failed.");
      } finally {
        setIsInitializing(false)
      }
    }
    initializeDashboard()
  }, [router])

  // --- 2. FETCH BOOKINGS (Stats & Daily) ---
  const fetchBookingsData = useCallback(async () => {
    if (isInitializing || !selectedTurf || timeSlots.length === 0) return
    setIsBookingsLoading(true)
    const formattedDate = format(selectedDate, "yyyy-MM-dd")
    
    // Fetch stats range (Current Month)
    const monthStart = format(startOfMonth(selectedDate), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(selectedDate), "yyyy-MM-dd");

    try {
      // Fetch ALL bookings for the month (for stats)
      const { data: monthData } = await supabase
        .from("bookings")
        .select("*, users (name, phone, email)")
        .eq("turf_id", selectedTurf.id)
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .neq("status", "cancelled")

      if (monthData) {
          const formattedMonthData = monthData.map((b:any) => ({
             ...b,
             slotId: b.slot[0], // Flatten for stats simplicity
             customerName: b.users?.name || b.name || "Walk-in"
          }));
          setAllMonthBookings(formattedMonthData);
      }

      // Filter for Selected Date View
      const dailyData = monthData?.filter((b: any) => b.date === formattedDate) || [];
      
      const newBookings: BookingType[] = []
      const newBlocks: ManualBlockType[] = []

      dailyData.forEach((b: any) => {
        b.slot.forEach((slotId: string) => {
          const timeSlot = timeSlots.find(ts => ts.id === slotId)
          const displayTime = timeSlot ? timeSlot.time : "Unknown"
          const endTime = timeSlot ? timeSlot.endTime : "00:00"
          
          if (b.status === "blocked") {
            newBlocks.push({ id: b.id, date: b.date, slot: displayTime, slotId: slotId, reason: b.notes || b.sport })
            newBookings.push({
                id: b.id, date: b.date, slot: displayTime, slotId: slotId, endTime: endTime,
                customerName: `Blocked: ${b.notes || b.sport}`, customerPhone: "N/A", customerEmail: "N/A",
                sport: b.sport, price: 0, status: "blocked", payment_status: "n/a", refund_amount: null, source: "manual", notes: b.notes
            })
          } else {
            newBookings.push({
              id: b.id, date: b.date, slot: displayTime, slotId: slotId, endTime: endTime,
              customerName: b.users?.name || b.name || "Walk-in Customer", 
              customerPhone: b.users?.phone || b.phone || "N/A",
              customerEmail: b.users?.email || b.email || "N/A",
              sport: b.sport, price: b.amount, status: b.status,
              payment_status: b.payment_status, refund_amount: b.refund_amount, source: b.user_id ? "app" : "manual", notes: b.notes
            })
          }
        })
      })
      setBookings(newBookings)
      setManualBlocks(newBlocks)
    } catch (error: any) { console.error("Fetch bookings error:", error); } 
    finally { setIsBookingsLoading(false) }
  }, [selectedDate, selectedTurf, timeSlots, isInitializing]);

  useEffect(() => { fetchBookingsData() }, [fetchBookingsData]);

  // --- 3. FILTER & GROUP BOOKINGS ---
  const filteredBookings = useMemo(() => {
      return bookings.filter(b => {
          if (filterSport !== 'all' && b.sport.toLowerCase() !== filterSport.toLowerCase()) return false;
          if (filterPayment !== 'all' && b.payment_status !== filterPayment) return false;
          if (filterSource !== 'all' && b.source !== filterSource) return false;
          return true;
      });
  }, [bookings, filterSport, filterPayment, filterSource]);

  useEffect(() => {
    if (timeSlots.length === 0) return;
    const groups: { [key: string]: BookingType[] } = {};
    for (const booking of filteredBookings) {
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
        payment_status: sorted[0].payment_status, refund_amount: sorted[0].refund_amount, source: sorted[0].source, notes: sorted[0].notes
      };
    });
    setGroupedBookings(newGroupedBookings);
  }, [filteredBookings, timeSlots]);

  // --- 4. REAL-TIME STATS CALCULATION ---
  const stats = useMemo(() => {
      const now = new Date();
      const todayStr = format(now, "yyyy-MM-dd");
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);

      const dailyRevenue = allMonthBookings.filter(b => b.date === todayStr && b.payment_status === 'paid').reduce((acc, curr) => acc + curr.price, 0);
      const weeklyRevenue = allMonthBookings.filter(b => isWithinInterval(parseISO(b.date), { start: weekStart, end: weekEnd }) && b.payment_status === 'paid').reduce((acc, curr) => acc + curr.price, 0);
      const monthlyRevenue = allMonthBookings.filter(b => b.payment_status === 'paid').reduce((acc, curr) => acc + curr.price, 0);
      
      const totalBookingsToday = allMonthBookings.filter(b => b.date === todayStr).length;
      
      return { dailyRevenue, weeklyRevenue, monthlyRevenue, totalBookingsToday };
  }, [allMonthBookings]);

  // --- HANDLERS ---
  const handleRequestWindowChange = async () => {
    if (!selectedTurf || !requestedDays) return;
    try {
      await supabase.from("turfs").update({ pending_booking_window_days: parseInt(requestedDays) }).eq("id", selectedTurf.id);
      alert("Request sent."); setShowSettingsDialog(false);
    } catch (e) { alert("Error sending request."); }
  };

  const handleAddBooking = useCallback(async () => {
    if (!newBooking.slotId || !selectedTurf) return alert("Please select a slot");
    setIsSubmitting(true);
    try {
        const { error: bookingError } = await supabase.from("bookings").insert({
            turf_id: selectedTurf.id, date: format(selectedDate, "yyyy-MM-dd"), slot: [newBooking.slotId], 
            status: "confirmed", payment_status: "paid", amount: Number(selectedTurf.price || 0),
            sport: newBooking.sport, user_id: null, notes: newBooking.comments
        });
        if (bookingError) throw bookingError;
        setIsBookingModalOpen(false); alert("Booking added!");
        setNewBooking({ sport: "football", slotId: "", comments: "" });
        fetchBookingsData(); 
    } catch (e: any) { console.error(e); alert("Error: " + e.message); } finally { setIsSubmitting(false); }
  }, [newBooking, selectedTurf, selectedDate, fetchBookingsData]);

  const handleAddBlock = async () => {
      if(!newBlock.slotId || !selectedTurf) return;
      setIsSubmitting(true);
      let finalReason = newBlock.reason;
      if (newBlock.reason === "Others") finalReason = newBlock.otherReason;
      const fullNotes = newBlock.comments ? `${finalReason} - ${newBlock.comments}` : finalReason;
      try {
          const { error } = await supabase.from("bookings").insert({
              turf_id: selectedTurf.id, date: format(selectedDate, "yyyy-MM-dd"), slot: [newBlock.slotId], 
              status: "blocked", payment_status: "n/a", amount: 0, sport: newBlock.sport, notes: fullNotes, user_id: null 
          });
          if(error) throw error;
          setIsBlockModalOpen(false); alert("Slot blocked.");
          setNewBlock({ slotId: "", sport: "football", reason: "", otherReason: "", comments: "" }); 
          fetchBookingsData();
      } catch(e: any) { console.error(e); alert("Error: " + e.message); } finally { setIsSubmitting(false); }
  };

  const handleCancelBooking = async (id: string) => {
      if(!confirm("Cancel this booking?")) return;
      await supabase.from("bookings").update({ status: 'cancelled' }).eq("id", id);
      fetchBookingsData();
  };

  const handleMarkCompleted = async (id: string) => {
      await supabase.from("bookings").update({ status: 'completed' }).eq("id", id);
      fetchBookingsData();
  };

  const handleDeleteBlock = async (id: string) => {
      if(!confirm("Unblock slot?")) return;
      await supabase.from("bookings").delete().eq("id", id);
      fetchBookingsData();
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push("/owner/login"); };

  if (isInitializing) return <DashboardNotice message="Loading..." />;
  if (pageError) return <DashboardNotice message={pageError} isError />;
  if (!selectedTurf) return <UnverifiedDashboard ownerName={owner?.name} />;

  const isSlotTaken = (slotId: string) => {
    return bookings.some(b => b.slotId === slotId && b.status !== 'cancelled') || manualBlocks.some(b => b.slotId === slotId);
  }; 
  const isSlotInPast = (endTime: string) => {
      const [h, m] = endTime.split(':').map(Number);
      return isPast(new Date(selectedDate).setHours(h, m, 0, 0));
  };

  return (
    <div className="space-y-6 md:space-y-8 p-4 md:p-8 max-w-[1600px] mx-auto">
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {allTurfs.length > 0 ? (
             <div className="flex flex-col">
                <Label className="text-muted-foreground text-xs uppercase font-bold mb-1 tracking-wider">Active Turf</Label>
                <Select value={selectedTurf.id} onValueChange={(id) => { const newTurf = allTurfs.find(t => t.id === id); if(newTurf) setSelectedTurf(newTurf); }}>
                    <SelectTrigger className="w-full md:w-[350px] h-auto text-3xl font-black border-none bg-transparent p-0 shadow-none focus:ring-0 px-0 hover:text-primary transition-colors">
                        <SelectValue>{selectedTurf.name}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {allTurfs.map(t => <SelectItem key={t.id} value={t.id} className="font-bold">{t.name}</SelectItem>)}
                    </SelectContent>
                </Select>
             </div>
          ) : (
             <h1 className="text-2xl sm:text-3xl font-bold mb-2">{selectedTurf.name} Dashboard</h1>
          )}
          <p className="text-muted-foreground">Managerial Overview</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 rounded-full" onClick={() => fetchBookingsData()}><RefreshCw className={cn("h-4 w-4", isBookingsLoading && "animate-spin")} /> Refresh</Button>
          <Button variant="outline" size="icon" className="rounded-full" onClick={() => setShowSettingsDialog(true)}><Settings className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="rounded-full text-destructive" onClick={handleSignOut}><LogOut className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* --- LIVE PULSE WIDGETS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsWidget title="Today's Revenue" value={`₹${stats.dailyRevenue}`} subtext="Processed today" icon={DollarSign} colorClass="bg-emerald-500/10 border-emerald-500/20 text-emerald-700" />
        <StatsWidget title="Weekly Revenue" value={`₹${stats.weeklyRevenue}`} subtext="This week" icon={TrendingUp} colorClass="bg-blue-500/10 border-blue-500/20 text-blue-700" />
        <StatsWidget title="Monthly Revenue" value={`₹${stats.monthlyRevenue}`} subtext="This month" icon={Activity} colorClass="bg-purple-500/10 border-purple-500/20 text-purple-700" />
        <StatsWidget title="Today's Bookings" value={stats.totalBookingsToday} subtext="Total slots booked" icon={Users} colorClass="bg-orange-500/10 border-orange-500/20 text-orange-700" />
      </div>

      {/* --- MAIN CONTENT GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Calendar (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
            <Card className="bg-card border-border rounded-3xl overflow-hidden shadow-sm">
                <CardHeader className="bg-secondary/30 pb-4"><CardTitle className="text-lg">Select Date</CardTitle></CardHeader>
                <CardContent className="p-0">
                    <Calendar mode="single" selected={selectedDate} onSelect={d => d && setSelectedDate(d)} className="w-full border-t" />
                </CardContent>
            </Card>
        </div>

        {/* RIGHT: Tabs & Data (9 cols) */}
        <div className="lg:col-span-9">
            <Card className="bg-card border-border rounded-3xl shadow-sm h-full flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between pb-0">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="flex justify-between items-center mb-6">
                            <TabsList className="bg-secondary/50 rounded-full h-12 p-1">
                                <TabsTrigger value="bookings" className="rounded-full px-6 h-10 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"><Users className="h-4 w-4" /> Bookings</TabsTrigger>
                                <TabsTrigger value="availability" className="rounded-full px-6 h-10 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"><Clock className="h-4 w-4" /> Slot Grid</TabsTrigger>
                            </TabsList>
                            
                            {/* ACTION BUTTONS */}
                            <div className="flex gap-2">
                                {activeTab === 'bookings' ? (
                                    <Button onClick={() => setIsBookingModalOpen(true)} className="rounded-full shadow-lg bg-primary hover:bg-primary/90 text-white gap-2"><Plus className="h-4 w-4"/> Manual Booking</Button>
                                ) : (
                                    <Button onClick={() => setIsBlockModalOpen(true)} variant="destructive" className="rounded-full shadow-lg gap-2"><Lock className="h-4 w-4"/> Block Slot</Button>
                                )}
                            </div>
                        </div>

                        {/* --- SMART FILTERS BAR --- */}
                        {activeTab === 'bookings' && (
                            <div className="flex flex-wrap gap-3 mb-6 p-4 bg-secondary/20 rounded-2xl border border-border/50">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mr-2"><Filter className="h-4 w-4" /> Filters:</div>
                                <Select value={filterSport} onValueChange={setFilterSport}>
                                    <SelectTrigger className="h-8 w-[130px] rounded-full text-xs bg-background border-border"><SelectValue placeholder="Sport" /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">All Sports</SelectItem><SelectItem value="football">Football</SelectItem><SelectItem value="cricket">Cricket</SelectItem></SelectContent>
                                </Select>
                                <Select value={filterPayment} onValueChange={setFilterPayment}>
                                    <SelectTrigger className="h-8 w-[130px] rounded-full text-xs bg-background border-border"><SelectValue placeholder="Payment" /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectContent>
                                </Select>
                                <Select value={filterSource} onValueChange={setFilterSource}>
                                    <SelectTrigger className="h-8 w-[130px] rounded-full text-xs bg-background border-border"><SelectValue placeholder="Source" /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">All Sources</SelectItem><SelectItem value="app">App Booking</SelectItem><SelectItem value="manual">Manual</SelectItem></SelectContent>
                                </Select>
                                {(filterSport !== 'all' || filterPayment !== 'all' || filterSource !== 'all') && (
                                    <Button variant="ghost" size="sm" onClick={() => { setFilterSport('all'); setFilterPayment('all'); setFilterSource('all'); }} className="h-8 text-xs text-destructive hover:bg-destructive/10">Reset</Button>
                                )}
                            </div>
                        )}

                        <TabsContent value="bookings" className="mt-0">
                            {isBookingsLoading ? <div className="py-20"><UniversalLoader /></div> : groupedBookings.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-50">
                                    <CalendarIcon className="h-16 w-16 mb-4 stroke-1" />
                                    <p>No bookings match your filters for this date.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {groupedBookings.map(group => {
                                        const isPastBooking = isSlotInPast(group.endTime);
                                        const isBlocked = group.status === 'blocked';
                                        return (
                                            <div key={group.id} className={cn("group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl border border-border bg-card hover:shadow-md transition-all", isBlocked && "bg-destructive/5 border-destructive/20")}>
                                                <div className="flex items-center gap-4">
                                                    <div className={cn("h-12 w-12 rounded-full flex items-center justify-center shrink-0 font-bold text-lg", isBlocked ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
                                                        {isBlocked ? <Lock className="h-5 w-5"/> : group.startTime.split(':')[0]}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-bold text-base">{group.startTime} - {group.endTime}</h4>
                                                            <Badge variant={group.source === "app" ? "default" : "secondary"} className="text-[10px] h-5 px-2 rounded-md">{group.source === "app" ? "APP" : "MANUAL"}</Badge>
                                                            {group.status === 'pending' && <Badge variant="outline" className="text-yellow-600 border-yellow-600 text-[10px] h-5">PENDING</Badge>}
                                                        </div>
                                                        <p className="text-sm font-medium text-muted-foreground">{group.customerName} • <span className="capitalize">{group.sport}</span></p>
                                                        {group.notes && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><StickyNote className="h-3 w-3" /> {group.notes}</p>}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-4 mt-4 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                                                    {!isBlocked && <div className="text-right mr-4"><p className="font-bold text-lg">₹{group.price}</p><p className={cn("text-xs font-bold uppercase", group.payment_status === 'paid' ? "text-green-600" : "text-red-500")}>{group.payment_status}</p></div>}
                                                    <div className="flex gap-1">
                                                        {(group.status === 'pending' || group.status === 'confirmed') && (
                                                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10" onClick={() => handleCancelBooking(group.id)}><Trash2 className="h-4 w-4"/></Button>
                                                        )}
                                                        {isBlocked && (
                                                            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 gap-2 rounded-full" onClick={() => handleDeleteBlock(group.id)}><Trash2 className="h-4 w-4"/> Unblock</Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="availability" className="mt-0">
                            {isBookingsLoading ? <div className="py-20"><UniversalLoader /></div> : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {timeSlots.map(slot => {
                                        const booking = bookings.find(b => b.slotId === slot.id && b.status !== 'cancelled') || bookings.find(b => b.slotId === slot.id);
                                        const block = manualBlocks.find(b => b.slotId === slot.id);
                                        const isAvailable = !booking && !block;
                                        const isPastSlot = isSlotInPast(slot.endTime);
                                        
                                        let statusText = "Available";
                                        let statusColor = "text-green-600";
                                        let bgColor = "bg-card hover:border-primary cursor-pointer";
                                        
                                        if (block) {
                                            statusText = "Blocked";
                                            statusColor = "text-destructive";
                                            bgColor = "bg-destructive/5 border-destructive/30";
                                        } else if (booking) {
                                            statusText = booking.customerName;
                                            statusColor = "text-primary";
                                            bgColor = "bg-primary/5 border-primary/30";
                                        } else if (isAvailable && isPastSlot) {
                                            statusText = "Expired";
                                            statusColor = "text-muted-foreground";
                                            bgColor = "bg-secondary opacity-50 cursor-not-allowed";
                                        }

                                        return (
                                            <div 
                                                key={slot.id} 
                                                onClick={() => isAvailable && !isPastSlot ? (setNewBlock({ slotId: slot.id, sport: "football", reason: "", otherReason: "", comments: "" }), setIsBlockModalOpen(true)) : undefined}
                                                className={cn("p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[100px]", bgColor)}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <span className="font-bold text-lg">{slot.time}</span>
                                                    {block && <Trash2 className="h-4 w-4 text-destructive cursor-pointer" onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id); }} />}
                                                </div>
                                                <p className={cn("text-xs font-bold truncate", statusColor)}>{statusText}</p>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardHeader>
                <CardContent className="flex-1" />
            </Card>
        </div>
      </div>

      {/* --- DIALOGS (Kept same logic, just ensure they are included) --- */}
      <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
            {isSubmitting && <UniversalLoader />}
            <DialogHeader><DialogTitle>Add Manual Booking</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Sport</Label><Select value={newBooking.sport} onValueChange={v => setNewBooking({...newBooking, sport: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="football">Football</SelectItem><SelectItem value="cricket">Cricket</SelectItem><SelectItem value="badminton">Badminton</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Slot</Label><Select value={newBooking.slotId} onValueChange={v => setNewBooking({...newBooking, slotId: v})}><SelectTrigger><SelectValue placeholder="Select Slot"/></SelectTrigger><SelectContent>{timeSlots.map(s => <SelectItem key={s.id} value={s.id} disabled={isSlotTaken(s.id) || isSlotInPast(s.endTime)}>{s.time} {isSlotTaken(s.id) ? '(Booked)' : ''}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Comments</Label><Input placeholder="e.g. Walk-in, Paid UPI" value={newBooking.comments} onChange={e => setNewBooking({...newBooking, comments: e.target.value})}/></div>
              <Button onClick={handleAddBooking} className="w-full" disabled={isSubmitting}>Confirm Booking</Button>
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isBlockModalOpen} onOpenChange={setIsBlockModalOpen}>
          <DialogContent className="sm:max-w-md bg-card border-border">
            {isSubmitting && <UniversalLoader />}
            <DialogHeader><DialogTitle>Block Slot</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>Sport Category</Label><Select value={newBlock.sport} onValueChange={v => setNewBlock({...newBlock, sport: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="football">Football</SelectItem><SelectItem value="cricket">Cricket</SelectItem><SelectItem value="badminton">Badminton</SelectItem><SelectItem value="Maintenance">Maintenance</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Slot</Label><Select value={newBlock.slotId} onValueChange={v => setNewBlock({...newBlock, slotId: v})} disabled={!!newBlock.slotId && !timeSlots.find(s => s.id === newBlock.slotId)?.time}><SelectTrigger><SelectValue placeholder="Select Slot"/></SelectTrigger><SelectContent>{timeSlots.map(s => <SelectItem key={s.id} value={s.id} disabled={isSlotTaken(s.id) || isSlotInPast(s.endTime)}>{s.time}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Reason</Label><Select value={newBlock.reason || ''} onValueChange={v => setNewBlock({...newBlock, reason: v})}><SelectTrigger><SelectValue placeholder="Select Reason"/></SelectTrigger><SelectContent><SelectItem value="Maintenance">Maintenance</SelectItem><SelectItem value="Personal">Personal</SelectItem><SelectItem value="Offline Booking">Offline Booking</SelectItem><SelectItem value="Others">Others</SelectItem></SelectContent></Select></div>
                {newBlock.reason === "Others" && (<div className="space-y-2"><Label>Specify Reason</Label><Input value={newBlock.otherReason} onChange={e => setNewBlock({...newBlock, otherReason: e.target.value})} placeholder="e.g. Tournament" /></div>)}
                <div className="space-y-2"><Label>Additional Comments</Label><Input value={newBlock.comments} onChange={e => setNewBlock({...newBlock, comments: e.target.value})} placeholder="Optional details..." /></div>
                <Button onClick={handleAddBlock} className="w-full" disabled={isSubmitting}>Block Slot</Button>
            </div>
          </DialogContent>
      </Dialog>

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