// app/admin/bookings.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Booking {
  id: string;
  user_id: string;
  turf_id: string;
  date: string;
  slot: string[];
  turf_name?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export default function BookingsTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const { data: usersData } = await supabase.from("users").select("*");
      const { data: bookingsData } = await supabase.from("bookings").select("*");
      const { data: turfs } = await supabase.from("turfs").select("id, name");

      const turfMap = new Map(turfs?.map((t) => [t.id, t.name]));

      const bookingsWithNames = (bookingsData || []).map((b) => ({
        ...b,
        turf_name: turfMap.get(b.turf_id) || "Unknown Turf",
      }));

      setUsers(usersData || []);
      setBookings(bookingsWithNames);
    };

    fetchAll();
  }, []);

  return (
    <div className="space-y-6">
      {users.map((user) => (
        <Card key={user.id} className="bg-card border-border rounded-xl">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-1">{user.name}</h2>
            <p className="text-sm text-muted-foreground mb-1">{user.email}</p>
            <p className="text-sm text-muted-foreground mb-3">{user.phone}</p>
            <h3 className="text-sm font-medium mb-2">Bookings:</h3>
            <ul className="space-y-2">
              {bookings.filter((b) => b.user_id === user.id).map((b) => (
                <li key={b.id} className="border rounded-md p-3">
                  <p className="text-sm">
                    <strong>Turf:</strong> {b.turf_name} | <strong>Date:</strong> {b.date}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {b.slot.map((s, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
