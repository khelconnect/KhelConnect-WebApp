"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { useUserStore } from "@/lib/userStore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Loader2, User, Calendar, MapPin, Clock, CreditCard, Star, Edit2, LogOut, CheckCircle, AlertCircle } from "lucide-react"
import { format, isPast } from "date-fns"
import { cn } from "@/lib/utils"

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
  turfs: {
    name: string
    location: string
    image: string
  }
}

type UserProfile = {
  id: string
  name: string
  email: string
  phone: string
  created_at: string
}

export default function UserProfilePage() {
  const router = useRouter()
  const { clearUser, setName } = useUserStore()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [bookings, setBookings] = useState<BookingDetail[]>([])
  const [loading, setLoading] = useState(true)
  
  // Edit Profile State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", phone: "" })
  const [isUpdating, setIsUpdating] = useState(false)

  // Rating State
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [ratingValue, setRatingValue] = useState(0)
  const [reviewText, setReviewText] = useState("")
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push("/login")
        return
      }

      // 1. Fetch Profile
      const { data: profileData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single()
      
      if (profileData) {
        setProfile(profileData)
        setEditForm({ name: profileData.name, phone: profileData.phone })
      }

      // 2. Fetch Bookings (Joined with Turfs)
      const { data: bookingData } = await supabase
        .from("bookings")
        .select(`
          *,
          turfs ( name, location, image )
        `)
        .eq("user_id", user.id)
        .order("date", { ascending: false }) // Newest first

      if (bookingData) setBookings(bookingData)
      
      setLoading(false)
    }

    fetchUserData()
  }, [router])

  // --- HANDLERS ---

  const handleLogout = async () => {
    await supabase.auth.signOut()
    clearUser()
    router.push("/")
  }

  const handleUpdateProfile = async () => {
    if (!profile) return
    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from("users")
        .update({ name: editForm.name, phone: editForm.phone })
        .eq("id", profile.id)
      
      if (error) throw error
      
      setProfile({ ...profile, ...editForm })
      setName(editForm.name) // Update global store
      setIsEditModalOpen(false)
    } catch (e: any) {
      alert("Error updating profile: " + e.message)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!selectedBookingId || ratingValue === 0) return
    setIsSubmittingReview(true)
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ rating: ratingValue, review: reviewText })
        .eq("id", selectedBookingId)

      if (error) throw error

      // Update local state
      setBookings(prev => prev.map(b => 
        b.id === selectedBookingId ? { ...b, rating: ratingValue, review: reviewText } : b
      ))
      setRatingModalOpen(false)
    } catch (e: any) {
      alert("Error submitting review: " + e.message)
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const openRatingModal = (bookingId: string) => {
    setSelectedBookingId(bookingId)
    setRatingValue(0)
    setReviewText("")
    setRatingModalOpen(true)
  }

  // --- FILTERED LISTS ---
  const upcomingBookings = bookings.filter(b => !isPast(new Date(b.date)) && b.status !== 'cancelled')
  const completedBookings = bookings.filter(b => (isPast(new Date(b.date)) || b.status === 'completed') && b.status !== 'cancelled')
  const pendingPayments = bookings.filter(b => b.payment_status === 'pending' && b.status !== 'cancelled')

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row gap-6 mb-8 items-start">
        {/* Profile Card */}
        <Card className="w-full md:w-1/3 bg-card border-border rounded-3xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <User className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{profile?.name}</h1>
                <p className="text-muted-foreground text-sm">Player</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Joined {profile?.created_at ? format(new Date(profile.created_at), "MMMM yyyy") : "Recently"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.phone}</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setIsEditModalOpen(true)}>
                <Edit2 className="h-4 w-4 mr-2" /> Edit
              </Button>
              <Button variant="destructive" className="flex-1 rounded-xl" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" /> Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="w-full md:w-2/3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-primary/5 border-primary/10 rounded-2xl">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <h3 className="text-4xl font-bold text-primary mb-1">{bookings.length}</h3>
              <p className="text-sm text-muted-foreground">Total Matches</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/5 border-green-500/10 rounded-2xl">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <h3 className="text-4xl font-bold text-green-600 mb-1">{upcomingBookings.length}</h3>
              <p className="text-sm text-muted-foreground">Upcoming</p>
            </CardContent>
          </Card>
          <Card className={cn("rounded-2xl", pendingPayments.length > 0 ? "bg-red-500/5 border-red-500/10" : "bg-secondary/50 border-border")}>
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <h3 className={cn("text-4xl font-bold mb-1", pendingPayments.length > 0 ? "text-red-500" : "text-foreground")}>
                {pendingPayments.length}
              </h3>
              <p className="text-sm text-muted-foreground">Pending Payments</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 2. Main Content Tabs */}
      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted rounded-xl p-1 h-12">
          <TabsTrigger value="bookings" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">My Bookings</TabsTrigger>
          <TabsTrigger value="completed" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">History & Ratings</TabsTrigger>
          <TabsTrigger value="payments" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Payments {pendingPayments.length > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingPayments.length}</span>}
          </TabsTrigger>
        </TabsList>

        {/* --- UPCOMING BOOKINGS --- */}
        <TabsContent value="bookings" className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Upcoming Matches</h2>
          {upcomingBookings.length === 0 ? (
            <div className="text-center py-12 bg-secondary/30 rounded-3xl border border-dashed">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground">No upcoming matches scheduled.</p>
              <Button className="mt-4 rounded-full" onClick={() => router.push("/turfs")}>Book a Turf</Button>
            </div>
          ) : (
            upcomingBookings.map(booking => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          )}
        </TabsContent>

        {/* --- HISTORY & RATINGS --- */}
        <TabsContent value="completed" className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Past Matches</h2>
          {completedBookings.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No completed matches yet.</p>
          ) : (
            completedBookings.map(booking => (
              <Card key={booking.id} className="bg-card border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all">
                <div className="flex flex-col sm:flex-row">
                  <div className="sm:w-32 h-32 sm:h-auto relative bg-secondary">
                    <img src={booking.turfs?.image || "/placeholder.svg"} alt="Turf" className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-lg">{booking.turfs?.name}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {format(new Date(booking.date), "PPP")}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-secondary">Completed</Badge>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end mt-4">
                      <div className="text-sm">
                        <span className="font-medium text-primary">₹{booking.amount}</span>
                      </div>
                      
                      {booking.rating ? (
                        <div className="flex items-center gap-1 bg-yellow-500/10 px-3 py-1 rounded-full">
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          <span className="font-bold text-yellow-700">{booking.rating}/5</span>
                        </div>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => openRatingModal(booking.id)}>
                          <Star className="h-4 w-4 mr-1" /> Rate Turf
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* --- PENDING PAYMENTS --- */}
        <TabsContent value="payments" className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Pending Payments</h2>
          {pendingPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-secondary/30 rounded-3xl">
              <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
              <p className="text-muted-foreground">All caught up! No pending payments.</p>
            </div>
          ) : (
            pendingPayments.map(booking => (
              <Card key={booking.id} className="bg-card border-l-4 border-l-red-500 rounded-xl shadow-sm">
                <CardContent className="p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="font-bold">{booking.turfs?.name}</h3>
                    <p className="text-sm text-red-500 font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" /> Payment Pending
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Date: {format(new Date(booking.date), "PPP")}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-xl font-bold">₹{booking.amount}</p>
                    <Button>Pay Now</Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* --- EDIT PROFILE MODAL --- */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your personal details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateProfile} disabled={isUpdating}>{isUpdating ? <Loader2 className="animate-spin"/> : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- RATING MODAL --- */}
      <Dialog open={ratingModalOpen} onOpenChange={setRatingModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate Your Experience</DialogTitle>
            <DialogDescription>How was your game at the turf?</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-2 py-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRatingValue(star)}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <Star 
                  className={cn(
                    "h-10 w-10 transition-colors", 
                    star <= ratingValue ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                  )} 
                />
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Review (Optional)</Label>
            <Textarea 
              placeholder="Tell us what you liked..." 
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSubmitReview} disabled={ratingValue === 0 || isSubmittingReview}>
              {isSubmittingReview ? <Loader2 className="animate-spin"/> : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </main>
  )
}

// Sub-component for clean rendering
function BookingCard({ booking }: { booking: BookingDetail }) {
  return (
    <Card className="bg-card border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="sm:w-40 h-32 sm:h-auto relative bg-secondary">
          <img src={booking.turfs?.image || "/placeholder.svg"} alt={booking.turfs?.name} className="absolute inset-0 w-full h-full object-cover" />
        </div>
        
        {/* Content */}
        <div className="p-5 flex-1">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-bold text-lg">{booking.turfs?.name}</h3>
              <div className="flex items-center text-muted-foreground text-sm mt-1">
                <MapPin className="h-3 w-3 mr-1" /> {booking.turfs?.location}
              </div>
            </div>
            <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'} className="capitalize">
              {booking.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 my-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{format(new Date(booking.date), "EEE, MMM d")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              {/* Display first slot time roughly */}
              <span>Booked Slot</span> 
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-border">
            <p className="font-bold text-lg">₹{booking.amount}</p>
            <Button variant="outline" size="sm" className="rounded-full">View Ticket</Button>
          </div>
        </div>
      </div>
    </Card>
  )
}