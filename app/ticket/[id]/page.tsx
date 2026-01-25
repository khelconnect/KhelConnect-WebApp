import { notFound } from "next/navigation";
import { BookingTicket } from "@/components/BookingTicket";
import { Button } from "@/components/ui/button";
import { Scissors } from "lucide-react"; 
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient"; 
import { format } from "date-fns";

// ----------------------------------------------------------------------
// 1. Types
// ----------------------------------------------------------------------
type TimeSlot = {
  id: string;
  start_time: string;
  end_time: string;
};

// ----------------------------------------------------------------------
// 2. Data Fetcher
// ----------------------------------------------------------------------
async function getBookingById(id: string) {
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(`
      *,
      turfs (
        name,
        location
      )
    `)
    .eq("id", id)
    .single();

  if (bookingError || !booking) {
    console.error("Booking fetch error:", bookingError);
    return null;
  }

  const { data: userProfile } = await supabase
    .from("users")
    .select("name")
    .eq("id", booking.user_id)
    .single();

  const { data: slots } = await supabase
    .from("time_slots")
    .select("id, start_time, end_time")
    .in("id", booking.slot || []);

  if (!slots || slots.length === 0) return null;

  const sortedSlots = slots.sort((a: TimeSlot, b: TimeSlot) => {
    const timeA = new Date(`1970/01/01 ${a.start_time}`).getTime();
    const timeB = new Date(`1970/01/01 ${b.start_time}`).getTime();
    return timeA - timeB;
  });

  const firstSlot = sortedSlots[0];
  const lastSlot = sortedSlots[sortedSlots.length - 1];
  const formattedTimeRange = `${firstSlot.start_time} - ${lastSlot.end_time}`;

  const bookingDate = new Date(booking.date);
  const [timeStr, modifier] = lastSlot.end_time.split(' ');
  let [hours, minutes] = timeStr.split(':').map(Number);
  
  if (hours === 12) hours = 0;
  if (modifier === 'PM') hours += 12;

  const endTimeISO = new Date(bookingDate);
  endTimeISO.setHours(hours, minutes, 0, 0);

  return {
    id: booking.id,
    date: booking.date,
    status: booking.status,
    payment_status: booking.payment_status,
    amount: booking.amount,
    advance_paid: booking.advance_paid,
    sport: booking.sport,
    turfs: { 
      name: booking.turfs.name, 
      location: booking.turfs.location 
    },
    timeRange: formattedTimeRange,
    user: userProfile?.name || "KhelConnect Player",
    endTimeISO: endTimeISO.toISOString()
  };
}

// ----------------------------------------------------------------------
// 3. Page Component
// ----------------------------------------------------------------------
export default async function PublicTicketPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const booking = await getBookingById(id);

  if (!booking) {
    return notFound();
  }

  const now = new Date();
  const ticketEndTime = new Date(booking.endTimeISO);
  
  // Expiration logic: Event passed, cancelled, or payment failed
  const isExpired = now > ticketEndTime || booking.status === 'cancelled' || booking.payment_status === 'failed';

  if (isExpired) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="max-w-sm w-full bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl backdrop-blur-xl">
           <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
             <Scissors className="h-8 w-8 text-zinc-500 opacity-50" />
           </div>
           <h1 className="text-2xl font-bold mb-2">Ticket Expired</h1>
           <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
             This ticket link is no longer active because the match has ended or was cancelled.
           </p>
           
           <Link href="/">
             <Button className="w-full h-12 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold">
               Go to KhelConnect
             </Button>
           </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <img src="/logo.png" alt="KhelConnect" className="h-8 w-auto mx-auto mb-4 opacity-80" />
        <p className="text-zinc-500 text-xs uppercase tracking-widest">Shared Ticket View</p>
      </div>

      <BookingTicket 
        booking={{
            ...booking,
            turfs: {
                name: booking.turfs.name,
                location: booking.turfs.location
            }
        }}
        formattedTimeRange={booking.timeRange} 
        userName={booking.user}
        /** * Logic Note: By NOT passing onSave or onShare props here, 
         * the BookingTicket component will not render the action buttons.
         */
      />

      <div className="mt-8 text-center">
        <Link href="/">
            <Button variant="link" className="text-emerald-500 font-bold">
                Book your own turf on KhelConnect &rarr;
            </Button>
        </Link>
      </div>
    </div>
  );
}