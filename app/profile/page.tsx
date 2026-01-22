"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { useUserStore } from "@/lib/userStore"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { 
  User, Calendar, MapPin, Clock, CreditCard, Star, Edit2, LogOut, 
  CheckCircle, AlertCircle, Timer, XCircle, Share2, Download, Ticket, ArrowLeft, Loader2, ChevronRight, Info, ThumbsUp, Wallet, Filter, Trash2, MoreHorizontal, ArrowRight, X
} from "lucide-react"
import { format, isPast, parseISO, isValid, isFuture, addMinutes, isBefore } from "date-fns"
import { cn } from "@/lib/utils"
import { UniversalLoader } from "@/components/ui/universal-loader"
import { Capacitor, CapacitorHttp } from "@capacitor/core";
// --- IMPORTS ---
import { BookingSuccessModal } from "@/components/BookingSuccessModal";
import { SlidingActionCard } from "@/components/SlidingActionCard";
import { MobileSlideCard } from "@/components/MobileSlideCard";
import { BookingTicket } from "@/components/BookingTicket"; // New Import

export const dynamic = "force-dynamic";

// --- TYPES ---
type BookingDetail = {
  id: string
  date: string
  slot: string[]
  amount: number
  advance_paid: number 
  status: string
  payment_status: string
  rating: number | null
  review: string | null
  created_at: string | null
  turfs: {
    name: string
    location: string
    image: string
  }
}

type TimeSlot = {
  id: string
  start_time: string
  end_time: string
}

type UserProfile = {
  id: string
  name: string
  email: string
  phone: string
  created_at: string
}

// --- HELPER: FORMAT TO IST ---
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

// --- COMPONENT: VISUAL TIMER ---
function BookingTimer({ createdAt, mode = "badge", className }: { createdAt: string | null, mode?: "badge" | "text", className?: string }) {
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

  if (!createdAt) return null;
  
  if (timeLeft === 0) return mode === "badge" ? <Badge variant="outline" className="border-red-200 bg-red-50 text-red-600 gap-1 text-[10px] px-1.5 h-5"><XCircle className="h-3 w-3" /> Expired</Badge> : <span className="text-red-500 font-bold">Expired</span>;
  if (timeLeft === null) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  return mode === "badge" ? <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 gap-1 font-mono text-[10px] px-1.5 h-5"><Timer className="h-3 w-3" /> {timeString}</Badge> : <span className={cn("font-mono font-bold", className || "text-orange-600 text-xl")}>{timeString}</span>;
}

