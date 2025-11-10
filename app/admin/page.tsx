// app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabaseClient";

// Components
import UsersTab from "./users";
import BookingsTab from "./bookings";
import PaymentsTab from "./payments";
import TurfsTab from "./turfs";
import OwnersTab from "./owners";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    month: 0,
    total: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase.rpc("get_booking_stats");
      if (!error && data) setStats(data);
    };
    fetchStats();
  }, []);

  return (
    <main className="container mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        {Object.entries(stats).map(([label, value]) => (
          <Card key={label} className="text-center bg-card border-border rounded-xl">
            <CardContent className="p-6">
              <h2 className="text-sm text-muted-foreground mb-2 capitalize">{label}</h2>
              <p className="text-3xl font-bold text-primary">₹{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="turfs">Turfs</TabsTrigger>
          <TabsTrigger value="owners">Owners</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="bookings">
          <BookingsTab />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab />
        </TabsContent>
        <TabsContent value="turfs">
          <TurfsTab />
        </TabsContent>
        <TabsContent value="owners">
          <OwnersTab />
        </TabsContent>
      </Tabs>
    </main>
  );
}
