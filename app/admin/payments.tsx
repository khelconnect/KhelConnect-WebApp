"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

// A new type for our joined data
type BookingWithUser = {
  id: string;
  date: string;
  slot: string[];
  user_id: string;
  payment_status: "pending" | "paid" | "refund_initiated" | "refund processed";
  status: string;
  created_at: string;
  amount: number;
  users: {
    id: string;
    name: string;
    phone: string;
  } | null;
};

export default function PaymentsTab() {
  const [bookings, setBookings] = useState<BookingWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithUser | null>(null);

  // 1. OPTIMIZED: Fetch data with a single, server-side join
  const fetchData = async () => {
    setLoading(true);
    const { data: bookingsData, error } = await supabase
      .from("bookings")
      .select(`
        id, date, slot, user_id, payment_status, status, created_at, amount,
        users ( id, name, phone )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching payments:", error);
    } else {
      setBookings(bookingsData || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. OPTIMIZED: Use useMemo to filter lists, preventing re-calculation on every render
  const pendingBookings = useMemo(
    () => bookings.filter((b) => b.payment_status === "pending"),
    [bookings]
  );
  
  const completedBookings = useMemo(
    () => bookings.filter((b) => b.payment_status === "paid"),
    [bookings]
  );

  const refundBookings = useMemo(
    () => bookings.filter((b) => 
      b.payment_status === "refund_initiated" || b.payment_status === "refund processed"
    ),
    [bookings]
  );

  // 3. OPTIMIZED: Added loading state and try/catch block
  const handleMarkAsPaid = async () => {
    if (selectedBooking) {
      setIsSubmitting(true);
      try {
        const { error } = await supabase
          .from("bookings")
          .update({ payment_status: "paid" })
          .eq("id", selectedBooking.id);
        
        if (error) throw error;

        // Update local state for an instant UI change
        setBookings(bookings.map(b => 
          b.id === selectedBooking.id ? { ...b, payment_status: "paid" } : b
        ));
      } catch (error: any) {
        console.error("Failed to mark as paid:", error);
        alert("Error: " + error.message);
      } finally {
        setIsSubmitting(false);
        setConfirmDialogOpen(false);
        setSelectedBooking(null);
      }
    }
  };

  const openConfirmation = (booking: BookingWithUser) => {
    setSelectedBooking(booking);
    setConfirmDialogOpen(true);
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
      {/* 4. UI REDESIGN: Swapped Card lists for Tabs with a Table */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">Pending ({pendingBookings.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedBookings.length})</TabsTrigger>
          <TabsTrigger value="refunds">Refunds ({refundBookings.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          <BookingsTable
            bookings={pendingBookings}
            onActionButtonClick={openConfirmation}
            actionButtonText="Mark as Paid"
          />
        </TabsContent>
        <TabsContent value="completed">
          <BookingsTable bookings={completedBookings} />
        </TabsContent>
        <TabsContent value="refunds">
          <BookingsTable bookings={refundBookings} />
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this booking as <strong>paid</strong>?
              <div className="text-sm text-muted-foreground mt-2">
                <p>User: {selectedBooking?.users?.name}</p>
                <p>Amount: ₹{selectedBooking?.amount}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsPaid} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// --- 5. NEW: Reusable Table Component ---
function BookingsTable({
  bookings,
  onActionButtonClick,
  actionButtonText,
}: {
  bookings: BookingWithUser[];
  onActionButtonClick?: (booking: BookingWithUser) => void;
  actionButtonText?: string;
}) {
  if (bookings.length === 0) {
    return <p className="text-muted-foreground text-center py-10">No payments found in this category.</p>;
  }

  const getStatusBadge = (status: BookingWithUser['payment_status']) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-600 text-white">Paid</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500 text-black">Pending</Badge>;
      case "refund_initiated":
        return <Badge className="bg-orange-500 text-white">Refund Initiated</Badge>;
      case "refund processed":
        return <Badge className="bg-blue-500 text-white">Refunded</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="border rounded-xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead className="hidden md:table-cell">Date</TableHead>
            <TableHead className="hidden sm:table-cell">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((b) => (
            <TableRow key={b.id}>
              <TableCell>
                <div className="font-medium">{b.users?.name || "Unknown User"}</div>
                <div className="text-sm text-muted-foreground md:hidden">{b.users?.phone}</div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {format(new Date(b.date), "PPP")}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                ₹{b.amount}
              </TableCell>
              <TableCell>
                {getStatusBadge(b.payment_status)}
              </TableCell>
              <TableCell className="text-right">
                {onActionButtonClick && (
                  <Button size="sm" onClick={() => onActionButtonClick(b)}>
                    {actionButtonText}
                  </Button>
                )}
                {/* We can add refund buttons here in the future */}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}