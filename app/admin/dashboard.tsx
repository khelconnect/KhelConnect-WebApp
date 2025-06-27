// app/admin/dashboard.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart2, CalendarDays, CreditCard, Users } from "lucide-react";
import { format, isToday, isThisWeek, isThisMonth, parseISO } from "date-fns";

export default function DashboardTab() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: bookingsData } = await supabase.from("bookings").select("*, user_id");
      const { data: paymentsData } = await supabase.from("payments").select("*");
      setBookings(bookingsData || []);
      setPayments(paymentsData || []);
    };
    fetchData();
  }, []);

  const todayBookings = bookings.filter((b) => isToday(parseISO(b.created_at)));
  const weekBookings = bookings.filter((b) => isThisWeek(parseISO(b.created_at)));
  const monthBookings = bookings.filter((b) => isThisMonth(parseISO(b.created_at)));

  const totalRevenue = payments
    .filter((p) => p.status === "confirmed")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const todayRevenue = payments
    .filter((p) => p.status === "confirmed" && isToday(parseISO(p.created_at)))
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card className="bg-card border-border rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <CalendarDays className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Bookings Today</p>
              <p className="text-2xl font-bold">{todayBookings.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <BarChart2 className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">This Week</p>
              <p className="text-2xl font-bold">{weekBookings.length} bookings</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <CreditCard className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Revenue Today</p>
              <p className="text-2xl font-bold">₹{todayRevenue}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Monthly Bookings</p>
              <p className="text-2xl font-bold">{monthBookings.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <CreditCard className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">₹{totalRevenue}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
