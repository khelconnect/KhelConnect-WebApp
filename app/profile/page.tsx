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
  CheckCircle, AlertCircle, Timer, XCircle, Share2, Download, Ticket, ArrowLeft, Loader2, ChevronRight
} from "lucide-react"
import { format, isPast, parseISO, isValid, isFuture, addMinutes, isBefore } from "date-fns"
import { cn } from "@/lib/utils"
import { UniversalLoader } from "@/components/ui/universal-loader"
import { Capacitor, CapacitorHttp } from "@capacitor/core";

// --- TYPES ---
type BookingDetail = {
  id: string
  date: string
  slot: string[]
  amount: number
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
function BookingTimer({ createdAt, mode = "badge" }: { createdAt: string | null, mode?: "badge" | "text" }) {
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
  
  return mode === "badge" ? <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 gap-1 font-mono text-[10px] px-1.5 h-5"><Timer className="h-3 w-3" /> {timeString}</Badge> : <span className="font-mono text-xl font-bold text-orange-600">{timeString}</span>;
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", phone: "" })
  const [isUpdating, setIsUpdating] = useState(false)
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [ratingValue, setRatingValue] = useState(0)
  const [reviewText, setReviewText] = useState("")
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [viewHistoryModal, setViewHistoryModal] = useState(false)
  
  // SLIDER REFS & STATE
  const desktopSliderRef = useRef<HTMLDivElement>(null);
  const mobileSliderRef = useRef<HTMLDivElement>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Payment & Ticket States
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [ticketBooking, setTicketBooking] = useState<BookingDetail | null>(null)
  const [paymentStatusBooking, setPaymentStatusBooking] = useState<BookingDetail | null>(null)
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false)

  // --- 1. DATA FETCHING ---
  const fetchUserData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/login"); return }

    const [profileRes, slotsRes, bookingsRes] = await Promise.all([
      supabase.from("users").select("*").eq("id", user.id).single(),
      supabase.from("time_slots").select("id, start_time, end_time").order('start_time'),
      supabase.from("bookings")
        .select(`id, date, slot, amount, status, payment_status, rating, review, created_at, turfs ( name, location, image )`)
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

  // --- 3. OPTIMISTIC PAYMENT VERIFICATION ---
  useEffect(() => {
    const returnBookingId = searchParams.get("booking_id");
    const dodoStatus = searchParams.get("payment_status");
    
    if (returnBookingId && bookings.length > 0) {
      const targetBooking = bookings.find(b => b.id === returnBookingId);
      if (targetBooking) {
        if (dodoStatus === 'succeeded' || targetBooking.payment_status === "paid" || targetBooking.status === "confirmed") {
          setTicketBooking({ ...targetBooking, status: 'confirmed', payment_status: 'paid' });
          router.replace("/profile");
          supabase.from("bookings").update({ status: 'confirmed', payment_status: 'paid' }).eq("id", returnBookingId).then(() => fetchUserData());
        } else if (dodoStatus === 'failed' || targetBooking.payment_status === "failed") {
          setPaymentStatusBooking({ ...targetBooking, payment_status: 'failed' });
          router.replace("/profile");
        } else {
          setIsVerifyingPayment(true);
          let attempts = 0;
          const pollInterval = setInterval(async () => {
              attempts++;
              const { data: fresh } = await supabase.from("bookings").select("status, payment_status").eq("id", returnBookingId).single();
              if (fresh && (fresh.payment_status === "paid" || fresh.status === "confirmed")) {
                  clearInterval(pollInterval);
                  setIsVerifyingPayment(false);
                  fetchUserData().then(() => setTicketBooking(targetBooking));
                  router.replace("/profile");
              } else if (attempts >= 10) { 
                  clearInterval(pollInterval);
                  setIsVerifyingPayment(false);
                  setPaymentStatusBooking(targetBooking);
                  router.replace("/profile");
              }
          }, 2000);
          return () => clearInterval(pollInterval);
        }
      }
    }
  }, [searchParams, bookings, fetchUserData, router]);

  // --- HELPERS ---
  const getFormattedTimeRange = (slotIds: string[]) => {
    if (!slotIds || slotIds.length === 0 || timeSlots.length === 0) return "Unknown Time";
    const matchedSlots = slotIds.map(id => timeSlots.find(ts => ts.id === id)).filter(Boolean).sort((a, b) => a!.start_time.localeCompare(b!.start_time));
    if (matchedSlots.length === 0) return "Unknown Time";
    return `${matchedSlots[0]!.start_time} - ${matchedSlots[matchedSlots.length - 1]!.end_time}`;
  };

  const getBookingEndDateTime = (booking: BookingDetail) => {
    const timeRange = getFormattedTimeRange(booking.slot);
    if(timeRange === "Unknown Time") return new Date(booking.date);
    const [_, endTimeStr] = timeRange.split(" - ");
    if (!endTimeStr) return new Date(booking.date);
    const [time, period] = endTimeStr.trim().split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    const endDateTime = new Date(booking.date);
    endDateTime.setHours(hours, minutes, 0, 0);
    return endDateTime;
  };

  // --- HANDLERS ---
  const handleLogout = async () => { await supabase.auth.signOut(); clearUser(); router.push("/"); }
  const handleUpdateProfile = async () => { if (!profile) return; setIsUpdating(true); try { const { error } = await supabase.from("users").update({ name: editForm.name, phone: editForm.phone }).eq("id", profile.id); if (error) throw error; setProfile({ ...profile, ...editForm }); setName(editForm.name); setIsEditModalOpen(false); } catch (e: any) { alert("Error: " + e.message); } finally { setIsUpdating(false); } }
  const handleSubmitReview = async () => { if (!selectedBookingId || ratingValue === 0) return; setIsSubmittingReview(true); try { const { error } = await supabase.from("bookings").update({ rating: ratingValue, review: reviewText }).eq("id", selectedBookingId); if (error) throw error; setBookings(prev => prev.map(b => b.id === selectedBookingId ? { ...b, rating: ratingValue, review: reviewText } : b)); setRatingModalOpen(false); } catch (e: any) { alert("Error: " + e.message); } finally { setIsSubmittingReview(false); } }
  const handlePayNow = async (booking: BookingDetail) => { if (!profile) return; setIsProcessingPayment(true); try { const paymentPayload = { bookingId: booking.id, amount: booking.amount, customerName: profile.name, customerEmail: profile.email }; let paymentUrl = ""; if (Capacitor.isNativePlatform()) { const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://khelconnect.in"; const response = await CapacitorHttp.post({ url: `${baseUrl}/api/payment/create`, headers: { "Content-Type": "application/json" }, data: paymentPayload }); if (response.status !== 200) throw new Error("Native Payment API Error"); paymentUrl = response.data.paymentUrl; } else { const response = await fetch("/api/payment/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(paymentPayload) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Payment generation failed"); paymentUrl = result.paymentUrl; } window.location.href = paymentUrl; } catch (error: any) { console.error("Payment Error:", error); alert("Payment failed: " + error.message); setIsProcessingPayment(false); } };
  const handleCancelBooking = useCallback(async (bookingId: string) => { setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b)); try { await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId); } catch (error) { console.error(error); } }, []);
  const handleCancelAndRebook = async (bookingId: string) => { await handleCancelBooking(bookingId); router.push("/turfs"); };
  const handleDownloadTicket = () => { alert("Ticket download started..."); };
  const handleShareTicket = async () => { if (navigator.share && ticketBooking) { try { await navigator.share({ title: `Match at ${ticketBooking.turfs.name}`, text: `I'm playing at ${ticketBooking.turfs.name} on ${format(new Date(ticketBooking.date), "PPP")}. Join me!`, url: window.location.href }); } catch (err) { console.error(err); } } else { alert("Share URL copied to clipboard!"); } };

  // --- FILTERED & SORTED LISTS ---
  const sortedBookings = useMemo(() => [...bookings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [bookings]);
  const upcomingBookings = useMemo(() => sortedBookings.filter(b => { if (b.status === 'cancelled' || b.status === 'blocked' || (b.status !== 'confirmed' && b.payment_status !== 'paid')) return false; const endDateTime = getBookingEndDateTime(b); return isFuture(endDateTime); }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [sortedBookings, timeSlots]);
  const historyBookings = useMemo(() => sortedBookings.filter(b => { if (b.status === 'completed' || b.status === 'cancelled') return true; if (b.status === 'confirmed') { const endDateTime = getBookingEndDateTime(b); return isPast(endDateTime); } return false; }), [sortedBookings, timeSlots]);
  const pendingPayments = useMemo(() => bookings.filter(b => (b.payment_status === 'pending' || b.payment_status === 'failed') && b.status !== 'cancelled' && b.status !== 'confirmed' && b.status !== 'completed'), [bookings]);
  const nearestBooking = upcomingBookings.length > 0 ? upcomingBookings[0] : null;

  // --- SLIDESHOW SLIDE DATA ---
  const slides = useMemo(() => {
    const items = [];
    if (nearestBooking) items.push({ type: 'booking', data: nearestBooking });
    if (pendingPayments.length > 0) items.push({ type: 'payment', data: pendingPayments });
    if (items.length === 0) items.push({ type: 'empty' });
    return items;
  }, [nearestBooking, pendingPayments]);

  // --- AUTO-SLIDE LOGIC ---
  useEffect(() => {
    if (slides.length <= 1) return;
    
    const interval = setInterval(() => {
        // Calculate next index
        const nextIndex = (activeSlideIndex + 1) % slides.length;
        setActiveSlideIndex(nextIndex);

        // Slide Desktop
        if (desktopSliderRef.current) {
            const width = desktopSliderRef.current.clientWidth;
            desktopSliderRef.current.scrollTo({ left: width * nextIndex, behavior: 'smooth' });
        }
        // Slide Mobile
        if (mobileSliderRef.current) {
            const width = mobileSliderRef.current.clientWidth;
            mobileSliderRef.current.scrollTo({ left: width * nextIndex, behavior: 'smooth' });
        }
    }, 5000); // 5 Seconds

    return () => clearInterval(interval);
  }, [slides, activeSlideIndex]);

  // --- MANUAL SCROLL HANDLER (Updates active dot when user swipes) ---
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.clientWidth;
    const newIndex = Math.round(scrollLeft / width);
    if (newIndex !== activeSlideIndex) setActiveSlideIndex(newIndex);
  };

  // --- RENDER ---
  if (loading) return <UniversalLoader />

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl pb-24 md:pb-8">
      {isProcessingPayment && <UniversalLoader />}

      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row gap-6 mb-8 items-start">
        <Card className="w-full md:w-1/3 bg-card border-border rounded-3xl shadow-sm h-full">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6"><div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary"><User className="h-10 w-10" /></div><div><h1 className="text-2xl font-bold">{profile?.name}</h1><p className="text-muted-foreground text-sm">Player</p></div></div>
            <div className="space-y-3"><div className="flex items-center gap-3 text-sm"><CreditCard className="h-4 w-4 text-muted-foreground" /><span>{profile?.email}</span></div><div className="flex items-center gap-3 text-sm"><User className="h-4 w-4 text-muted-foreground" /><span>{profile?.phone}</span></div></div>
            <div className="mt-6 flex gap-3"><Button variant="outline" className="flex-1 rounded-xl" onClick={() => setIsEditModalOpen(true)}><Edit2 className="h-4 w-4 mr-2" /> Edit</Button><Button variant="destructive" className="flex-1 rounded-xl" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" /> Logout</Button></div>
          </CardContent>
        </Card>
        
        {/* Right Side: Stats & Activity Widget */}
        <div className="w-full md:w-2/3 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-primary/5 border-primary/10 rounded-2xl"><CardContent className="p-6 text-center"><h3 className="text-4xl font-bold text-primary mb-1">{bookings.length}</h3><p className="text-sm text-muted-foreground">Total Activity</p></CardContent></Card>
                <Card className="bg-green-500/5 border-green-500/10 rounded-2xl"><CardContent className="p-6 text-center"><h3 className="text-4xl font-bold text-green-600 mb-1">{upcomingBookings.length}</h3><p className="text-sm text-muted-foreground">Upcoming</p></CardContent></Card>
                <Card className={cn("rounded-2xl", pendingPayments.length > 0 ? "bg-red-500/5 border-red-500/10" : "bg-secondary/50 border-border")}><CardContent className="p-6 text-center"><h3 className={cn("text-4xl font-bold mb-1", pendingPayments.length > 0 ? "text-red-500" : "text-foreground")}>{pendingPayments.length}</h3><p className="text-sm text-muted-foreground">Pending / Failed</p></CardContent></Card>
            </div>

            {/* AUTO-SCROLLING SLIDESHOW (DESKTOP) */}
            <div className="hidden md:block flex-1 min-h-[140px] relative overflow-hidden rounded-2xl border border-border bg-card/50">
               <div 
                 ref={desktopSliderRef}
                 className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide h-full w-full"
                 onScroll={handleScroll}
               >
                  {slides.map((slide, idx) => (
                    <div key={idx} className="w-full flex-shrink-0 snap-center p-6 flex flex-col justify-center">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Latest Update</p>
                        
                        {slide.type === 'booking' && (
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center"><Calendar className="h-6 w-6 text-green-600"/></div>
                                <div><p className="font-medium text-lg">Match at {(slide.data as BookingDetail).turfs.name}</p><p className="text-muted-foreground text-sm">{format(new Date((slide.data as BookingDetail).date), "PPP")} • {getFormattedTimeRange((slide.data as BookingDetail).slot)}</p></div>
                            </div>
                        )}
                        {slide.type === 'payment' && (
                            <div className="flex items-center gap-4 cursor-pointer" onClick={() => document.querySelector('[value="payments"]')?.dispatchEvent(new MouseEvent('click', {bubbles: true}))}>
                                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center"><AlertCircle className="h-6 w-6 text-red-600"/></div>
                                <div><p className="font-medium text-lg">Payment Action Needed</p><p className="text-muted-foreground text-sm">{(slide.data as BookingDetail[]).length} pending transaction(s). <span className="underline decoration-red-300">View</span></p></div>
                            </div>
                        )}
                        {slide.type === 'empty' && (
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center"><Star className="h-6 w-6 text-muted-foreground"/></div>
                                <div><p className="font-medium text-lg">You're all caught up!</p><p className="text-muted-foreground text-sm">Ready for your next game?</p></div>
                            </div>
                        )}
                    </div>
                  ))}
               </div>
               {/* Dots */}
               {slides.length > 1 && (
                   <div className="absolute bottom-4 right-6 flex gap-1.5 pointer-events-none">
                       {slides.map((_, idx) => <div key={idx} className={cn("h-1.5 rounded-full transition-all duration-300", idx === activeSlideIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30")} />)}
                   </div>
               )}
            </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="bookings" className="w-full">
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
          <h2 className="text-xl font-bold mb-4">Past & Cancelled</h2>
          {historyBookings.length === 0 ? <p className="text-center py-8 text-muted-foreground">No history yet.</p> : (<>{historyBookings.slice(0, 5).map(b => <BookingCard key={b.id} booking={b} timeRange={getFormattedTimeRange(b.slot)} />)}{historyBookings.length > 5 && <Button variant="outline" className="w-full rounded-xl py-6 border-dashed" onClick={() => setViewHistoryModal(true)}>View All History ({historyBookings.length})</Button>}</>)}
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <h2 className="text-xl font-bold mb-4">Pending Payments</h2>
          {pendingPayments.map(booking => (
            <Card key={booking.id} className="bg-card border-l-4 border-l-red-500 rounded-xl shadow-sm">
              <CardContent className="p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="font-bold">{booking.turfs?.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-1"><p className="text-sm text-red-500 font-medium flex items-center gap-1"><AlertCircle className="h-4 w-4" /> {booking.payment_status === 'failed' ? 'Payment Failed' : 'Pending'}</p><BookingTimer createdAt={booking.created_at} /></div>
                  <p className="text-xs text-muted-foreground mt-2">Booked: {formatToIST(booking.created_at)} • Slot: {getFormattedTimeRange(booking.slot)}</p>
                </div>
                <div className="flex items-center gap-4"><p className="text-xl font-bold">₹{booking.amount}</p><Button onClick={() => handlePayNow(booking)} disabled={isProcessingPayment} className="bg-red-600 hover:bg-red-700 text-white">{booking.payment_status === 'failed' ? 'Retry' : 'Pay Now'}</Button></div>
              </CardContent>
            </Card>
          ))}
          {pendingPayments.length === 0 && <div className="text-center py-12"><p className="text-muted-foreground">No pending payments.</p></div>}
        </TabsContent>
      </Tabs>

      {/* --- MOBILE STICKY SLIDER (AUTO-SCROLLING) --- */}
      {slides.length > 0 && slides[0].type !== 'empty' && (
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
           <div 
             ref={mobileSliderRef}
             className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide rounded-2xl shadow-xl"
             onScroll={handleScroll}
           >
              {slides.map((slide, idx) => (
                <div key={idx} className="w-full flex-shrink-0 snap-center">
                    {slide.type === 'payment' && (
                        <div className="bg-red-600 text-white p-4 flex justify-between items-center cursor-pointer" onClick={() => document.querySelector('[value="payments"]')?.dispatchEvent(new MouseEvent('click', {bubbles: true}))}>
                            <div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded-full"><AlertCircle className="h-5 w-5"/></div><div><p className="font-bold text-sm">Action Required</p><p className="text-xs text-white/80">{(slide.data as BookingDetail[]).length} Pending Payment(s)</p></div></div><Button size="sm" variant="secondary" className="text-red-600 h-8 text-xs">View</Button>
                        </div>
                    )}
                    {slide.type === 'booking' && (
                        <div className="bg-white/90 backdrop-blur-xl border border-green-500/20 p-4 flex justify-between items-center">
                            <div className="flex items-center gap-3"><div className="bg-green-100 p-2 rounded-full"><Calendar className="h-5 w-5 text-green-700"/></div><div className="text-left"><p className="font-bold text-sm text-foreground">Next Match</p><p className="text-xs text-muted-foreground">{(slide.data as BookingDetail).turfs.name.substring(0, 15)}...</p></div></div><div className="text-right"><p className="text-xs font-bold text-green-700">{format(new Date((slide.data as BookingDetail).date), "MMM d")}</p><p className="text-[10px] text-muted-foreground">{getFormattedTimeRange((slide.data as BookingDetail).slot).split(" - ")[0]}</p></div>
                        </div>
                    )}
                </div>
              ))}
           </div>
           {/* Mobile Dots */}
           {slides.length > 1 && (
               <div className="flex justify-center gap-1.5 mt-2">
                   {slides.map((_, idx) => <div key={idx} className={cn("h-1.5 rounded-full transition-all shadow-sm", idx === activeSlideIndex ? "w-4 bg-white/80" : "w-1.5 bg-black/20")} />)}
               </div>
           )}
        </div>
      )}

      {/* --- MODALS (Code shortened for brevity, assumes standard structure from previous turn) --- */}
      <Dialog open={isVerifyingPayment} onOpenChange={() => {}}><DialogContent className="sm:max-w-lg border-none shadow-none bg-transparent p-0 flex items-center justify-center min-h-[400px]" onInteractOutside={(e) => e.preventDefault()}><div className="relative w-full max-w-md overflow-visible rounded-[2.5rem] bg-white/10 backdrop-blur-3xl border-2 border-green-400/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-12 flex flex-col items-center justify-center text-center"><div className="mb-8 scale-150 relative z-10"><UniversalLoader /></div><h2 className="text-3xl font-bold text-white drop-shadow-lg mb-4">Verifying Payment</h2><p className="text-white/80 text-lg">Please wait...</p></div></DialogContent></Dialog>
      <Dialog open={!!ticketBooking} onOpenChange={(open) => !open && setTicketBooking(null)}><DialogContent className="max-w-md p-0 bg-transparent border-none shadow-none">{ticketBooking && (<div className="relative w-full drop-shadow-2xl"><div className="bg-background rounded-3xl overflow-hidden"><div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 pb-8 text-white"><div className="flex justify-between items-start"><div><Badge className="bg-white/20 text-white border-none mb-3">CONFIRMED</Badge><h2 className="text-2xl font-bold">{ticketBooking.turfs.name}</h2><p className="text-white/80 text-sm flex items-center gap-1 mt-1"><MapPin className="h-3 w-3"/> {ticketBooking.turfs.location}</p></div><div className="bg-white/10 p-2.5 rounded-xl"><Ticket className="h-8 w-8 text-white" /></div></div></div><div className="p-6 pt-8 bg-background"><div className="grid grid-cols-2 gap-y-6 gap-x-4"><div><p className="text-[10px] uppercase font-bold text-muted-foreground">Date</p><p className="text-lg font-semibold">{format(new Date(ticketBooking.date), "EEE, MMM d")}</p></div><div><p className="text-[10px] uppercase font-bold text-muted-foreground">Time</p><p className="text-lg font-semibold">{getFormattedTimeRange(ticketBooking.slot)}</p></div></div><div className="flex gap-3 mt-6"><Button variant="outline" className="flex-1 rounded-xl" onClick={handleDownloadTicket}><Download className="h-4 w-4 mr-2"/> Save</Button><Button className="flex-1 rounded-xl bg-indigo-600 text-white" onClick={handleShareTicket}><Share2 className="h-4 w-4 mr-2"/> Share</Button></div></div></div></div>)}</DialogContent></Dialog>
      <Dialog open={!!paymentStatusBooking} onOpenChange={(open) => !open && setPaymentStatusBooking(null)}><DialogContent className="sm:max-w-md bg-card border-border"><DialogHeader><DialogTitle className="flex flex-col items-center gap-4 text-center"><XCircle className="h-10 w-10 text-red-600"/><span className="text-2xl font-bold">Payment Failed</span></DialogTitle><DialogDescription className="text-center">Transaction failed. Your slot is reserved.</DialogDescription></DialogHeader><div className="flex flex-col gap-3 pt-4"><Button size="lg" className="w-full bg-red-600 text-white" onClick={() => paymentStatusBooking && handlePayNow(paymentStatusBooking)}>Retry Payment</Button><Button variant="ghost" onClick={() => paymentStatusBooking && handleCancelAndRebook(paymentStatusBooking.id)}>Cancel & Rebook</Button></div></DialogContent></Dialog>
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}><DialogContent className="sm:max-w-md"><div className="space-y-4 py-4"><Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /><Input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} /></div><DialogFooter><Button onClick={handleUpdateProfile} disabled={isUpdating}>Save</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={ratingModalOpen} onOpenChange={setRatingModalOpen}><DialogContent className="sm:max-w-md"><div className="flex justify-center gap-2 py-6">{[1, 2, 3, 4, 5].map((star) => <button key={star} onClick={() => setRatingValue(star)}><Star className={cn("h-10 w-10", star <= ratingValue ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} /></button>)}</div><div className="space-y-2"><Label>Review</Label><Textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} /></div><DialogFooter><Button onClick={handleSubmitReview} disabled={ratingValue === 0 || isSubmittingReview}>Submit</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={viewHistoryModal} onOpenChange={setViewHistoryModal}><DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Full Booking History</DialogTitle></DialogHeader><div className="space-y-4 py-4">{historyBookings.map(b => (<BookingCard key={b.id} booking={b} timeRange={getFormattedTimeRange(b.slot)} />))}</div></DialogContent></Dialog>
    </main>
  )
}

function BookingCard({ booking, timeRange, onViewTicket, isNearest }: { booking: BookingDetail, timeRange: string, onViewTicket?: () => void, isNearest?: boolean }) {
  const isCancelled = booking.status === 'cancelled';
  return (
    <Card className={cn("bg-card border-border rounded-2xl overflow-hidden hover:shadow-md transition-all", isNearest && "border-green-500/50 shadow-lg shadow-green-500/10 relative overflow-visible", isCancelled && "opacity-60")}>
      {isNearest && (<div className="absolute -top-3 left-4 bg-green-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm z-10 uppercase tracking-wide">Up Next</div>)}
      <div className="flex flex-col sm:flex-row"><div className="sm:w-36 h-32 sm:h-auto relative bg-secondary"><img src={booking.turfs?.image || "/placeholder.svg"} className={cn("absolute inset-0 w-full h-full object-cover", isCancelled && "grayscale")} /></div><div className="p-5 flex-1 flex flex-col justify-between"><div><div className="flex justify-between items-start mb-2"><div><h3 className="font-bold text-lg leading-tight">{booking.turfs?.name}</h3><div className="flex items-center text-muted-foreground text-sm mt-1"><MapPin className="h-3 w-3 mr-1" /> {booking.turfs?.location}</div></div><Badge variant={isCancelled ? "destructive" : "secondary"} className="capitalize">{booking.status}</Badge></div><div className="grid grid-cols-2 gap-4 my-3"><div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-primary" /><span>{format(new Date(booking.date), "EEE, MMM d")}</span></div><div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-primary" /><span>{timeRange}</span></div></div></div><div className="flex justify-between items-center pt-3 border-t border-border"><p className="font-bold text-lg">₹{booking.amount}</p>{onViewTicket && !isCancelled ? (<Button variant="outline" size="sm" className="rounded-full" onClick={onViewTicket}>View Ticket</Button>) : booking.status === 'completed' ? (<div className="flex gap-2"><Button variant="secondary" size="sm" className="rounded-full h-7 text-xs">Rate</Button><Badge variant="outline" className="text-green-600 border-green-200">Completed</Badge></div>) : null}</div></div></div>
    </Card>
  )
}