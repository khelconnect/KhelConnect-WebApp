"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
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
  CheckCircle, AlertCircle, Timer, XCircle, Share2, Download, Ticket, ArrowLeft, Loader2, ChevronRight, Info, ThumbsUp, Wallet, Filter, Trash2, MoreHorizontal, ArrowRight, X, Bookmark
} from "lucide-react"
import { format, isPast, parseISO, isValid, isFuture, addMinutes, isBefore } from "date-fns"
import { cn } from "@/lib/utils"
import { UniversalLoader } from "@/components/ui/universal-loader"
import { Capacitor, CapacitorHttp } from "@capacitor/core";
// --- IMPORTS ---
import { SlidingActionCard } from "@/components/SlidingActionCard";
import { MobileSlideCard } from "@/components/MobileSlideCard";
import { BookingTicket } from "@/components/BookingTicket";

export const dynamic = "force-dynamic";

type BookingDetail = {
  id: string; date: string; slot: string[]; amount: number; advance_paid: number; status: string; payment_status: string; rating: number | null; review: string | null; created_at: string | null; sport: string; turfs: { name: string; location: string; image: string; };
}

type TimeSlot = { id: string; start_time: string; end_time: string; }
type UserProfile = { id: string; name: string; email: string; phone: string; created_at: string; }

const formatToIST = (dateString: string | null) => {
  if (!dateString) return "Unknown";
  try {
    const date = new Date(dateString);
    if (!isValid(date)) return "Invalid Date";
    return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
  } catch (e) { return "Unknown"; }
};

function BookingTimer({ createdAt, mode = "badge", className }: { createdAt: string | null, mode?: "badge" | "text", className?: string }) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!createdAt) return;
    const calculate = () => {
      try {
        const createdTime = new Date(createdAt).getTime(); 
        const secondsRemaining = Math.floor((createdTime + (5 * 60 * 1000) - new Date().getTime()) / 1000);
        return secondsRemaining > 0 ? secondsRemaining : 0;
      } catch (e) { return 0; }
    };
    setTimeLeft(calculate());
    const interval = setInterval(() => setTimeLeft(calculate()), 1000);
    return () => clearInterval(interval);
  }, [createdAt]);
  if (!createdAt || timeLeft === null) return null;
  if (timeLeft === 0) return mode === "badge" ? <Badge variant="outline" className="border-red-200 bg-red-50 text-red-600 gap-1 text-[10px] px-1.5 h-5"><XCircle className="h-3 w-3" /> Expired</Badge> : <span className="text-red-500 font-bold">Expired</span>;
  return mode === "badge" ? <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 gap-1 font-mono text-[10px] px-1.5 h-5"><Timer className="h-3 w-3" /> {Math.floor(timeLeft / 60)}:{ (timeLeft % 60).toString().padStart(2, '0') }</Badge> : <span className={cn("font-mono font-bold", className || "text-orange-600 text-xl")}>{Math.floor(timeLeft / 60)}:{ (timeLeft % 60).toString().padStart(2, '0') }</span>;
}

