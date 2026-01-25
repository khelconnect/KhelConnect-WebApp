"use client"

import { useRef, useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { 
  ArrowRight, Calendar, Clock, MapPin, ChevronRight, ChevronLeft, 
  X, AlertCircle, Star, ThumbsUp, Ticket, CheckCircle, User, Building2,
  Share2, Download, Loader2 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabaseClient"
import { useUserStore } from "@/lib/userStore"
import { UniversalLoader } from "@/components/ui/universal-loader"
import { format, isFuture, isPast, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { Capacitor, CapacitorHttp } from "@capacitor/core";

// --- IMPORT THE COMPONENTS ---
import { AuthWizard } from "@/components/AuthWizard"
import { MobileSlideCard } from "@/components/MobileSlideCard"

type BookingDetail = {
  id: string; date: string; slot: string[]; amount: number; status: string; payment_status: string; rating: number | null; review: string | null; created_at: string | null; turfs: { name: string; location: string; };
}

type TimeSlot = { id: string; start_time: string; end_time: string; }

type SlideItem = 
  | { type: 'booking', key: string, data: BookingDetail }
  | { type: 'payment', key: string, data: BookingDetail[] }
  | { type: 'rate', key: string, data: BookingDetail };

function BookingTimer({ createdAt, className }: { createdAt: string | null, className?: string }) {
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
  if (timeLeft === 0) return <span className="font-bold text-[10px]">Expired</span>;
  return <span className={cn("font-mono font-bold", className)}>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>;
}

export default function Home() {
  const router = useRouter()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const mobileSliderRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  
  const [userBookings, setUserBookings] = useState<BookingDetail[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [dismissedKeys, setDismissedKeys] = useState<string[]>([])

  const [ticketBooking, setTicketBooking] = useState<BookingDetail | null>(null)
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [selectedRateBooking, setSelectedRateBooking] = useState<BookingDetail | null>(null)
  const [ratingValue, setRatingValue] = useState(0)
  const [reviewText, setReviewText] = useState("")
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [pendingPaymentList, setPendingPaymentList] = useState<BookingDetail[]>([]) 
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  
  const { name } = useUserStore()

  useEffect(() => {
    const checkSession = async () => {
      await supabase.auth.getSession()
      setLoading(false)
    }
    checkSession()
  }, []);

  useEffect(() => {
    if (!name) return;
    const fetchSliderData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) return;
        const [bookingsRes, slotsRes] = await Promise.all([
            supabase.from("bookings").select(`id, date, slot, amount, status, payment_status, rating, review, created_at, turfs ( name, location )`).eq("user_id", user.id).order("created_at", { ascending: false }),
            supabase.from("time_slots").select("id, start_time, end_time")
        ]);
        if (bookingsRes.data) {
             const formatted = bookingsRes.data.map((b: any) => ({ ...b, turfs: Array.isArray(b.turfs) ? b.turfs[0] : b.turfs })) as BookingDetail[];
             setUserBookings(formatted);
        }
        if (slotsRes.data) setTimeSlots(slotsRes.data);
    };
    fetchSliderData();
  }, [name]);

  const getFormattedTimeRange = (slotIds: string[]) => {
    if (!slotIds || slotIds.length === 0 || timeSlots.length === 0) return "Unknown Time";
    const matchedSlots = slotIds.map(id => timeSlots.find(ts => ts.id === id)).filter(Boolean).sort((a, b) => a!.start_time.localeCompare(b!.start_time));
    return matchedSlots.length > 0 ? `${matchedSlots[0]!.start_time} - ${matchedSlots[matchedSlots.length - 1]!.end_time}` : "Unknown Time";
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

  const slides = useMemo(() => {
    if (!name || userBookings.length === 0) return [];
    const sorted = [...userBookings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const upcoming = sorted.filter(b => {
        if (b.status === 'cancelled' || b.status === 'blocked' || (b.status !== 'confirmed' && b.payment_status !== 'paid')) return false;
        return isFuture(getBookingEndDateTime(b));
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    const pending = userBookings.filter(b => (b.payment_status === 'pending' || b.payment_status === 'failed') && b.status !== 'cancelled' && b.status !== 'confirmed' && b.status !== 'completed');
    const rateable = sorted.find(b => b.status === 'completed' && !b.rating);
    const items: SlideItem[] = [];
    if (upcoming) items.push({ type: 'booking', key: `booking-${upcoming.id}`, data: upcoming });
    if (pending.length > 0) items.push({ type: 'payment', key: 'payment-group', data: pending });
    if (rateable) items.push({ type: 'rate', key: `rate-${rateable.id}`, data: rateable });
    return items.filter(item => !dismissedKeys.includes(item.key));
  }, [userBookings, name, timeSlots, dismissedKeys]);

  const handleCloseSlide = () => {
    const currentSlide = slides[activeSlideIndex];
    if (currentSlide) {
        setDismissedKeys(prev => [...prev, currentSlide.key]);
        if (activeSlideIndex >= slides.length - 1) setActiveSlideIndex(Math.max(0, slides.length - 2));
    }
  };

  const handlePayNow = async (booking: BookingDetail) => {
    if (!name) return;
    setIsProcessingPayment(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const paymentPayload = { bookingId: booking.id, amount: booking.amount, customerName: name, customerEmail: user?.email };
        let paymentUrl = "";
        if (Capacitor.isNativePlatform()) {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://khelconnect.in";
            const response = await CapacitorHttp.post({ url: `${baseUrl}/api/payment/create`, headers: { "Content-Type": "application/json" }, data: paymentPayload });
            paymentUrl = response.data.paymentUrl;
        } else {
            const response = await fetch("/api/payment/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(paymentPayload) });
            const result = await response.json();
            paymentUrl = result.paymentUrl;
        }
        window.location.href = paymentUrl;
    } catch (error: any) { alert("Payment failed: " + error.message); setIsProcessingPayment(false); }
  };

  const handleSubmitReview = async () => {
    if (!selectedRateBooking || ratingValue === 0) return;
    setIsSubmittingReview(true);
    try {
        await supabase.from("bookings").update({ rating: ratingValue, review: reviewText }).eq("id", selectedRateBooking.id);
        setUserBookings(prev => prev.map(b => b.id === selectedRateBooking.id ? { ...b, rating: ratingValue, review: reviewText } : b));
        setRatingModalOpen(false);
    } finally { setIsSubmittingReview(false); }
  };

  const handleShareTicket = async () => {
    if (navigator.share && ticketBooking) {
        try { await navigator.share({ title: `Match at ${ticketBooking.turfs.name}`, text: `Join me!`, url: window.location.href }); } catch (err) { }
    } else { alert("Share URL copied!"); }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const newIndex = Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth);
    if (newIndex !== activeSlideIndex && newIndex < slides.length) setActiveSlideIndex(newIndex);
  };

  const sports = [
    { id: "football", name: "Football", image: "/cards/football.jpg", subtitle: "Most Popular", icon: "/icons/football.svg" },
    { id: "cricket", name: "Cricket", image: "/cards/cricket.jpg", subtitle: "Team Sport", icon: "/icons/cricket.svg" },
    { id: "pickleball", name: "Pickleball", image: "/cards/pickleball.jpg", subtitle: "Trending Now", icon: "/icons/pickleball.svg" },
    { id: "badminton", name: "Badminton", image: "/cards/badminton.jpg", subtitle: "Indoor Sport", icon: "/icons/badminton.svg" },
    { id: "table-tennis", name: "Table Tennis", image: "/cards/tabletennis2.jpg", subtitle: "All Weather", icon: "/icons/tabletennis.svg" },
    { id: "basketball", name: "Basketball", image: "/cards/basketball.jpg", subtitle: "Team Sport", icon: "/icons/basketball.svg" },
  ]

  const SportCard = ({ sport }: { sport: any }) => (
    <Link href={`/turfs?sport=${sport.id}`} className="block h-full">
      <Card className="overflow-hidden border-0 shadow-lg rounded-3xl h-[420px] relative group">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10"></div>
        <Image src={sport.image} alt={sport.name} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
        <div className="absolute bottom-0 left-0 right-0 p-6 z-20 transition-all duration-300 group-hover:pb-10">
          <div className="bg-primary rounded-full p-3 w-14 h-14 flex items-center justify-center mb-4 relative">
            <Image src={sport.icon} alt={sport.name} width={32} height={32} className="object-contain" />
          </div>
          <p className="text-mint-light text-sm font-qualy-light mb-2">{sport.subtitle}</p>
          <h3 className="text-2xl font-qualy-bold text-white mb-1">{sport.name}</h3>
          <div className="flex items-center text-white/80 text-sm font-qualy-light">Book Now <ArrowRight className="ml-2 h-4 w-4" /></div>
        </div>
      </Card>
    </Link>
  )

  if (loading) return <UniversalLoader />

  return (
    <main className="container mx-auto px-6 py-12">
      {isProcessingPayment && <UniversalLoader />}

      <section className="mb-16 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-qualy-bold mb-4">Book Your Turf <br /> Unleash Your Game</h1>
        <p className="text-xl text-muted-foreground font-qualy-light">Book your favorite sports venue in Kolkata</p>
      </section>

      <section className="mb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-qualy-bold">Choose Your Sport</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="bg-secondary rounded-full h-10 w-10" onClick={() => scrollContainerRef.current?.scrollBy({ left: -340, behavior: "smooth" })}><ChevronLeft className="h-6 w-6" /></Button>
            <Button variant="ghost" size="icon" className="bg-secondary rounded-full h-10 w-10" onClick={() => scrollContainerRef.current?.scrollBy({ left: 340, behavior: "smooth" })}><ChevronRight className="h-6 w-6" /></Button>
          </div>
        </div>
        <div className="relative -mx-6 px-6">
          <div ref={scrollContainerRef} className="flex overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide -mx-4">
            {sports.map((sport) => (<div key={sport.id} className="px-4 min-w-[280px] md:min-w-[320px] snap-start"><SportCard sport={sport} /></div>))}
          </div>
        </div>
      </section>

      <section className="text-center mb-20 max-w-5xl mx-auto bg-card p-10 rounded-3xl border border-border">
        <h2 className="text-3xl font-qualy-bold mb-10 mint-text-gradient">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="flex flex-col items-center"><div className="bg-secondary w-20 h-20 rounded-full flex items-center justify-center mb-6"><MapPin className="h-10 w-10 text-primary" /></div><h3 className="font-qualy-bold mb-3 text-xl">Select a Sport & Turf</h3><p className="text-muted-foreground text-base font-qualy-light">Choose your sport and find the perfect turf in Kolkata</p></div>
          <div className="flex flex-col items-center"><div className="bg-secondary w-20 h-20 rounded-full flex items-center justify-center mb-6"><Calendar className="h-10 w-10 text-primary" /></div><h3 className="font-qualy-bold mb-3 text-xl">Pick Date & Time</h3><p className="text-muted-foreground text-base font-qualy-light">Browse available dates and 30-minute slots</p></div>
          <div className="flex flex-col items-center"><div className="bg-secondary w-20 h-20 rounded-full flex items-center justify-center mb-6"><Clock className="h-10 w-10 text-mint-light" /></div><h3 className="font-qualy-bold mb-3 text-xl">Book & Play</h3><p className="text-muted-foreground text-base font-qualy-light">Receive your digital pass and enjoy your game</p></div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto mb-10">
        <Card className="overflow-hidden border-none shadow-xl rounded-3xl">
          <div className="mint-gradient p-10 text-white"><h2 className="text-3xl font-qualy-bold mb-4">Ready to Play?</h2><p className="mb-6 text-lg font-qualy-light">Book your turf now and enjoy your favorite sport in Kolkata.</p><Button variant="secondary" size="lg" asChild className="rounded-full font-qualy-bold"><Link href="/turfs?sport=football">Book Now <ArrowRight className="ml-2 h-5 w-5" /></Link></Button></div>
        </Card>
      </section>

      {/* --- FLOATING MOBILE SLIDER (LIQUID GLASS VERSION) --- */}
      {name && slides.length > 0 && (
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
           <div className="absolute -top-3 -right-2 z-50">
                <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full shadow-md bg-background border border-border hover:bg-destructive hover:text-white transition-colors" onClick={handleCloseSlide}>
                    <X className="h-3 w-3" />
                </Button>
           </div>
           
           <div ref={mobileSliderRef} className="flex overflow-x-auto gap-4 snap-x snap-mandatory scrollbar-hide rounded-2xl" onScroll={handleScroll}>
              {slides.map((slide) => {
                if (slide.type === 'payment') {
                    const pendingList = slide.data as BookingDetail[];
                    return (
                        <div key={slide.key} className="w-full flex-shrink-0 snap-center">
                            <MobileSlideCard 
                                theme={{
                                    bg: "bg-red-600/80",
                                    iconBg: "bg-white/20",
                                    iconColor: "text-white",
                                    titleColor: "text-white",
                                    subTextColor: "text-white/80",
                                    arrowColor: "text-white/70",
                                    glass: true
                                }}
                                icon={<AlertCircle className="h-5 w-5" />}
                                title="Action Required"
                                subContent={
                                    <div className="flex items-center gap-2">
                                        <span>{pendingList.length} Pending</span>
                                        <div className="h-1 w-1 bg-white/50 rounded-full"></div>
                                        <BookingTimer createdAt={pendingList[0].created_at} className="text-white" />
                                    </div>
                                }
                                onClick={() => setPendingPaymentList(pendingList)}
                            />
                        </div>
                    );
                }

                if (slide.type === 'booking') {
                    const booking = slide.data as BookingDetail;
                    return (
                        <div key={slide.key} className="w-full flex-shrink-0 snap-center">
                            <MobileSlideCard 
                                theme={{
                                    bg: "bg-emerald-600/80",
                                    iconBg: "bg-white/20",
                                    iconColor: "text-white",
                                    titleColor: "text-white",
                                    subTextColor: "text-white/80",
                                    arrowColor: "text-white/70",
                                    glass: true
                                }}
                                icon={<Calendar className="h-5 w-5" />}
                                title="Next Match"
                                subContent={booking.turfs.name.length > 20 ? booking.turfs.name.substring(0, 20) + "..." : booking.turfs.name}
                                rightContent={
                                    <div className="text-right text-white">
                                        <p className="text-xs font-bold">{format(new Date(booking.date), "MMM d")}</p>
                                        <p className="text-[10px] opacity-80">{getFormattedTimeRange(booking.slot).split(" - ")[0]}</p>
                                    </div>
                                }
                                onClick={() => setTicketBooking(booking)}
                            />
                        </div>
                    );
                }

                if (slide.type === 'rate') {
                    const rateBooking = slide.data as BookingDetail;
                    return (
                        <div key={slide.key} className="w-full flex-shrink-0 snap-center">
                            <MobileSlideCard 
                                theme={{
                                    bg: "bg-blue-600/80",
                                    iconBg: "bg-white/20",
                                    iconColor: "text-white",
                                    titleColor: "text-white",
                                    subTextColor: "text-white/80",
                                    arrowColor: "text-white/70",
                                    glass: true
                                }}
                                icon={<ThumbsUp className="h-5 w-5" />}
                                title="How was the game?"
                                subContent={rateBooking.turfs.name}
                                rightContent={
                                    <Button size="sm" variant="secondary" className="text-blue-600 h-8 text-xs font-bold rounded-full px-4 bg-white/90">
                                        Rate
                                    </Button>
                                }
                                onClick={() => { setSelectedRateBooking(rateBooking); setRatingModalOpen(true); }}
                            />
                        </div>
                    );
                }
                return null;
              })}
           </div>
           {slides.length > 1 && (<div className="flex justify-center gap-1.5 mt-2">{slides.map((_, idx) => <div key={idx} className={cn("h-1.5 rounded-full transition-all shadow-sm", idx === activeSlideIndex ? "w-4 bg-black/40" : "w-1.5 bg-black/10")} />)}</div>)}
        </div>
      )}

      {/* --- ALL MODALS --- */}
      <Dialog open={!!ticketBooking} onOpenChange={(open) => !open && setTicketBooking(null)}>
        <DialogContent className="w-[90vw] max-w-md rounded-3xl p-0 overflow-hidden bg-transparent border-none shadow-none sm:max-w-md">
          {ticketBooking && (
            <div className="relative w-full drop-shadow-2xl">
              <div className="bg-background rounded-3xl overflow-hidden relative transition-all" style={{maskImage: `radial-gradient(circle at 0 13rem, transparent 1rem, black 1rem), radial-gradient(circle at 100% 13rem, transparent 1rem, black 1rem)`, WebkitMaskImage: `radial-gradient(circle at 0 13rem, transparent 1rem, black 1rem), radial-gradient(circle at 100% 13rem, transparent 1rem, black 1rem)`}}>
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 pb-8 text-white relative">
                  <div className="flex justify-between items-start relative z-10"><div><Badge className="bg-white/20 text-white mb-3 backdrop-blur-md">CONFIRMED</Badge><DialogTitle className="text-2xl font-bold text-white">{ticketBooking.turfs.name}</DialogTitle></div><Ticket className="h-8 w-8 text-white opacity-20" /></div>
                </div>
                <div className="p-6 pt-8 bg-background">
                  <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                    <div><p className="text-[10px] uppercase font-bold mb-1">Date</p><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /><span className="font-semibold">{format(new Date(ticketBooking.date), "EEE, MMM d")}</span></div></div>
                    <div><p className="text-[10px] uppercase font-bold mb-1">Time</p><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /><span className="font-semibold">{getFormattedTimeRange(ticketBooking.slot)}</span></div></div>
                  </div>
                  <div className="mt-8 p-4 bg-secondary/30 rounded-xl border border-dashed flex items-center justify-between"><div><p className="text-[10px] font-bold">Booking ID</p><p className="font-mono text-sm tracking-widest uppercase">{ticketBooking.id.slice(0, 8)}</p></div><CheckCircle className="h-5 w-5 text-green-600" /></div>
                  <div className="flex gap-3 mt-6"><Button variant="outline" className="flex-1 rounded-xl" onClick={() => alert('Download coming soon')}><Download className="h-4 w-4 mr-2"/> Save</Button><Button className="flex-1 rounded-xl bg-indigo-600 text-white" onClick={handleShareTicket}><Share2 className="h-4 w-4 mr-2"/> Share</Button></div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={ratingModalOpen} onOpenChange={setRatingModalOpen}>
        <DialogContent className="sm:max-w-md w-[90vw] rounded-2xl"><DialogHeader><DialogTitle>Rate Your Experience</DialogTitle></DialogHeader><div className="flex justify-center gap-2 py-6">{[1, 2, 3, 4, 5].map((star) => <button key={star} onClick={() => setRatingValue(star)}><Star className={cn("h-10 w-10", star <= ratingValue ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} /></button>)}</div><div className="space-y-2"><Label>Review</Label><Textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} /></div><DialogFooter><Button onClick={handleSubmitReview} disabled={ratingValue === 0 || isSubmittingReview}>Submit</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={pendingPaymentList.length > 0} onOpenChange={(open) => !open && setPendingPaymentList([])}>
        <DialogContent className="sm:max-w-md w-[90vw] rounded-2xl"><DialogHeader><DialogTitle className="flex items-center gap-2 text-red-600"><AlertCircle className="h-5 w-5"/> Pending Payments</DialogTitle><DialogDescription>Complete payment to confirm these slots.</DialogDescription></DialogHeader><div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">{pendingPaymentList.map(item => (<div key={item.id} className="border rounded-xl p-4 flex justify-between items-center bg-secondary/20"><div><p className="font-bold">{item.turfs.name}</p><p className="text-xs text-muted-foreground">{format(new Date(item.date), "MMM d, h:mm a")}</p></div><Button size="sm" className="bg-red-600 text-white" onClick={() => handlePayNow(item)}>Pay ₹{item.amount}</Button></div>))}</div><DialogFooter><Button variant="outline" onClick={() => setPendingPaymentList([])}>Close</Button></DialogFooter></DialogContent>
      </Dialog>
    </main>
  )
}