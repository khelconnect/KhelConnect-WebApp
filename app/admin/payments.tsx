// app/admin/payments.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Payment {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  status: "pending" | "confirmed";
  created_at: string;
}

interface User {
  id: string;
  name: string;
  phone: string;
}

export default function PaymentsTab() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const fetchPayments = async () => {
    const { data: paymentsData } = await supabase.from("payments").select("*");
    const { data: usersData } = await supabase.from("users").select("id, name, phone");
    setPayments(paymentsData || []);
    setUsers(usersData || []);
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleConfirm = async (id: string) => {
    await supabase.from("payments").update({ status: "confirmed" }).eq("id", id);
    fetchPayments();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {payments.map((p) => {
        const user = users.find((u) => u.id === p.user_id);
        return (
          <Card key={p.id} className="bg-card border-border rounded-xl">
            <CardContent className="p-6 space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">{user?.name || "Unknown User"}</h2>
                <Badge
                  className={`text-xs px-2 py-1 rounded-full ${
                    p.status === "confirmed" ? "bg-green-500 text-white" : "bg-yellow-500 text-black"
                  }`}
                >
                  {p.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Phone: {user?.phone}</p>
              <p className="text-sm text-muted-foreground">Booking ID: {p.booking_id}</p>
              <p className="text-sm font-medium">Amount: ₹{p.amount}</p>
              {p.status === "pending" && (
                <Button size="sm" onClick={() => handleConfirm(p.id)}>
                  Mark as Paid
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
