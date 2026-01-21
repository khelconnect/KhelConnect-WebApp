"use client"

import { useEffect, useState, useCallback } from "react"
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
  CheckCircle, AlertCircle, Timer, XCircle, Share2, Download, Ticket, ArrowLeft, Loader2
} from "lucide-react"
import { format, isPast, parseISO, isValid } from "date-fns"
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

// --- HELPER: TIMER COMPONENT ---
function BookingTimer({ createdAt, onExpire, mode = "badge" }: { createdAt: string | null, onExpire: () => void, mode?: "badge" | "text" }) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!createdAt) return;

    const calculate = () => {
      try {
        const createdTime = new Date(createdAt).getTime(); 
        if (isNaN(createdTime)) return 0;

        const expiryTime = createdTime + (5 * 60 * 1000); 
        const nowTime = new Date().getTime(); 
        const secondsRemaining = Math.floor((expiryTime - nowTime) / 1000);
        
        if (secondsRemaining <= 0) {
          setIsExpired(true);
          onExpire(); 
          return 0;
        }
        return secondsRemaining;
      } catch (e) { return 0; }
    };

    const initial = calculate();
    setTimeLeft(initial);

    if (initial <= 0) return;

    const interval = setInterval(() => {
      const remaining = calculate();
      if (remaining <= 0) {
        setIsExpired(true);
        setTimeLeft(0);
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [createdAt, onExpire]);

  if (!createdAt) return null;

  if (isExpired) {
    return mode === "badge" ? (
      <Badge variant="outline" className="border-red-200 bg-red-50 text-red-600 gap-1 text-[10px] px-1.5 h-5"><XCircle className="h-3 w-3" /> Expired</Badge>
    ) : <span className="text-red-500 font-bold">Expired</span>;
  }

  if (timeLeft === null) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return mode === "badge" ? (
    <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 gap-1 font-mono text-[10px] px-1.5 h-5">
      <Timer className="h-3 w-3" /> {timeString}
    </Badge>
  ) : (
    <span className="font-mono text-xl font-bold text-orange-600">{timeString}</span>
  );
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
  
  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", phone: "" })
  const [isUpdating, setIsUpdating] = useState(false)
  
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [ratingValue, setRatingValue] = useState(0)
  const [reviewText, setReviewText] = useState("")
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  
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

  useEffect(() => {
    setLoading(true);
    fetchUserData();
  }, [fetchUserData]);

  // --- 2. HANDLE RETURN FROM PAYMENT (OPTIMISTIC VERIFICATION) ---
  useEffect(() => {
    const returnBookingId = searchParams.get("booking_id");
    const dodoStatus = searchParams.get("payment_status"); // 'succeeded', 'failed', or 'pending'
    
    // Only run if we have bookings loaded and a return ID is present
    if (returnBookingId && bookings.length > 0) {
      const targetBooking = bookings.find(b => b.id === returnBookingId);
      
      if (targetBooking) {
        // --- SCENARIO A: Success (Trust URL OR DB) ---
        if (dodoStatus === 'succeeded' || targetBooking.payment_status === "paid" || targetBooking.status === "confirmed") {
          // Optimistically update local state for the UI
          setTicketBooking({ ...targetBooking, status: 'confirmed', payment_status: 'paid' });
          router.replace("/profile");
          
          // Background Sync: Ensure DB matches URL
          supabase.from("bookings").update({ status: 'confirmed', payment_status: 'paid' }).eq("id", returnBookingId).then(() => fetchUserData());
        } 
        
        // --- SCENARIO B: Failure (Trust URL OR DB) ---
        else if (dodoStatus === 'failed' || targetBooking.payment_status === "failed") {
          setPaymentStatusBooking({ ...targetBooking, payment_status: 'failed' });
          router.replace("/profile");
        }
        
        // --- SCENARIO C: Pending / Unknown -> Start Polling ---
        else {
          setIsVerifyingPayment(true);
          let attempts = 0;
          const maxAttempts = 10; // 20 Seconds

          const pollInterval = setInterval(async () => {
              attempts++;
              // Direct ID Query for Speed
              const { data: fresh } = await supabase
                .from("bookings")
                .select(`id, date, slot, amount, status, payment_status, rating, review, created_at, turfs ( name, location, image )`)
                .eq("id", returnBookingId)
                .single();

              if (fresh) {
                const flatBooking = { 
                    ...fresh, 
                    turfs: Array.isArray(fresh.turfs) ? fresh.turfs[0] : fresh.turfs 
                } as BookingDetail;

                if (flatBooking.payment_status === "paid" || flatBooking.status === "confirmed") {
                    clearInterval(pollInterval);
                    setIsVerifyingPayment(false);
                    setTicketBooking(flatBooking);
                    setBookings(prev => prev.map(b => b.id === flatBooking.id ? flatBooking : b));
                    router.replace("/profile");
                } 
                else if (flatBooking.payment_status === "failed") {
                    clearInterval(pollInterval);
                    setIsVerifyingPayment(false);
                    setPaymentStatusBooking(flatBooking);
                    router.replace("/profile");
                }
                else if (attempts >= maxAttempts) {
                    // TIMEOUT -> Show Retry Modal
                    clearInterval(pollInterval);
                    setIsVerifyingPayment(false);
                    setPaymentStatusBooking(flatBooking);
                    router.replace("/profile");
                }
              }
          }, 2000); // Poll every 2 seconds
          
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

  // --- HANDLERS ---
  const handleLogout = async () => { await supabase.auth.signOut(); clearUser(); router.push("/"); }
  const handleUpdateProfile = async () => { if (!profile) return; setIsUpdating(true); try { const { error } = await supabase.from("users").update({ name: editForm.name, phone: editForm.phone }).eq("id", profile.id); if (error) throw error; setProfile({ ...profile, ...editForm }); setName(editForm.name); setIsEditModalOpen(false); } catch (e: any) { alert("Error: " + e.message); } finally { setIsUpdating(false); } }
  const handleSubmitReview = async () => { if (!selectedBookingId || ratingValue === 0) return; setIsSubmittingReview(true); try { const { error } = await supabase.from("bookings").update({ rating: ratingValue, review: reviewText }).eq("id", selectedBookingId); if (error) throw error; setBookings(prev => prev.map(b => b.id === selectedBookingId ? { ...b, rating: ratingValue, review: reviewText } : b)); setRatingModalOpen(false); } catch (e: any) { alert("Error: " + e.message); } finally { setIsSubmittingReview(false); } }
  
  const handlePayNow = async (booking: BookingDetail) => {
    if (!profile) return; setIsProcessingPayment(true);
    try {
      const paymentPayload = { bookingId: booking.id, amount: booking.amount, customerName: profile.name, customerEmail: profile.email };
      let paymentUrl = "";
      if (Capacitor.isNativePlatform()) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://khelconnect.in";
        const response = await CapacitorHttp.post({ url: `${baseUrl}/api/payment/create`, headers: { "Content-Type": "application/json" }, data: paymentPayload });
        if (response.status !== 200) throw new Error("Native Payment API Error");
        paymentUrl = response.data.paymentUrl;
      } else {
        const response = await fetch("/api/payment/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(paymentPayload) });
        const result = await response.json(); if (!response.ok) throw new Error(result.error || "Payment generation failed"); paymentUrl = result.paymentUrl;
      }
      window.location.href = paymentUrl;
    } catch (error: any) { console.error("Payment Error:", error); alert("Payment failed: " + error.message); setIsProcessingPayment(false); }
  };

  const handleBookingExpired = useCallback(async (bookingId: string) => {
    const { data: fresh } = await supabase.from("bookings").select("status, payment_status").eq("id", bookingId).single();
    if (fresh && (fresh.status === 'confirmed' || fresh.payment_status === 'paid')) { await fetchUserData(); return; }
    
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
    try { await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId); } catch (error) { console.error(error); }
  }, [fetchUserData]);

  const handleCancelAndRebook = async (bookingId: string) => { await handleBookingExpired(bookingId); router.push("/turfs"); };
  const handleDownloadTicket = () => { alert("Ticket download started..."); };
  const handleShareTicket = async () => { if (navigator.share && ticketBooking) { try { await navigator.share({ title: `Match at ${ticketBooking.turfs.name}`, text: `I'm playing at ${ticketBooking.turfs.name} on ${format(new Date(ticketBooking.date), "PPP")}. Join me!`, url: window.location.href }); } catch (err) { console.error(err); } } else { alert("Share URL copied to clipboard!"); } };

  // --- FILTERED LISTS ---
  const upcomingBookings = bookings.filter(b => !isPast(new Date(b.date)) && b.status !== 'cancelled' && (b.status === 'confirmed' || b.payment_status === 'paid'));
  const historyBookings = bookings.filter(b => b.status === 'completed' || (b.status === 'confirmed' && isPast(new Date(b.date))) || b.status === 'cancelled');
  const pendingPayments = bookings.filter(b => (b.payment_status === 'pending' || b.payment_status === 'failed') && b.status !== 'cancelled' && b.status !== 'confirmed' && b.status !== 'completed');

  if (loading) return <UniversalLoader />

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      {isProcessingPayment && <UniversalLoader />}

      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row gap-6 mb-8 items-start">
        <Card className="w-full md:w-1/3 bg-card border-border rounded-3xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6"><div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary"><User className="h-10 w-10" /></div><div><h1 className="text-2xl font-bold">{profile?.name}</h1><p className="text-muted-foreground text-sm">Player</p></div></div>
            <div className="space-y-3"><div className="flex items-center gap-3 text-sm"><CreditCard className="h-4 w-4 text-muted-foreground" /><span>{profile?.email}</span></div><div className="flex items-center gap-3 text-sm"><User className="h-4 w-4 text-muted-foreground" /><span>{profile?.phone}</span></div></div>
            <div className="mt-6 flex gap-3"><Button variant="outline" className="flex-1 rounded-xl" onClick={() => setIsEditModalOpen(true)}><Edit2 className="h-4 w-4 mr-2" /> Edit</Button><Button variant="destructive" className="flex-1 rounded-xl" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" /> Logout</Button></div>
          </CardContent>
        </Card>
        <div className="w-full md:w-2/3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-primary/5 border-primary/10 rounded-2xl"><CardContent className="p-6 text-center"><h3 className="text-4xl font-bold text-primary mb-1">{bookings.length}</h3><p className="text-sm text-muted-foreground">Total Activity</p></CardContent></Card>
          <Card className="bg-green-500/5 border-green-500/10 rounded-2xl"><CardContent className="p-6 text-center"><h3 className="text-4xl font-bold text-green-600 mb-1">{upcomingBookings.length}</h3><p className="text-sm text-muted-foreground">Upcoming</p></CardContent></Card>
          <Card className={cn("rounded-2xl", pendingPayments.length > 0 ? "bg-red-500/5 border-red-500/10" : "bg-secondary/50 border-border")}><CardContent className="p-6 text-center"><h3 className={cn("text-4xl font-bold mb-1", pendingPayments.length > 0 ? "text-red-500" : "text-foreground")}>{pendingPayments.length}</h3><p className="text-sm text-muted-foreground">Pending / Failed</p></CardContent></Card>
        </div>
      </div>

      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted rounded-xl p-1 h-12">
          <TabsTrigger value="bookings" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">My Bookings</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">History</TabsTrigger>
          <TabsTrigger value="payments" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Payments {pendingPayments.length > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingPayments.length}</span>}</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-4">
          {upcomingBookings.length === 0 ? <div className="text-center py-12 bg-secondary/30 rounded-3xl border border-dashed"><Calendar className="h-12 w-12 mx-auto opacity-50 mb-3" /><p>No confirmed upcoming matches.</p><Button className="mt-4 rounded-full" onClick={() => router.push("/turfs")}>Book Now</Button></div> : upcomingBookings.map(b => <BookingCard key={b.id} booking={b} timeRange={getFormattedTimeRange(b.slot)} onViewTicket={() => setTicketBooking(b)} />)}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {historyBookings.map(b => <BookingCard key={b.id} booking={b} timeRange={getFormattedTimeRange(b.slot)} />)}
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          {pendingPayments.map(booking => (
            <Card key={booking.id} className="bg-card border-l-4 border-l-red-500 rounded-xl shadow-sm">
              <CardContent className="p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="font-bold">{booking.turfs?.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <p className="text-sm text-red-500 font-medium flex items-center gap-1"><AlertCircle className="h-4 w-4" /> {booking.payment_status === 'failed' ? 'Payment Failed' : 'Pending'}</p>
                    <BookingTimer createdAt={booking.created_at} onExpire={() => handleBookingExpired(booking.id)} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Booked: {formatToIST(booking.created_at)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-xl font-bold">₹{booking.amount}</p>
                  <Button onClick={() => handlePayNow(booking)} disabled={isProcessingPayment} className="bg-red-600 hover:bg-red-700 text-white">{booking.payment_status === 'failed' ? 'Retry' : 'Pay Now'}</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* --- MODAL 1: VERIFYING PAYMENT (BIGGER LIQUID GLASS) --- */}
      <Dialog open={isVerifyingPayment} onOpenChange={() => {}}>
        <DialogContent 
          className="sm:max-w-lg border-none shadow-none bg-transparent p-0 flex items-center justify-center min-h-[400px] overflow-visible"
          onInteractOutside={(e) => e.preventDefault()}
        >
            <div className="relative w-full max-w-md overflow-visible rounded-[2.5rem] bg-white/10 backdrop-blur-3xl border-2 border-green-400/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-12 flex flex-col items-center justify-center text-center">
                <div className="absolute inset-0 bg-gradient-to-tr from-green-500/10 via-transparent to-emerald-500/10 rounded-[2.5rem] pointer-events-none"></div>
                <div className="mb-8 scale-150 relative z-10">
                    <UniversalLoader />
                </div>
                <h2 className="text-3xl font-bold text-white drop-shadow-lg mb-4 tracking-tight">Verifying Payment</h2>
                <p className="text-white/80 text-lg font-medium">Please wait while we secure your slot...</p>
                <p className="text-white/50 text-xs mt-8">Do not refresh the page.</p>
            </div>
        </DialogContent>
      </Dialog>

      {/* --- MODAL 2: TICKET SUCCESS POPUP --- */}
      <Dialog open={!!ticketBooking} onOpenChange={(open) => !open && setTicketBooking(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-transparent border-none shadow-none sm:max-w-md">
          {ticketBooking && (
            <div className="relative w-full drop-shadow-2xl">
              <div 
                className="bg-background rounded-3xl overflow-hidden relative"
                style={{
                  maskImage: `radial-gradient(circle at 0 13rem, transparent 1rem, black 1rem), radial-gradient(circle at 100% 13rem, transparent 1rem, black 1rem)`,
                  WebkitMaskImage: `radial-gradient(circle at 0 13rem, transparent 1rem, black 1rem), radial-gradient(circle at 100% 13rem, transparent 1rem, black 1rem)`
                }}
              >
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 pb-8 text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge className="bg-white/20 text-white hover:bg-white/30 border-none mb-3 backdrop-blur-md">CONFIRMED</Badge>
                      <h2 className="text-2xl font-bold leading-tight">{ticketBooking.turfs.name}</h2>
                      <p className="text-white/80 text-sm flex items-center gap-1 mt-1"><MapPin className="h-3 w-3"/> {ticketBooking.turfs.location}</p>
                    </div>
                    <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-sm"><Ticket className="h-8 w-8 text-white" /></div>
                  </div>
                </div>
                <div className="relative h-0"><div className="absolute top-0 left-4 right-4 border-t-2 border-dashed border-gray-200/50 -mt-[1px]"></div></div>
                <div className="p-6 pt-8 bg-background">
                  <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                    <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Date</p><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /><span className="font-semibold text-base">{format(new Date(ticketBooking.date), "EEE, MMM d")}</span></div></div>
                    <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Time</p><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /><span className="font-semibold text-base">{getFormattedTimeRange(ticketBooking.slot)}</span></div></div>
                    <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Player</p><div className="flex items-center gap-2"><User className="h-4 w-4 text-primary" /><span className="font-medium truncate max-w-[120px]">{profile?.name || "Player"}</span></div></div>
                    <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Amount</p><p className="text-xl font-bold text-green-600">₹{ticketBooking.amount}</p></div>
                  </div>
                  <div className="mt-8 p-4 bg-secondary/30 rounded-xl border border-dashed border-border flex items-center justify-between">
                    <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Booking ID</p><p className="font-mono text-sm tracking-widest">{ticketBooking.id.slice(0, 8).toUpperCase()}</p></div>
                    <div className="h-8 w-8 bg-black/5 rounded-md flex items-center justify-center"><CheckCircle className="h-5 w-5 text-green-600" /></div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={handleDownloadTicket}><Download className="h-4 w-4 mr-2"/> Save</Button>
                    <Button className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleShareTicket}><Share2 className="h-4 w-4 mr-2"/> Share</Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* --- MODAL 3: PAYMENT STATUS POPUP --- */}
      <Dialog open={!!paymentStatusBooking} onOpenChange={(open) => !open && setPaymentStatusBooking(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex flex-col items-center gap-4 pt-4 text-center">
              <div className={cn("p-4 rounded-full", paymentStatusBooking?.payment_status === 'failed' ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600")}>
                {paymentStatusBooking?.payment_status === 'failed' ? <XCircle className="h-10 w-10"/> : <Clock className="h-10 w-10"/>}
              </div>
              <span className="text-2xl font-bold">{paymentStatusBooking?.payment_status === 'failed' ? "Payment Failed" : "Status Unknown"}</span>
            </DialogTitle>
            <DialogDescription className="text-center text-base pt-2 space-y-4">
              <p>{paymentStatusBooking?.payment_status === 'failed' ? "Your transaction could not be completed. Your slot is reserved for:" : "We couldn't verify the payment yet. Your slot is reserved for:"}</p>
              <div className="flex justify-center"><BookingTimer mode="text" createdAt={paymentStatusBooking?.created_at || null} onExpire={() => { setPaymentStatusBooking(null); handleBookingExpired(paymentStatusBooking?.id || ""); }} /></div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <Button size="lg" className="w-full rounded-xl bg-red-600 hover:bg-red-700 text-white" onClick={() => paymentStatusBooking && handlePayNow(paymentStatusBooking)}>Retry Payment Now</Button>
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => paymentStatusBooking && handleCancelAndRebook(paymentStatusBooking.id)}><ArrowLeft className="h-4 w-4 mr-2"/> Re-choose Slot (Cancel This)</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit/Rating Modals */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}><DialogContent className="sm:max-w-md"><div className="space-y-4 py-4"><Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /><Input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} /></div><DialogFooter><Button onClick={handleUpdateProfile} disabled={isUpdating}>Save</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={ratingModalOpen} onOpenChange={setRatingModalOpen}><DialogContent className="sm:max-w-md"><div className="flex justify-center gap-2 py-6">{[1, 2, 3, 4, 5].map((star) => <button key={star} onClick={() => setRatingValue(star)}><Star className={cn("h-10 w-10", star <= ratingValue ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} /></button>)}</div><div className="space-y-2"><Label>Review</Label><Textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} /></div><DialogFooter><Button onClick={handleSubmitReview} disabled={ratingValue === 0 || isSubmittingReview}>Submit</Button></DialogFooter></DialogContent></Dialog>
    </main>
  )
}

// Sub-component
function BookingCard({ booking, timeRange, onViewTicket }: { booking: BookingDetail, timeRange: string, onViewTicket?: () => void }) {
  return (
    <Card className="bg-card border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-40 h-32 sm:h-auto relative bg-secondary"><img src={booking.turfs?.image || "/placeholder.svg"} className="absolute inset-0 w-full h-full object-cover" /></div>
        <div className="p-5 flex-1">
          <div className="flex justify-between items-start mb-2"><div><h3 className="font-bold text-lg">{booking.turfs?.name}</h3><div className="flex items-center text-muted-foreground text-sm mt-1"><MapPin className="h-3 w-3 mr-1" /> {booking.turfs?.location}</div></div><Badge variant="secondary" className="capitalize">{booking.status}</Badge></div>
          <div className="grid grid-cols-2 gap-4 my-4"><div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-primary" /><span>{format(new Date(booking.date), "EEE, MMM d")}</span></div><div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-primary" /><span>{timeRange}</span></div></div>
          <div className="flex justify-between items-center pt-4 border-t border-border">
            <p className="font-bold text-lg">₹{booking.amount}</p>
            {onViewTicket ? <Button variant="outline" size="sm" className="rounded-full" onClick={onViewTicket}>View Ticket</Button> : <Button variant="ghost" size="sm" disabled>Completed</Button>}
          </div>
        </div>
      </div>
    </Card>
  )
}