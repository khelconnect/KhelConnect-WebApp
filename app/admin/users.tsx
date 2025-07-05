// app/admin/users.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export default function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from("users").select("id, name, email, phone");
      if (!error && data) setUsers(data);
    };
    fetchUsers();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {users.map((user) => (
        <Card key={user.id} className="bg-card border-border rounded-xl">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-1">{user.name}</h2>
            <p className="text-sm text-muted-foreground mb-1">{user.email}</p>
            <p className="text-sm text-muted-foreground mb-2">{user.phone}</p>
            <Badge variant="outline" className="text-xs">User ID: {user.id.slice(0, 8)}...</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
