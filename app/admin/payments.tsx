"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface Booking {
  id: string;
  turf_id: string;
  date: string;
  slot: string[];
  user_id: string;
  payment_status: "pending" | "paid" | "refund initiated" | "refunded";
  created_at: string;
}

interface User {
  id: string;
  name: string;
  phone: string;
}

export default function PaymentsTab() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const fetchData = async () => {
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("*");

    const { data: usersData } = await supabase
      .from("users")
      .select("id, name, phone");

    setBookings(bookingsData || []);
    setUsers(usersData || []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMarkAsPaid = async () => {
    if (selectedBookingId) {
      await supabase
        .from("bookings")
        .update({ payment_status: "paid" })
        .eq("id", selectedBookingId);

      setConfirmDialogOpen(false);
      setSelectedBookingId(null);
      fetchData();
    }
  };

  const openConfirmation = (id: string) => {
    setSelectedBookingId(id);
    setConfirmDialogOpen(true);
  };

  const pendingBookings = bookings.filter((b) => b.payment_status === "pending");
  const paidBookings = bookings.filter((b) => b.payment_status === "paid");

  const renderBookingCard = (b: Booking) => {
    const user = users.find((u) => u.id === b.user_id);
    return (
      <Card key={b.id} className="bg-card border-border rounded-xl">
        <CardContent className="p-6 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">{user?.name || "Unknown User"}</h2>
            <Badge
              className={`text-xs px-2 py-1 rounded-full ${
                b.payment_status === "paid"
                  ? "bg-green-500 text-white"
                  : "bg-yellow-500 text-black"
              }`}
            >
              {b.payment_status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Phone: {user?.phone}</p>
          <p className="text-sm text-muted-foreground">Booking ID: {b.id}</p>
          <p className="text-sm text-muted-foreground">Date: {b.date}</p>
          <p className="text-sm text-muted-foreground">
            Slots: {b.slot.join(", ")}
          </p>
          {b.payment_status === "pending" && (
            <Button size="sm" onClick={() => openConfirmation(b.id)}>
              Mark as Paid
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <h2 className="text-xl font-semibold mb-2">Pending Payments</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {pendingBookings.map(renderBookingCard)}
        {pendingBookings.length === 0 && (
          <p className="text-muted-foreground">No pending payments.</p>
        )}
      </div>

      <Separator className="my-6" />

      <h2 className="text-xl font-semibold mb-2">Paid Payments</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {paidBookings.map(renderBookingCard)}
        {paidBookings.length === 0 && (
          <p className="text-muted-foreground">No paid payments yet.</p>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to mark this booking as <strong>paid</strong>?</p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsPaid}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
