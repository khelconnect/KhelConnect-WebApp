"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Loader2, User, MapPin, Calendar, Clock, DollarSign, Info, FileText
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// --- TYPES ---

// This new type will hold our joined data
interface DetailedBooking {
  id: string;
  user_id: string;
  turf_id: string;
  date: string;
  slot: string[]; // This will still be IDs
  status: string;
  payment_status: string;
  amount: number;
  created_at: string;
  // Joined tables
  users: {
    name: string;
    phone: string;
    email: string; // Added email for the modal
  } | null;
  turfs: {
    name: string;
  } | null;
}

// For mapping slot IDs to times
interface TimeSlot {
  id: string;
  time: string;
}

// --- MAIN COMPONENT ---
export default function BookingsTab() {
  const [bookings, setBookings] = useState<DetailedBooking[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- NEW: State for the detail modal ---
  const [selectedBooking, setSelectedBooking] = useState<DetailedBooking | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          id, date, slot, user_id, status, payment_status, amount, created_at,
          users ( name, phone, email ),
          turfs ( name )
        `)
        .order("created_at", { ascending: false });

      const { data: slotsData, error: slotsError } = await supabase
        .from("time_slots")
        .select("id, start_time, period");

      if (bookingsError) console.error("Error fetching bookings:", bookingsError);
      if (slotsError) console.error("Error fetching time slots:", slotsError);

      setBookings(bookingsData || []);
      setTimeSlots((slotsData || []).map(s => ({
        id: s.id,
        time: `${s.start_time}${s.period ? ` ${s.period}` : ""}`
      })));
      setLoading(false);
    };

    fetchData();
  }, []);

  const filteredBookings = useMemo(() => {
    const pending = bookings.filter(b => b.status === 'pending');
    const confirmed = bookings.filter(b => b.status === 'confirmed');
    const completed = bookings.filter(b => b.status === 'completed');
    const cancelled = bookings.filter(b => b.status === 'cancelled' || b.status === 'blocked');
    return { pending, confirmed, completed, cancelled };
  }, [bookings]);

  // --- NEW: Handler to open the modal ---
  const handleShowDetails = (booking: DetailedBooking) => {
    setSelectedBooking(booking);
    setIsDetailModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="pending">Pending ({filteredBookings.pending.length})</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed ({filteredBookings.confirmed.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({filteredBookings.completed.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({filteredBookings.cancelled.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          <BookingsDisplay 
            bookings={filteredBookings.pending} 
            timeSlots={timeSlots} 
            onShowDetails={handleShowDetails} 
          />
        </TabsContent>
        <TabsContent value="confirmed">
          <BookingsDisplay 
            bookings={filteredBookings.confirmed} 
            timeSlots={timeSlots} 
            onShowDetails={handleShowDetails} 
          />
        </TabsContent>
        <TabsContent value="completed">
          <BookingsDisplay 
            bookings={filteredBookings.completed} 
            timeSlots={timeSlots} 
            onShowDetails={handleShowDetails} 
          />
        </TabsContent>
        <TabsContent value="cancelled">
          <BookingsDisplay 
            bookings={filteredBookings.cancelled} 
            timeSlots={timeSlots} 
            onShowDetails={handleShowDetails} 
          />
        </TabsContent>
      </Tabs>

      {/* --- NEW: Render the modal --- */}
      <BookingDetailModal
        booking={selectedBooking}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        getSlotTimes={(slotIds) => slotIds.map(id => timeSlots.find(ts => ts.id === id)?.time || "Unknown").join(", ")}
      />
    </>
  );
}

// --- HELPER COMPONENTS ---

function BookingsDisplay({ 
  bookings, 
  timeSlots,
  onShowDetails 
}: { 
  bookings: DetailedBooking[], 
  timeSlots: TimeSlot[],
  onShowDetails: (booking: DetailedBooking) => void 
}) {
  if (bookings.length === 0) {
    return <p className="text-muted-foreground text-center py-10">No bookings found in this category.</p>;
  }

  const getSlotTimes = (slotIds: string[]) => {
    return slotIds.map(id => timeSlots.find(ts => ts.id === id)?.time || "Unknown Slot").join(", ");
  };

  return (
    <div className="space-y-4">
      {/* Mobile Card View */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
        {bookings.map(b => (
          <BookingCard key={b.id} b={b} getSlotTimes={getSlotTimes} onShowDetails={onShowDetails} />
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Turf</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map(b => (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="font-medium">{b.users?.name || "N/A"}</div>
                  <div className="text-sm text-muted-foreground">{b.users?.phone}</div>
                </TableCell>
                <TableCell>{b.turfs?.name || "N/A"}</TableCell>
                <TableCell>{format(new Date(b.date), "PPP")}</TableCell>
                <TableCell>₹{b.amount}</TableCell>
                <TableCell>
                  <StatusBadge status={b.payment_status} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={b.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => onShowDetails(b)}>
                    <Info className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Mobile Booking Card Component
function BookingCard({ 
  b, 
  getSlotTimes,
  onShowDetails
}: { 
  b: DetailedBooking, 
  getSlotTimes: (ids: string[]) => string,
  onShowDetails: (booking: DetailedBooking) => void 
}) {
  return (
    <Card key={b.id} className="bg-card border-border rounded-xl">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold flex items-center gap-2">
            <User className="h-4 w-4" /> {b.users?.name || "N/A"}
          </h3>
          <Button variant="ghost" size="icon" className="-my-2 -mr-2" onClick={() => onShowDetails(b)}>
            <Info className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4" /> {b.turfs?.name || "N/A"}
        </p>
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4" /> {format(new Date(b.date), "PPP")}
        </p>
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" /> {getSlotTimes(b.slot)}
        </p>
        
        <div className="flex justify-between items-center pt-2 border-t">
          <div className="flex items-center gap-2 font-medium">
            <DollarSign className="h-4 w-4" /> ₹{b.amount}
          </div>
          <div className="flex gap-2">
            <StatusBadge status={b.payment_status} />
            <StatusBadge status={b.status} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Badge Component for Status
function StatusBadge({ status }: { status: string }) {
  let className = "";
  switch (status) {
    case "paid":
    case "confirmed":
    case "completed":
      className = "bg-green-600 text-white hover:bg-green-600/80";
      break;
    case "pending":
      className = "bg-yellow-500 text-black hover:bg-yellow-500/80";
      break;
    case "cancelled":
    case "blocked":
      className = "bg-red-600 text-white hover:bg-red-600/80";
      break;
    case "refund_initiated":
    case "refund processed":
      className = "bg-blue-500 text-white hover:bg-blue-500/80";
      break;
    default:
      className = "bg-gray-500 text-white hover:bg-gray-500/80";
  }
  
  return (
    <Badge className={cn("capitalize text-xs", className)}>
      {status.replace('_', ' ')}
    </Badge>
  );
}

// --- NEW: Detail Modal Component ---
function BookingDetailModal({ 
  booking, 
  isOpen, 
  onClose,
  getSlotTimes
}: { 
  booking: DetailedBooking | null, 
  isOpen: boolean, 
  onClose: () => void,
  getSlotTimes: (ids: string[]) => string
}) {
  if (!booking) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">Booking Details</DialogTitle>
          <DialogDescription>
            Full details for booking ID: {booking.id}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          
          <div className="space-y-1">
            <h4 className="font-semibold">User Details</h4>
            <p className="text-sm text-muted-foreground">Name: {booking.users?.name || "N/A"}</p>
            <p className="text-sm text-muted-foreground">Phone: {booking.users?.phone || "N/A"}</p>
            <p className="text-sm text-muted-foreground">Email: {booking.users?.email || "N/A"}</p>
          </div>
          
          <Separator />

          <div className="space-y-1">
            <h4 className="font-semibold">Booking Details</h4>
            <p className="text-sm text-muted-foreground">Turf: {booking.turfs?.name || "N/A"}</p>
            <p className="text-sm text-muted-foreground">Date: {format(new Date(booking.date), "PPP")}</p>
            <p className="text-sm text-muted-foreground">Slots: {getSlotTimes(booking.slot)}</p>
            <p className="text-sm text-muted-foreground">Booked On: {format(new Date(booking.created_at), "PPP p")}</p>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h4 className="font-semibold">Payment & Status</h4>
            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Amount</Label>
                <p className="font-semibold text-lg text-primary">₹{booking.amount}</p>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Payment Status</Label>
                <div><StatusBadge status={booking.payment_status} /></div>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Booking Status</Label>
                <div><StatusBadge status={booking.status} /></div>
              </div>
            </div>
          </div>
          
          <Separator />

          <div className="space-y-1">
            <h4 className="font-semibold">Admin Info</h4>
            <p className="text-xs text-muted-foreground">Booking ID: {booking.id}</p>
            <p className="text-xs text-muted-foreground">User ID: {booking.user_id}</p>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}