// --- MAIN PAGE ---
export default function UserProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { clearUser, setName } = useUserStore()
  
  // Data State
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [bookings, setBookings] = useState<BookingDetail[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  
  // UI States
  const [activeTab, setActiveTab] = useState("bookings")
  const [historyFilter, setHistoryFilter] = useState("all") 
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", phone: "" })
  const [isUpdating, setIsUpdating] = useState(false)
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [ratingValue, setRatingValue] = useState(0)
  const [reviewText, setReviewText] = useState("")
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [viewHistoryModal, setViewHistoryModal] = useState(false)
  
  // New State for Payment List Modal (Slideshow trigger)
  const [paymentListModalOpen, setPaymentListModalOpen] = useState(false)

  // Modal States
  const [ticketBooking, setTicketBooking] = useState<BookingDetail | null>(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [infoBooking, setInfoBooking] = useState<BookingDetail | null>(null)

  // Slider State
  const desktopSliderRef = useRef<HTMLDivElement>(null);
  const mobileSliderRef = useRef<HTMLDivElement>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // --- 1. DATA FETCHING ---
  const fetchUserData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/login"); return }

    const [profileRes, slotsRes, bookingsRes] = await Promise.all([
      supabase.from("users").select("*").eq("id", user.id).single(),
      supabase.from("time_slots").select("id, start_time, end_time").order('start_time'),
      supabase.from("bookings")
        .select(`id, date, slot, amount, advance_paid, status, payment_status, rating, review, created_at, turfs ( name, location, image )`) 
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data)
      setEditForm({ name: profileRes.data.name, phone: profileRes.data.phone })
    }
    if (slotsRes.data) setTimeSlots(slotsRes.data);
    if (bookingsRes.data) {
      const allBookings = bookingsRes.data.map((b: any) => ({
        ...b,
        turfs: Array.isArray(b.turfs) ? b.turfs[0] : b.turfs
      })) as BookingDetail[];
      setBookings(allBookings);
    }
    setLoading(false)
  }, [router]);

  useEffect(() => { setLoading(true); fetchUserData(); }, [fetchUserData]);

  // --- 2. GLOBAL EXPIRY CHECK ---
  const checkAndExpireBookings = useCallback(async () => {
    const expiredCandidates = bookings.filter(b => 
      (b.payment_status === 'pending' || b.payment_status === 'failed') &&
      b.status !== 'cancelled' && b.status !== 'confirmed' && b.status !== 'completed' &&
      b.created_at && isBefore(addMinutes(parseISO(b.created_at), 5), new Date())
    );

    if (expiredCandidates.length === 0) return;

    setBookings(prev => prev.map(b => expiredCandidates.find(ex => ex.id === b.id) ? { ...b, status: 'cancelled' } : b));
    for (const booking of expiredCandidates) {
       await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
    }
  }, [bookings]);

  useEffect(() => {
    const interval = setInterval(checkAndExpireBookings, 10000);
    if (bookings.length > 0) checkAndExpireBookings();
    return () => clearInterval(interval);
  }, [bookings, checkAndExpireBookings]);

  // --- HELPERS ---
  const getFormattedTimeRange = (slotIds: string[]) => {
    if (!slotIds || slotIds.length === 0 || timeSlots.length === 0) return "Unknown Time";
    const matchedSlots = slotIds.map(id => timeSlots.find(ts => ts.id === id)).filter(Boolean).sort((a, b) => a!.start_time.localeCompare(b!.start_time));
    if (matchedSlots.length === 0) return "Unknown Time";
    return `${matchedSlots[0]!.start_time} - ${matchedSlots[matchedSlots.length - 1]!.end_time}`;
  };

  const getBookingStartDateTime = (booking: BookingDetail) => {
    const timeRange = getFormattedTimeRange(booking.slot);
    if(timeRange === "Unknown Time") return new Date(booking.date);
    const [startTimeStr] = timeRange.split(" - "); 
    if (!startTimeStr) return new Date(booking.date);
    const [time, period] = startTimeStr.trim().split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (period) {
        if (period === "PM" && hours !== 12) hours += 12;
        if (period === "AM" && hours === 12) hours = 0;
    }
    const startDateTime = new Date(booking.date);
    startDateTime.setHours(hours, minutes, 0, 0);
    return startDateTime;
  };

  // --- HANDLERS ---
  const handleLogout = async () => { await supabase.auth.signOut(); clearUser(); router.push("/"); }
  
  const handleUpdateProfile = async () => { if (!profile) return; setIsUpdating(true); try { const { error } = await supabase.from("users").update({ name: editForm.name, phone: editForm.phone }).eq("id", profile.id); if (error) throw error; setProfile({ ...profile, ...editForm }); setName(editForm.name); setIsEditModalOpen(false); } catch (e: any) { alert("Error: " + e.message); } finally { setIsUpdating(false); } }
  
  const handleOpenRateModal = (booking: BookingDetail) => {
      setSelectedBookingId(booking.id);
      setRatingModalOpen(true);
  };

  const handleSubmitReview = async () => { if (!selectedBookingId || ratingValue === 0) return; setIsSubmittingReview(true); try { const { error } = await supabase.from("bookings").update({ rating: ratingValue, review: reviewText }).eq("id", selectedBookingId); if (error) throw error; setBookings(prev => prev.map(b => b.id === selectedBookingId ? { ...b, rating: ratingValue, review: reviewText } : b)); setRatingModalOpen(false); } catch (e: any) { alert("Error: " + e.message); } finally { setIsSubmittingReview(false); } }
  
  const handlePayNow = async (booking: BookingDetail) => { 
      if (!profile) return; 
      setIsProcessingPayment(true); 
      try { 
          const payAmount = booking.advance_paid > 0 ? booking.advance_paid : booking.amount;
          const paymentPayload = { bookingId: booking.id, amount: payAmount, customerName: profile.name, customerEmail: profile.email }; 
          let paymentUrl = ""; 
          if (Capacitor.isNativePlatform()) { 
              const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://khelconnect.in"; 
              const response = await CapacitorHttp.post({ url: `${baseUrl}/api/payment/create`, headers: { "Content-Type": "application/json" }, data: paymentPayload }); 
              if (response.status !== 200) throw new Error("Native Payment API Error"); 
              paymentUrl = response.data.paymentUrl; 
          } else { 
              const response = await fetch("/api/payment/create", { 
                  method: "POST", 
                  headers: { "Content-Type": "application/json" }, 
                  body: JSON.stringify({
                      ...paymentPayload,
                      returnUrl: `${window.location.origin}/profile?booking_id=${booking.id}`
                  }) 
              }); 
              const result = await response.json(); 
              if (!response.ok) throw new Error(result.error || "Payment generation failed"); 
              paymentUrl = result.paymentUrl; 
          } 
          window.location.href = paymentUrl; 
      } catch (error: any) { 
          console.error("Payment Error:", error); 
          alert("Payment failed: " + error.message); 
          setIsProcessingPayment(false); 
      } 
  };

  const handleExplicitCancel = useCallback(async (bookingId: string) => {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled', payment_status: 'failed' } : b));
      try {
          await supabase.from("bookings").update({ status: "cancelled", payment_status: "failed" }).eq("id", bookingId);
      } catch (error) {
          console.error("Cancellation Error:", error);
      }
  }, []);

  const handleDownloadTicket = () => { alert("Ticket download started..."); };
  const handleShareTicket = async () => { if (navigator.share && ticketBooking) { try { await navigator.share({ title: `Match at ${ticketBooking.turfs.name}`, text: `Im playing at ${ticketBooking.turfs.name} on ${format(new Date(ticketBooking.date), "PPP")}. Join me!`, url: window.location.href }); } catch (err) { console.error(err); } } else { alert("Share URL copied to clipboard!"); } };

  // --- FILTERED & SORTED LISTS ---
  const sortedBookings = useMemo(() => [...bookings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [bookings]);
  
  const upcomingBookings = useMemo(() => sortedBookings.filter(b => { 
      if (b.status === 'cancelled' || b.status === 'blocked' || (b.status !== 'confirmed' && b.payment_status !== 'paid')) return false; 
      const startDateTime = getBookingStartDateTime(b); 
      return isFuture(startDateTime); 
  }).sort((a, b) => getBookingStartDateTime(a).getTime() - getBookingStartDateTime(b).getTime()), [sortedBookings, timeSlots]);

  const historyBookings = useMemo(() => sortedBookings.filter(b => { 
      if (b.status === 'completed' || b.status === 'cancelled' || b.payment_status === 'failed') return true; 
      if (b.status === 'confirmed' || b.payment_status === 'paid') { 
          const startDateTime = getBookingStartDateTime(b); 
          return isPast(startDateTime); 
      } 
      if (b.payment_status === 'pending' && b.created_at && isPast(addMinutes(parseISO(b.created_at), 5))) return true;
      return false; 
  }), [sortedBookings, timeSlots]);

  const pendingPayments = useMemo(() => bookings.filter(b => (b.payment_status === 'pending' || b.payment_status === 'failed') && b.status !== 'cancelled' && b.status !== 'confirmed' && b.status !== 'completed'), [bookings]);
  
  const nearestBooking = upcomingBookings.length > 0 ? upcomingBookings[0] : null;
  const rateableBooking = useMemo(() => sortedBookings.find(b => b.status === 'completed' && !b.rating), [sortedBookings]);
  const completedCount = useMemo(() => bookings.filter(b => b.status === 'completed').length, [bookings]);

  const filteredHistory = useMemo(() => {
      if (historyFilter === 'all') return historyBookings;
      if (historyFilter === 'completed') return historyBookings.filter(b => b.status === 'completed' || b.status === 'confirmed');
      if (historyFilter === 'cancelled') return historyBookings.filter(b => b.status === 'cancelled' || b.payment_status === 'failed');
      return historyBookings;
  }, [historyBookings, historyFilter]);

  // --- SLIDESHOW LOGIC ---
  const slides = useMemo(() => {
    const items = [];
    if (nearestBooking) items.push({ type: 'booking', data: nearestBooking });
    if (pendingPayments.length > 0) items.push({ type: 'payment', data: pendingPayments });
    if (rateableBooking) items.push({ type: 'rate', data: rateableBooking });
    if (items.length === 0) items.push({ type: 'empty' });
    return items;
  }, [nearestBooking, pendingPayments, rateableBooking]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
        const nextIndex = (activeSlideIndex + 1) % slides.length;
        setActiveSlideIndex(nextIndex);
        if (desktopSliderRef.current) { 
            const width = desktopSliderRef.current.clientWidth; 
            desktopSliderRef.current.scrollTo({ left: width * nextIndex + (nextIndex * 16), behavior: 'smooth' }); 
        }
        if (mobileSliderRef.current) { 
            const width = mobileSliderRef.current.clientWidth; 
            mobileSliderRef.current.scrollTo({ left: width * nextIndex + (nextIndex * 16), behavior: 'smooth' }); 
        }
    }, 5000);
    return () => clearInterval(interval);
  }, [slides, activeSlideIndex]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.clientWidth;
    const newIndex = Math.round(scrollLeft / width);
    if (newIndex !== activeSlideIndex && newIndex < slides.length) setActiveSlideIndex(newIndex);
  };

  const activeSlide = slides[activeSlideIndex] || slides[0];

  if (loading) return <UniversalLoader />

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl pb-24 md:pb-8">
      {isProcessingPayment && <UniversalLoader />}

      <BookingSuccessModal onSuccess={fetchUserData} />

      <div className="flex flex-col md:flex-row gap-6 mb-8 items-start">
        {/* Profile Card */}
        <Card className="w-full md:w-1/3 bg-card border-border rounded-3xl shadow-sm h-full">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6"><div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary"><User className="h-10 w-10" /></div><div><h1 className="text-2xl font-bold">{profile?.name}</h1><p className="text-muted-foreground text-sm">Player</p></div></div>
            <div className="space-y-3"><div className="flex items-center gap-3 text-sm"><CreditCard className="h-4 w-4 text-muted-foreground" /><span>{profile?.email}</span></div><div className="flex items-center gap-3 text-sm"><User className="h-4 w-4 text-muted-foreground" /><span>{profile?.phone}</span></div></div>
            <div className="mt-6 flex gap-3"><Button variant="outline" className="flex-1 rounded-xl" onClick={() => setIsEditModalOpen(true)}><Edit2 className="h-4 w-4 mr-2" /> Edit</Button><Button variant="destructive" className="flex-1 rounded-xl" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" /> Logout</Button></div>
          </CardContent>
        </Card>
        
        {/* Right Side: Stats & Activity Widget */}
        <div className="w-full md:w-2/3 flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2 md:gap-4">
                <Card className="bg-primary/5 border-primary/10 rounded-2xl"><CardContent className="p-3 md:p-6 text-center h-full flex flex-col justify-center"><h3 className="text-2xl md:text-4xl font-bold text-primary mb-1">{completedCount}</h3><p className="text-[10px] md:text-sm text-muted-foreground leading-tight">Matches Played</p></CardContent></Card>
                <Card className="bg-green-500/5 border-green-500/10 rounded-2xl"><CardContent className="p-3 md:p-6 text-center h-full flex flex-col justify-center"><h3 className="text-2xl md:text-4xl font-bold text-green-600 mb-1">{upcomingBookings.length}</h3><p className="text-[10px] md:text-sm text-muted-foreground leading-tight">Upcoming</p></CardContent></Card>
                <Card className={cn("rounded-2xl", pendingPayments.length > 0 ? "bg-red-500/5 border-red-500/10" : "bg-secondary/50 border-border")}><CardContent className="p-3 md:p-6 text-center h-full flex flex-col justify-center"><h3 className={cn("text-2xl md:text-4xl font-bold mb-1", pendingPayments.length > 0 ? "text-red-500" : "text-foreground")}>{pendingPayments.length}</h3><p className="text-[10px] md:text-sm text-muted-foreground leading-tight">Pending / Failed</p></CardContent></Card>
            </div>

            {/* AUTO-SCROLLING SLIDESHOW (DESKTOP) */}
            <div className="hidden md:block flex-1 min-h-[140px] relative overflow-hidden rounded-2xl border border-border bg-card/50">
               <div ref={desktopSliderRef} className="flex overflow-x-auto gap-4 snap-x snap-mandatory scrollbar-hide h-full w-full px-4" onScroll={handleScroll}>
                  {slides.map((slide, idx) => (
                    <div key={idx} className="w-full flex-shrink-0 snap-center flex flex-col justify-center h-full">
                        {slide.type === 'booking' && (
                            <div className="bg-card border-2 border-green-500/50 p-6 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setTicketBooking(slide.data as BookingDetail)}>
                                <div className="flex items-center gap-4"><div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center"><Calendar className="h-6 w-6 text-green-600"/></div><div><p className="font-medium text-lg">Next Match: {(slide.data as BookingDetail).turfs.name}</p><p className="text-muted-foreground text-sm">{format(new Date((slide.data as BookingDetail).date), "PPP")} • {getFormattedTimeRange((slide.data as BookingDetail).slot)}</p></div></div><ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                        )}
                        {slide.type === 'payment' && (
                            <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-500/50 p-6 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors" onClick={() => setPaymentListModalOpen(true)}>
                                <div className="flex items-center gap-4"><div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center"><AlertCircle className="h-6 w-6 text-red-600"/></div><div><p className="font-medium text-lg text-red-700 dark:text-red-400">Payment Action Needed</p><div className="flex items-center gap-2"><p className="text-sm text-red-600/80 dark:text-red-400/80">{(slide.data as BookingDetail[]).length} pending</p><div className="h-1 w-1 bg-red-400 rounded-full"></div><BookingTimer createdAt={(slide.data as BookingDetail[])[0].created_at} mode="text" className="text-sm font-mono text-red-600 dark:text-red-400 font-bold" /></div></div></div><ChevronRight className="h-5 w-5 text-red-400" />
                            </div>
                        )}
                        {slide.type === 'rate' && (
                            <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-500/30 p-6 rounded-2xl flex items-center justify-between cursor-pointer" onClick={() => handleOpenRateModal(slide.data as BookingDetail)}>
                                <div className="flex items-center gap-4"><div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center"><ThumbsUp className="h-6 w-6 text-blue-600"/></div><div><p className="font-medium text-lg text-blue-700 dark:text-blue-400">Rate your last game</p><p className="text-sm text-blue-600/80 dark:text-blue-400/80">{(slide.data as BookingDetail).turfs.name}</p></div></div><Button size="sm" variant="secondary" className="text-blue-600 bg-blue-100 hover:bg-blue-200 border-none">Rate</Button>
                            </div>
                        )}
                        {slide.type === 'empty' && (
                            <div className="p-6 flex items-center gap-4"><div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center"><Star className="h-6 w-6 text-muted-foreground"/></div><div><p className="font-medium text-lg">No updates right now</p><p className="text-muted-foreground text-sm">Ready for your next game?</p></div></div>
                        )}
                    </div>
                  ))}
               </div>
               {slides.length > 1 && (<div className="absolute bottom-4 right-6 flex gap-1.5 pointer-events-none">{slides.map((_, idx) => <div key={idx} className={cn("h-1.5 rounded-full transition-all duration-300", idx === activeSlideIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30")} />)}</div>)}
            </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted rounded-xl p-1 h-12">
          <TabsTrigger value="bookings" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">My Bookings</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">History</TabsTrigger>
          <TabsTrigger value="payments" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Payments {pendingPayments.length > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingPayments.length}</span>}</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-4">
          <div className="flex justify-between items-center mb-2"><h2 className="text-xl font-bold">Upcoming Matches</h2><Button variant="ghost" size="sm" onClick={() => router.push("/turfs")}>Book New <ChevronRight className="h-4 w-4 ml-1"/></Button></div>
          {upcomingBookings.length === 0 ? <div className="text-center py-12 bg-secondary/30 rounded-3xl border border-dashed"><Calendar className="h-12 w-12 mx-auto opacity-50 mb-3" /><p>No confirmed upcoming matches.</p><Button className="mt-4 rounded-full" onClick={() => router.push("/turfs")}>Book Now</Button></div> : upcomingBookings.map((b, idx) => (<BookingCard key={b.id} booking={b} timeRange={getFormattedTimeRange(b.slot)} isNearest={idx === 0} onViewTicket={() => setTicketBooking(b)} />))}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold">Past & Cancelled</h2>
             <div className="flex gap-2">
                <Button variant={historyFilter === 'all' ? "default" : "outline"} size="sm" onClick={() => setHistoryFilter('all')} className="rounded-full h-8 text-xs">All</Button>
                <Button variant={historyFilter === 'completed' ? "default" : "outline"} size="sm" onClick={() => setHistoryFilter('completed')} className="rounded-full h-8 text-xs">Played</Button>
                <Button variant={historyFilter === 'cancelled' ? "default" : "outline"} size="sm" onClick={() => setHistoryFilter('cancelled')} className="rounded-full h-8 text-xs">Cancelled</Button>
             </div>
          </div>
          
          {filteredHistory.length === 0 ? <p className="text-center py-8 text-muted-foreground">No matches found for this filter.</p> : (<>{filteredHistory.slice(0, 5).map(b => (<BookingCard key={b.id} booking={b} timeRange={getFormattedTimeRange(b.slot)} onViewTicket={() => setTicketBooking(b)} onViewInfo={() => setInfoBooking(b)} />))}{filteredHistory.length > 5 && <Button variant="outline" className="w-full rounded-xl py-6 border-dashed" onClick={() => setViewHistoryModal(true)}>View All ({filteredHistory.length})</Button>}</>)}
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <h2 className="text-xl font-bold mb-4">Pending Payments</h2>
          {pendingPayments.map(booking => (
             <SlidingActionCard 
                key={booking.id}
                data={{
                    id: booking.id,
                    title: booking.turfs?.name,
                    date: booking.date,
                    createdAt: booking.created_at,
                    timeRange: getFormattedTimeRange(booking.slot),
                    amount: booking.amount,
                    advancePaid: booking.advance_paid,
                    status: booking.status,
                    paymentStatus: booking.payment_status
                }}
                actions={{
                    onPay: () => handlePayNow(booking),
                    onCancel: () => handleExplicitCancel(booking.id),
                    isProcessing: isProcessingPayment
                }}
                theme={{
                    borderLeft: "border-l-red-500",
                    actionBackground: "bg-red-500",
                    actionBorder: "border-red-400",
                    primaryBtn: "bg-white text-red-600 hover:bg-red-50",
                    secondaryBtn: "text-white hover:bg-white/20 hover:text-white",
                    toggleBtnActive: "bg-red-100 text-red-600 border-red-200",
                    statusText: "text-red-500",
                    alertIconColor: "text-red-600"
                }}
             />
          ))}
          {pendingPayments.length === 0 && <div className="text-center py-12"><p className="text-muted-foreground">No pending payments.</p></div>}
        </TabsContent>
      </Tabs>

      {/* --- MOBILE STICKY SLIDER --- */}
      {slides.length > 0 && slides[0].type !== 'empty' && (
        <div className="md:hidden fixed bottom-4 left-0 right-0 z-50">
           <div ref={mobileSliderRef} className="flex overflow-x-auto gap-4 snap-x snap-mandatory scrollbar-hide px-4 pb-4" onScroll={handleScroll}>
              {slides.map((slide, idx) => (
                <div key={idx} className="w-[calc(100vw-32px)] flex-shrink-0 snap-center">
                    
                    {/* 1. MOBILE PAYMENT ALERT (RED THEME) */}
                    {slide.type === 'payment' && (
                        <MobileSlideCard 
                            icon={<AlertCircle className="h-5 w-5"/>}
                            title="Action Required"
                            subContent={
                                <>
                                    <p>{(slide.data as BookingDetail[]).length} Pending</p>
                                    <div className="h-1 w-1 bg-current rounded-full opacity-50"></div>
                                    <BookingTimer createdAt={(slide.data as BookingDetail[])[0].created_at} mode="text" className="font-mono font-bold" />
                                </>
                            }
                            onClick={(e) => { e.stopPropagation(); setPaymentListModalOpen(true); }}
                            theme={{
                                bg: "bg-red-500/10",
                                border: "border-red-500/20",
                                iconBg: "bg-red-500/20 border border-red-500/10",
                                iconColor: "text-red-200",
                                titleColor: "text-red-100",
                                subTextColor: "text-red-200/80",
                                arrowColor: "text-red-300",
                                glass: true
                            }}
                        />
                    )}

                    {/* 2. MOBILE MATCH CARD (GLASS THEME) */}
                    {slide.type === 'booking' && (
                        <MobileSlideCard 
                            icon={<Calendar className="h-5 w-5"/>}
                            title="Next Match"
                            subContent={(slide.data as BookingDetail).turfs.name.substring(0, 15) + "..."}
                            onClick={() => setTicketBooking(slide.data as BookingDetail)}
                            rightContent={
                                <div className="text-right">
                                    <p className="text-xs font-bold">{format(new Date((slide.data as BookingDetail).date), "MMM d")}</p>
                                    <p className="text-[10px] opacity-80">{getFormattedTimeRange((slide.data as BookingDetail).slot).split(" - ")[0]}</p>
                                </div>
                            }
                            theme={{
                                bg: "bg-white/10",
                                border: "border-white/20",
                                iconBg: "bg-white/20 border border-white/10",
                                iconColor: "text-white",
                                titleColor: "text-white",
                                subTextColor: "text-white/80",
                                arrowColor: "text-white",
                                glass: true
                            }}
                        />
                    )}

                    {/* 3. MOBILE RATE CARD (GREEN THEME) */}
                    {slide.type === 'rate' && (
                        <MobileSlideCard 
                            icon={<ThumbsUp className="h-5 w-5"/>}
                            title="How was the game?"
                            subContent={(slide.data as BookingDetail).turfs.name}
                            onClick={() => handleOpenRateModal(slide.data as BookingDetail)}
                            rightContent={
                                <Button size="sm" variant="secondary" className="text-green-600 h-8 text-xs font-bold rounded-full bg-white hover:bg-green-50 shadow-sm">Rate</Button>
                            }
                            theme={{
                                bg: "bg-green-500/10",
                                border: "border-green-500/20",
                                iconBg: "bg-green-500/20 border border-green-500/10",
                                iconColor: "text-green-100",
                                titleColor: "text-green-50",
                                subTextColor: "text-green-200/80",
                                arrowColor: "text-green-300",
                                glass: true
                            }}
                        />
                    )}
                </div>
              ))}
           </div>
           {slides.length > 1 && (<div className="flex justify-center gap-1.5 mt-2">{slides.map((_, idx) => <div key={idx} className={cn("h-1.5 rounded-full transition-all shadow-sm", idx === activeSlideIndex ? "w-4 bg-white/80" : "w-1.5 bg-black/20")} />)}</div>)}
        </div>
      )}

      {/* --- MODALS --- */}
      {/* 1. Ticket Modal */}
      <Dialog open={!!ticketBooking} onOpenChange={(open) => !open && setTicketBooking(null)}>
        <DialogContent className="w-[90vw] max-w-md rounded-3xl p-0 overflow-hidden bg-transparent border-none shadow-none sm:max-w-md">
          {ticketBooking && (
             <BookingTicket 
                booking={{
                    id: ticketBooking.id,
                    date: ticketBooking.date,
                    status: ticketBooking.status,
                    payment_status: ticketBooking.payment_status,
                    amount: ticketBooking.amount,
                    advance_paid: ticketBooking.advance_paid,
                    turfs: ticketBooking.turfs
                }}
                formattedTimeRange={getFormattedTimeRange(ticketBooking.slot)}
                userName={profile?.name || "Player"}
                onDownload={handleDownloadTicket}
                onShare={handleShareTicket}
             />
          )}
        </DialogContent>
      </Dialog>
      
      {/* 2. Pending Payment List Modal */}
      <Dialog open={paymentListModalOpen} onOpenChange={setPaymentListModalOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600"/> Pending Payments ({pendingPayments.length})
                </DialogTitle>
                <DialogDescription>Pay now to confirm or cancel to free up slots.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
                {pendingPayments.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border">
                        <div className="flex-1 min-w-0 mr-3">
                            <p className="font-bold text-sm truncate">{p.turfs.name}</p>
                            <p className="text-xs text-muted-foreground">{formatToIST(p.created_at)}</p>
                        </div>
                        <div className="flex gap-2">
                             <Button size="icon" variant="ghost" className="h-9 w-9 text-red-500 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-full" onClick={() => { handleExplicitCancel(p.id); setPaymentListModalOpen(false); }}>
                                 <Trash2 className="h-4 w-4"/>
                             </Button>
                             <Button size="icon" className="h-9 w-9 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-sm" onClick={() => { handlePayNow(p); setPaymentListModalOpen(false); }}>
                                 <Wallet className="h-4 w-4"/>
                             </Button>
                        </div>
                    </div>
                ))}
                {pendingPayments.length === 0 && <p className="text-center text-muted-foreground py-4">No pending payments.</p>}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setPaymentListModalOpen(false)} className="w-full">Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!infoBooking} onOpenChange={(open) => !open && setInfoBooking(null)}><DialogContent className="sm:max-w-md w-[90vw] rounded-2xl"><DialogHeader><DialogTitle className="flex items-center gap-3 text-red-600"><XCircle className="h-6 w-6"/> Booking Cancelled</DialogTitle><DialogDescription>Details regarding this cancellation.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="bg-red-50 border border-red-100 p-4 rounded-xl"><p className="text-sm font-bold text-red-800 mb-1">Reason for Cancellation</p><p className="text-sm text-red-700">{infoBooking?.payment_status === 'failed' ? "Payment transaction was declined or failed at the gateway." : "Payment verification timed out. The slot was released automatically."}</p></div><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-muted-foreground">Attempted Date</p><p className="font-medium">{infoBooking ? format(new Date(infoBooking.date), "PPP") : "-"}</p></div><div><p className="text-muted-foreground">Booking ID</p><p className="font-mono">{infoBooking?.id.slice(0,8).toUpperCase()}</p></div></div></div><DialogFooter><Button variant="outline" onClick={() => setInfoBooking(null)}>Close</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}><DialogContent className="sm:max-w-md w-[90vw] rounded-2xl"><DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader><div className="space-y-4 py-4"><Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /><Input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} /></div><DialogFooter><Button onClick={handleUpdateProfile} disabled={isUpdating}>Save</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={ratingModalOpen} onOpenChange={setRatingModalOpen}><DialogContent className="sm:max-w-md w-[90vw] rounded-2xl"><DialogHeader><DialogTitle>Rate Your Experience</DialogTitle></DialogHeader><div className="flex justify-center gap-2 py-6">{[1, 2, 3, 4, 5].map((star) => <button key={star} onClick={() => setRatingValue(star)}><Star className={cn("h-10 w-10", star <= ratingValue ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} /></button>)}</div><div className="space-y-2"><Label>Review</Label><Textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} /></div><DialogFooter><Button onClick={handleSubmitReview} disabled={ratingValue === 0 || isSubmittingReview}>Submit</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={viewHistoryModal} onOpenChange={setViewHistoryModal}><DialogContent className="sm:max-w-xl w-[90vw] rounded-2xl max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Full Booking History</DialogTitle></DialogHeader><div className="space-y-4 py-4">{filteredHistory.map(b => (<BookingCard key={b.id} booking={b} timeRange={getFormattedTimeRange(b.slot)} onViewTicket={() => setTicketBooking(b)} onViewInfo={() => setInfoBooking(b)} />))}</div></DialogContent></Dialog>
    </main>
  )
}

function BookingCard({ booking, timeRange, onViewTicket, onViewInfo, isNearest }: { booking: BookingDetail, timeRange: string, onViewTicket?: () => void, onViewInfo?: () => void, isNearest?: boolean }) {
  const isCancelled = booking.status === 'cancelled';
  const isCompleted = booking.status === 'completed';
  const isFailed = booking.payment_status === 'failed'; 

  return (
    <Card className={cn("bg-card border-border rounded-2xl overflow-hidden hover:shadow-md transition-all", isNearest && "border-green-500/50 shadow-lg shadow-green-500/10 relative overflow-visible", (isCancelled || isFailed) && "opacity-60")}>
      {isNearest && (<div className="absolute -top-3 left-4 bg-green-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm z-10 uppercase tracking-wide">Up Next</div>)}
      <div className="flex flex-col sm:flex-row"><div className="sm:w-36 h-32 sm:h-auto relative bg-secondary"><img src={booking.turfs?.image || "/placeholder.svg"} className={cn("absolute inset-0 w-full h-full object-cover", (isCancelled || isFailed) && "grayscale")} /></div><div className="p-5 flex-1 flex flex-col justify-between"><div><div className="flex justify-between items-start mb-2"><div><h3 className="font-bold text-lg leading-tight">{booking.turfs?.name}</h3><div className="flex items-center text-muted-foreground text-sm mt-1"><MapPin className="h-3 w-3 mr-1" /> {booking.turfs?.location}</div></div><Badge variant={isCancelled || isFailed ? "destructive" : "secondary"} className="capitalize">{isFailed ? "Payment Failed" : booking.status}</Badge></div><div className="grid grid-cols-2 gap-4 my-3"><div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-primary" /><span>{format(new Date(booking.date), "EEE, MMM d")}</span></div><div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-primary" /><span>{timeRange}</span></div></div>
      
      {(isCancelled || isFailed) && booking.created_at && (
          <div className="mt-2 text-xs text-muted-foreground border-t border-dashed pt-2 flex items-center gap-1">
              <Info className="h-3 w-3" /> Booked: {formatToIST(booking.created_at)}
          </div>
      )}
      
      </div><div className="flex justify-between items-center pt-3 border-t border-border"><p className="font-bold text-lg">₹{booking.amount}</p>{(isCancelled || isFailed) ? (<Button variant="ghost" size="sm" className="text-xs hover:bg-red-50 hover:text-red-600" onClick={onViewInfo}><Info className="h-3 w-3 mr-1"/> Info</Button>) : isCompleted ? (<div className="flex gap-2"><Button variant="secondary" size="sm" className="rounded-full h-7 text-xs">Rate</Button><Button variant="outline" size="sm" className="rounded-full h-7 text-xs border-dashed text-muted-foreground" onClick={onViewTicket}>View Ticket</Button></div>) : onViewTicket ? (<Button variant="outline" size="sm" className="rounded-full" onClick={onViewTicket}>View Ticket</Button>) : null}</div></div></div>
    </Card>
  )
}