export default function UserProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearUser, setName } = useUserStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("bookings");
  const [historyFilter, setHistoryFilter] = useState("all"); 
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "" });
  const [isUpdating, setIsUpdating] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [viewHistoryModal, setViewHistoryModal] = useState(false);
  const [paymentListModalOpen, setPaymentListModalOpen] = useState(false);
  const [ticketBooking, setTicketBooking] = useState<BookingDetail | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [infoBooking, setInfoBooking] = useState<BookingDetail | null>(null);
  const desktopSliderRef = useRef<HTMLDivElement>(null);
  const mobileSliderRef = useRef<HTMLDivElement>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const fetchUserData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const [profileRes, slotsRes, bookingsRes] = await Promise.all([
      supabase.from("users").select("*").eq("id", user.id).single(),
      supabase.from("time_slots").select("id, start_time, end_time").order('start_time'),
      supabase.from("bookings").select(`id, date, slot, amount, advance_paid, status, payment_status, rating, review, created_at, sport, turfs ( name, location, image )`).eq("user_id", user.id).order("created_at", { ascending: false })
    ]);
    if (profileRes.data) { setProfile(profileRes.data); setEditForm({ name: profileRes.data.name, phone: profileRes.data.phone }); }
    if (slotsRes.data) setTimeSlots(slotsRes.data);
    if (bookingsRes.data) { setBookings(bookingsRes.data.map((b: any) => ({ ...b, turfs: Array.isArray(b.turfs) ? b.turfs[0] : b.turfs })) as BookingDetail[]); }
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchUserData(); }, [fetchUserData]);

  const handleLogout = async () => { await supabase.auth.signOut(); clearUser(); router.push("/"); };
  const handleUpdateProfile = async () => { if (!profile) return; setIsUpdating(true); try { const { error } = await supabase.from("users").update({ name: editForm.name, phone: editForm.phone }).eq("id", profile.id); if (error) throw error; setProfile({ ...profile, ...editForm }); setName(editForm.name); setIsEditModalOpen(false); } catch (e: any) { alert(e.message); } finally { setIsUpdating(false); } };
  const handleOpenRateModal = (booking: BookingDetail) => { setSelectedBookingId(booking.id); setRatingModalOpen(true); };
  const handleSubmitReview = async () => { if (!selectedBookingId || ratingValue === 0) return; setIsSubmittingReview(true); try { const { error } = await supabase.from("bookings").update({ rating: ratingValue, review: reviewText }).eq("id", selectedBookingId); if (error) throw error; setBookings(prev => prev.map(b => b.id === selectedBookingId ? { ...b, rating: ratingValue, review: reviewText } : b)); setRatingModalOpen(false); } catch (e: any) { alert(e.message); } finally { setIsSubmittingReview(false); } };
  
  const handlePayNow = async (booking: BookingDetail) => { 
      if (!profile) return; setIsProcessingPayment(true); 
      try { 
          const payAmount = booking.advance_paid > 0 ? booking.advance_paid : booking.amount;
          const paymentPayload = { bookingId: booking.id, amount: payAmount, customerName: profile.name, customerEmail: profile.email }; 
          let paymentUrl = ""; 
          if (Capacitor.isNativePlatform()) { 
              const response = await CapacitorHttp.post({ url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://khelconnect.in"}/api/payment/create`, headers: { "Content-Type": "application/json" }, data: paymentPayload }); 
              paymentUrl = response.data.paymentUrl; 
          } else { 
              const response = await fetch("/api/payment/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...paymentPayload, returnUrl: `${window.location.origin}/profile?booking_id=${booking.id}` }) }); 
              const result = await response.json(); paymentUrl = result.paymentUrl; 
          } 
          window.location.href = paymentUrl; 
      } catch (error: any) { alert("Payment failed: " + error.message); setIsProcessingPayment(false); } 
  };

  const handleExplicitCancel = useCallback(async (bookingId: string) => {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled', payment_status: 'failed' } : b));
      try { await supabase.from("bookings").update({ status: "cancelled", payment_status: "failed" }).eq("id", bookingId); } catch (error) { console.error(error); }
  }, []);

  const getFormattedTimeRange = (slotIds: string[]) => {
    if (!slotIds || slotIds.length === 0 || timeSlots.length === 0) return "Unknown Time";
    const matchedSlots = slotIds.map(id => timeSlots.find(ts => ts.id === id)).filter(Boolean).sort((a, b) => a!.start_time.localeCompare(b!.start_time));
    return matchedSlots.length > 0 ? `${matchedSlots[0]!.start_time} - ${matchedSlots[matchedSlots.length - 1]!.end_time}` : "Unknown Time";
  };

  const getBookingStartDateTime = (booking: BookingDetail) => {
    const timeRange = getFormattedTimeRange(booking.slot);
    if(timeRange === "Unknown Time") return new Date(booking.date);
    const [time, period] = timeRange.split(" - ")[0].trim().split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    const d = new Date(booking.date); d.setHours(hours, minutes, 0, 0); return d;
  };

  const upcomingBookings = useMemo(() => bookings.filter(b => { 
      if (b.status === 'cancelled' || b.status === 'blocked' || (b.status !== 'confirmed' && b.payment_status !== 'paid')) return false; 
      return isFuture(getBookingStartDateTime(b)); 
  }).sort((a, b) => getBookingStartDateTime(a).getTime() - getBookingStartDateTime(b).getTime()), [bookings, timeSlots]);

  const historyBookings = useMemo(() => bookings.filter(b => { 
      if (b.status === 'completed' || b.status === 'cancelled' || b.payment_status === 'failed') return true; 
      if (b.status === 'confirmed' || b.payment_status === 'paid') return isPast(getBookingStartDateTime(b)); 
      if (b.payment_status === 'pending' && b.created_at && isPast(addMinutes(parseISO(b.created_at), 5))) return true;
      return false; 
  }), [bookings, timeSlots]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') return historyBookings;
    if (historyFilter === 'completed') return historyBookings.filter(b => b.status === 'completed' || b.status === 'confirmed');
    if (historyFilter === 'cancelled') return historyBookings.filter(b => b.status === 'cancelled' || b.payment_status === 'failed');
    return historyBookings;
  }, [historyBookings, historyFilter]);

  const pendingPayments = useMemo(() => bookings.filter(b => (b.payment_status === 'pending' || b.payment_status === 'failed') && b.status !== 'cancelled' && b.status !== 'confirmed' && b.status !== 'completed'), [bookings]);
  const rateableBooking = useMemo(() => bookings.find(b => b.status === 'completed' && !b.rating), [bookings]);
  
  const slides = useMemo(() => {
    const items = [];
    if (upcomingBookings.length > 0) items.push({ type: 'booking', data: upcomingBookings[0] });
    if (pendingPayments.length > 0) items.push({ type: 'payment', data: pendingPayments });
    if (rateableBooking) items.push({ type: 'rate', data: rateableBooking });
    if (items.length === 0) items.push({ type: 'empty' });
    return items;
  }, [upcomingBookings, pendingPayments, rateableBooking]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const newIndex = Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth);
    if (newIndex !== activeSlideIndex && newIndex < slides.length) setActiveSlideIndex(newIndex);
  };

  if (loading) return <UniversalLoader />

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl pb-24 md:pb-8">
      {isProcessingPayment && <UniversalLoader />}

      <div className="flex flex-col md:flex-row gap-6 mb-8 items-start">
        <Card className="w-full md:w-1/3 bg-card border-border rounded-3xl shadow-sm h-full">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6"><div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary"><User className="h-10 w-10" /></div><div><h1 className="text-2xl font-bold">{profile?.name}</h1><p className="text-muted-foreground text-sm">Player</p></div></div>
            <div className="space-y-3"><div className="flex items-center gap-3 text-sm"><CreditCard className="h-4 w-4 text-muted-foreground" /><span>{profile?.email}</span></div><div className="flex items-center gap-3 text-sm"><User className="h-4 w-4 text-muted-foreground" /><span>{profile?.phone}</span></div></div>
            <div className="mt-6 flex gap-3"><Button variant="outline" className="flex-1 rounded-xl" onClick={() => setIsEditModalOpen(true)}><Edit2 className="h-4 w-4 mr-2" /> Edit</Button><Button variant="destructive" className="flex-1 rounded-xl" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" /> Logout</Button></div>
          </CardContent>
        </Card>
        
        <div className="w-full md:w-2/3 flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2 md:gap-4">
                <Card className="bg-primary/5 border-primary/10 rounded-2xl"><CardContent className="p-3 md:p-6 text-center h-full flex flex-col justify-center"><h3 className="text-2xl md:text-4xl font-bold text-primary mb-1">{bookings.filter(b => b.status === 'completed').length}</h3><p className="text-[10px] md:text-sm text-muted-foreground leading-tight">Matches Played</p></CardContent></Card>
                <Card className="bg-green-500/5 border-green-500/10 rounded-2xl"><CardContent className="p-3 md:p-6 text-center h-full flex flex-col justify-center"><h3 className="text-2xl md:text-4xl font-bold text-green-600 mb-1">{upcomingBookings.length}</h3><p className="text-[10px] md:text-sm text-muted-foreground leading-tight">Upcoming</p></CardContent></Card>
                <Card className={cn("rounded-2xl", pendingPayments.length > 0 ? "bg-red-500/5 border-red-500/10" : "bg-secondary/50 border-border")}><CardContent className="p-3 md:p-6 text-center h-full flex flex-col justify-center"><h3 className={cn("text-2xl md:text-4xl font-bold mb-1", pendingPayments.length > 0 ? "text-red-500" : "text-foreground")}>{pendingPayments.length}</h3><p className="text-[10px] md:text-sm text-muted-foreground leading-tight">Pending / Failed</p></CardContent></Card>
            </div>
            <div className="hidden md:block flex-1 min-h-[140px] relative overflow-hidden rounded-2xl border border-border bg-card/50">
               <div ref={desktopSliderRef} className="flex overflow-x-auto gap-4 snap-x snap-mandatory scrollbar-hide h-full w-full px-4" onScroll={handleScroll}>
                  {slides.map((slide, idx) => (
                    <div key={idx} className="w-full flex-shrink-0 snap-center flex flex-col justify-center h-full">
                        {slide.type === 'booking' && (<div className="bg-card border-2 border-green-500/50 p-6 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setTicketBooking(slide.data as BookingDetail)}><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center"><Calendar className="h-6 w-6 text-green-600"/></div><div><p className="font-medium text-lg">Next Match: {(slide.data as BookingDetail).turfs.name}</p><p className="text-muted-foreground text-sm">{format(new Date((slide.data as BookingDetail).date), "PPP")} • {getFormattedTimeRange((slide.data as BookingDetail).slot)}</p></div></div><ChevronRight className="h-5 w-5 text-muted-foreground" /></div>)}
                        {slide.type === 'payment' && (<div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-500/50 p-6 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors" onClick={() => setPaymentListModalOpen(true)}><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center"><AlertCircle className="h-6 w-6 text-red-600"/></div><div><p className="font-medium text-lg text-red-700 dark:text-red-400">Payment Action Needed</p><div className="flex items-center gap-2"><p className="text-sm text-red-600/80 dark:text-red-400/80">{(slide.data as BookingDetail[]).length} pending</p><div className="h-1 w-1 bg-red-400 rounded-full"></div><BookingTimer createdAt={(slide.data as BookingDetail[])[0].created_at} mode="text" className="text-sm font-mono text-red-600 dark:text-red-400 font-bold" /></div></div></div><ChevronRight className="h-5 w-5 text-red-400" /></div>)}
                        {slide.type === 'rate' && (<div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-500/30 p-6 rounded-2xl flex items-center justify-between cursor-pointer" onClick={() => handleOpenRateModal(slide.data as BookingDetail)}><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center"><ThumbsUp className="h-6 w-6 text-blue-600"/></div><div><p className="font-medium text-lg text-blue-700 dark:text-blue-400">Rate last game</p><p className="text-sm text-blue-600/80 dark:text-blue-400/80">{(slide.data as BookingDetail).turfs.name}</p></div></div><Button size="sm" variant="secondary" className="text-blue-600 bg-blue-100 hover:bg-blue-200 border-none">Rate</Button></div>)}
                        {slide.type === 'empty' && (<div className="p-6 flex items-center gap-4"><div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center"><Star className="h-6 w-6 text-muted-foreground"/></div><div><p className="font-medium text-lg">No updates</p><p className="text-muted-foreground text-sm">Ready for your next game?</p></div></div>)}
                    </div>
                  ))}
               </div>
               {slides.length > 1 && (<div className="absolute bottom-4 right-6 flex gap-1.5 pointer-events-none">{slides.map((_, idx) => <div key={idx} className={cn("h-1.5 rounded-full transition-all duration-300", idx === activeSlideIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30")} />)}</div>)}
            </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted rounded-xl p-1 h-12">
          <TabsTrigger value="bookings" className="rounded-lg">My Bookings</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg">History</TabsTrigger>
          <TabsTrigger value="payments" className="rounded-lg">Payments</TabsTrigger>
        </TabsList>
        <TabsContent value="bookings" className="space-y-4">
          {upcomingBookings.length === 0 ? <div className="text-center py-12 opacity-50"><Calendar className="h-12 w-12 mx-auto mb-2" /><p>No confirmed upcoming matches.</p></div> : upcomingBookings.map((b, idx) => (<BookingCard key={b.id} booking={b} timeRange={getFormattedTimeRange(b.slot)} isNearest={idx === 0} onViewTicket={() => setTicketBooking(b)} />))}
        </TabsContent>

        {/* RESTORED HISTORY SECTION WITH FILTERS */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
             <h2 className="text-xl font-bold">Past Matches</h2>
             <div className="flex bg-muted p-1 rounded-lg">
                <Button variant={historyFilter === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setHistoryFilter('all')} className="h-8 rounded-md text-xs px-4">All</Button>
                <Button variant={historyFilter === 'completed' ? 'secondary' : 'ghost'} size="sm" onClick={() => setHistoryFilter('completed')} className="h-8 rounded-md text-xs px-4">Played</Button>
                <Button variant={historyFilter === 'cancelled' ? 'secondary' : 'ghost'} size="sm" onClick={() => setHistoryFilter('cancelled')} className="h-8 rounded-md text-xs px-4">Cancelled</Button>
             </div>
          </div>
          {filteredHistory.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No matches found for this filter.</p>
          ) : (
            <>
              {filteredHistory.slice(0, 5).map(b => (
                <BookingCard key={b.id} booking={b} timeRange={getFormattedTimeRange(b.slot)} onViewTicket={() => setTicketBooking(b)} onViewInfo={() => setInfoBooking(b)} />
              ))}
              {filteredHistory.length > 5 && (
                <Button variant="outline" className="w-full border-dashed py-6 rounded-xl text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50/50 transition-colors" onClick={() => setViewHistoryModal(true)}>
                  View All ({filteredHistory.length}) <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          {pendingPayments.map(booking => (
             <SlidingActionCard key={booking.id} data={{ id: booking.id, title: booking.turfs?.name, date: booking.date, createdAt: booking.created_at, timeRange: getFormattedTimeRange(booking.slot), amount: booking.amount, advancePaid: booking.advance_paid, status: booking.status, paymentStatus: booking.payment_status }} actions={{ onPay: () => handlePayNow(booking), onCancel: () => handleExplicitCancel(booking.id), isProcessing: isProcessingPayment }} theme={{ borderLeft: "border-l-red-500", actionBackground: "bg-red-500", actionBorder: "border-red-400", primaryBtn: "bg-white text-red-600", secondaryBtn: "text-white", toggleBtnActive: "bg-red-100 text-red-600", statusText: "text-red-500", alertIconColor: "text-red-600" }} />
          ))}
        </TabsContent>
      </Tabs>

      {/* MOBILE STICKY SLIDER */}
      {slides.length > 0 && slides[0].type !== 'empty' && (
        <div className="md:hidden fixed bottom-4 left-0 right-0 z-50">
           <div ref={mobileSliderRef} className="flex overflow-x-auto gap-4 snap-x snap-mandatory scrollbar-hide px-4 pb-4" onScroll={handleScroll}>
              {slides.map((slide, idx) => (
                <div key={idx} className="w-[calc(100vw-32px)] flex-shrink-0 snap-center">
                    {slide.type === 'payment' && (
                        <MobileSlideCard icon={<AlertCircle className="h-5 w-5"/>} title="Action Required" subContent={<><p>{(slide.data as BookingDetail[]).length} Pending</p><div className="h-1 w-1 bg-current rounded-full opacity-50"></div><BookingTimer createdAt={(slide.data as BookingDetail[])[0].created_at} mode="text" className="font-mono font-bold" /></>} onClick={(e) => { e.stopPropagation(); setPaymentListModalOpen(true); }} theme={{ bg: "bg-red-500/10", border: "border-red-500/20", iconBg: "bg-red-500/20", iconColor: "text-red-200", titleColor: "text-red-100", subTextColor: "text-red-200/80", arrowColor: "text-red-300", glass: true }} />
                    )}
                    {slide.type === 'booking' && (
                        <MobileSlideCard icon={<Calendar className="h-5 w-5"/>} title="Next Match" subContent={(slide.data as BookingDetail).turfs.name.substring(0, 15) + "..."} onClick={() => setTicketBooking(slide.data as BookingDetail)} rightContent={<div className="text-right"><p className="text-xs font-bold">{format(new Date((slide.data as BookingDetail).date), "MMM d")}</p><p className="text-[10px] opacity-80">{getFormattedTimeRange((slide.data as BookingDetail).slot).split(" - ")[0]}</p></div>} theme={{ bg: "bg-white/10", border: "border-white/20", iconBg: "bg-white/20", iconColor: "text-white", titleColor: "text-white", subTextColor: "text-white/80", arrowColor: "text-white", glass: true }} />
                    )}
                    {slide.type === 'rate' && (
                        <MobileSlideCard icon={<ThumbsUp className="h-5 w-5"/>} title="How was the game?" subContent={(slide.data as BookingDetail).turfs.name} onClick={() => handleOpenRateModal(slide.data as BookingDetail)} rightContent={<Button size="sm" variant="secondary" className="text-green-600 h-8 text-xs font-bold rounded-full bg-white">Rate</Button>} theme={{ bg: "bg-green-500/10", border: "border-green-500/20", iconBg: "bg-green-500/20", iconColor: "text-green-100", titleColor: "text-green-50", subTextColor: "text-green-200/80", arrowColor: "text-green-300", glass: true }} />
                    )}
                </div>
              ))}
           </div>
           {slides.length > 1 && (<div className="flex justify-center gap-1.5 mt-2">{slides.map((_, idx) => <div key={idx} className={cn("h-1.5 rounded-full transition-all shadow-sm", idx === activeSlideIndex ? "w-4 bg-white/80" : "w-1.5 bg-black/20")} />)}</div>)}
        </div>
      )}

      {/* --- TICKET MODAL --- */}
      <Dialog open={!!ticketBooking} onOpenChange={(open) => !open && setTicketBooking(null)}>
        <DialogContent 
          className="bg-transparent border-none shadow-none p-0 w-fit max-w-full sm:max-w-md outline-none focus:ring-0 overflow-visible flex items-center justify-center"
          onPointerDownOutside={() => setTicketBooking(null)}
        >
          <DialogTitle className="sr-only">Ticket Details</DialogTitle>
          {ticketBooking && (
             <BookingTicket 
                booking={ticketBooking}
                formattedTimeRange={getFormattedTimeRange(ticketBooking.slot)}
                userName={profile?.name || "Player"}
                onShare={() => {}} 
             />
          )}
        </DialogContent>
      </Dialog>

      {/* --- VIEW ALL HISTORY MODAL --- */}
      <Dialog open={viewHistoryModal} onOpenChange={setViewHistoryModal}>
        <DialogContent className="sm:max-w-xl w-[95vw] rounded-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background border-border">
            <DialogHeader className="p-6 pb-2">
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-emerald-500" /> Complete History
                </DialogTitle>
                <DialogDescription>A list of all your {historyFilter} matches.</DialogDescription>
            </DialogHeader>
            {/* Emerald Scrollbar styling applied here */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 
                [&::-webkit-scrollbar]:w-1.5
                [&::-webkit-scrollbar-track]:bg-transparent
                [&::-webkit-scrollbar-thumb]:bg-emerald-500/30
                [&::-webkit-scrollbar-thumb]:rounded-full
                hover:[&::-webkit-scrollbar-thumb]:bg-emerald-500/60">
                {filteredHistory.map(b => (
                   <BookingCard key={b.id} booking={b} timeRange={getFormattedTimeRange(b.slot)} onViewTicket={() => { setViewHistoryModal(false); setTicketBooking(b); }} onViewInfo={() => setInfoBooking(b)} />
                ))}
            </div>
            <DialogFooter className="p-4 border-t bg-muted/20">
                <Button variant="ghost" onClick={() => setViewHistoryModal(false)} className="w-full rounded-xl">Close History</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OTHER MODALS (PAYMENT LIST, INFO, EDIT, RATE) */}
      <Dialog open={paymentListModalOpen} onOpenChange={setPaymentListModalOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-red-600"/> Pending Payments ({pendingPayments.length})</DialogTitle><DialogDescription>Pay now to confirm or cancel to free up slots.</DialogDescription></DialogHeader>
            <div className="space-y-3 py-2">
                {pendingPayments.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border">
                        <div className="flex-1 min-w-0 mr-3"><p className="font-bold text-sm truncate">{p.turfs.name}</p><p className="text-xs text-muted-foreground">{formatToIST(p.created_at)}</p></div>
                        <div className="flex gap-2"><Button size="icon" variant="ghost" className="h-9 w-9 text-red-500 bg-red-50" onClick={() => { handleExplicitCancel(p.id); setPaymentListModalOpen(false); }}><Trash2 className="h-4 w-4"/></Button><Button size="icon" className="h-9 w-9 bg-green-600" onClick={() => { handlePayNow(p); setPaymentListModalOpen(false); }}><Wallet className="h-4 w-4"/></Button></div>
                    </div>
                ))}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setPaymentListModalOpen(false)} className="w-full">Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!infoBooking} onOpenChange={(open) => !open && setInfoBooking(null)}><DialogContent className="sm:max-w-md w-[90vw] rounded-2xl"><DialogHeader><DialogTitle className="flex items-center gap-3 text-red-600"><XCircle className="h-6 w-6"/> Booking Cancelled</DialogTitle><DialogDescription>Details regarding this cancellation.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="bg-red-50 border border-red-100 p-4 rounded-xl"><p className="text-sm font-bold text-red-800 mb-1">Reason for Cancellation</p><p className="text-sm text-red-700">{infoBooking?.payment_status === 'failed' ? "Payment failed at gateway." : "Payment timed out."}</p></div><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-muted-foreground">Attempted Date</p><p className="font-medium">{infoBooking ? format(new Date(infoBooking.date), "PPP") : "-"}</p></div><div><p className="text-muted-foreground">Booking ID</p><p className="font-mono">{infoBooking?.id.slice(0,8).toUpperCase()}</p></div></div></div><DialogFooter><Button variant="outline" onClick={() => setInfoBooking(null)}>Close</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}><DialogContent className="sm:max-w-md w-[90vw] rounded-2xl"><DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader><div className="space-y-4 py-4"><Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /><Input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} /></div><DialogFooter><Button onClick={handleUpdateProfile} disabled={isUpdating}>Save</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={ratingModalOpen} onOpenChange={setRatingModalOpen}><DialogContent className="sm:max-w-md w-[90vw] rounded-2xl"><DialogHeader><DialogTitle>Rate Your Experience</DialogTitle></DialogHeader><div className="flex justify-center gap-2 py-6">{[1, 2, 3, 4, 5].map((star) => <button key={star} onClick={() => setRatingValue(star)}><Star className={cn("h-10 w-10", star <= ratingValue ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} /></button>)}</div><div className="space-y-2"><Label>Review</Label><Textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} /></div><DialogFooter><Button onClick={handleSubmitReview} disabled={ratingValue === 0 || isSubmittingReview}>Submit</Button></DialogFooter></DialogContent></Dialog>
    </main>
  )
}

function BookingCard({ booking, timeRange, onViewTicket, onViewInfo, isNearest }: { booking: BookingDetail, timeRange: string, onViewTicket?: () => void, onViewInfo?: () => void, isNearest?: boolean }) {
  const isCancelled = booking.status === 'cancelled' || booking.payment_status === 'failed';
  return (
    <Card className={cn("bg-card border-border rounded-2xl overflow-hidden hover:shadow-md transition-all", isNearest && "border-green-500/50 shadow-lg relative", isCancelled && "opacity-60")}>
      {isNearest && (<div className="absolute -top-3 left-4 bg-green-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm z-10 uppercase">Up Next</div>)}
      <div className="flex flex-col sm:flex-row"><div className="sm:w-36 h-32 sm:h-auto relative bg-secondary"><img src={booking.turfs?.image || "/placeholder.svg"} className={cn("absolute inset-0 w-full h-full object-cover", isCancelled && "grayscale")} /></div><div className="p-5 flex-1 flex flex-col justify-between"><div><div className="flex justify-between items-start mb-2"><div><h3 className="font-bold text-lg leading-tight">{booking.turfs?.name}</h3><div className="flex items-center text-muted-foreground text-sm mt-1"><MapPin className="h-3 w-3 mr-1" /> {booking.turfs?.location}</div></div><Badge variant={isCancelled ? "destructive" : "secondary"}>{isCancelled ? "Cancelled" : booking.status}</Badge></div>
      <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2"><span>{booking.sport}</span></div>
      <div className="grid grid-cols-2 gap-4 my-3"><div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-primary" /><span>{format(new Date(booking.date), "EEE, MMM d")}</span></div><div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-primary" /><span>{timeRange}</span></div></div>
      {isCancelled && booking.created_at && (<div className="mt-2 text-xs text-muted-foreground border-t border-dashed pt-2 flex items-center gap-1"><Info className="h-3 w-3" /> Booked: {formatToIST(booking.created_at)}</div>)}
      </div><div className="flex justify-between items-center pt-3 border-t border-border"><p className="font-bold text-lg">₹{booking.amount}</p>{isCancelled ? (<Button variant="ghost" size="sm" className="text-xs" onClick={onViewInfo}><Info className="h-3 w-3 mr-1"/> Info</Button>) : booking.status === 'completed' || booking.status === 'confirmed' ? (<div className="flex gap-2"><Button variant="secondary" size="sm" className="rounded-full h-7 text-xs" onClick={() => (booking.status === 'completed' && !booking.rating) && onViewTicket?.()}>View / Rate</Button><Button variant="outline" size="sm" className="rounded-full h-7 text-xs border-dashed" onClick={onViewTicket}>View Ticket</Button></div>) : (<Button variant="outline" size="sm" className="rounded-full" onClick={onViewTicket}>View Ticket</Button>)}</div></div></div>
    </Card>
  )
}