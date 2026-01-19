"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, User } from "lucide-react";

interface UserType {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

export default function UsersTab() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      // Fetch users who are strictly Players (role = user) or unassigned
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, phone, role")
        .neq("role", "admin") // Exclude admins
        .neq("role", "owner") // Exclude owners (managed in other tab)
        .order("created_at", { ascending: false })
        .limit(50); // Limit for performance

      if (!error && data) setUsers(data);
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border">
        <Search className="text-muted-foreground w-5 h-5" />
        <Input 
          placeholder="Search players by name or email..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="border-none bg-transparent focus-visible:ring-0"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="bg-card border-border rounded-xl hover:border-primary/50 transition-colors">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1 overflow-hidden">
                <h2 className="text-lg font-semibold truncate">{user.name || "Unnamed User"}</h2>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                <p className="text-sm text-muted-foreground">{user.phone || "No phone"}</p>
                <div className="pt-2">
                  <Badge variant="outline" className="text-xs font-normal">
                    ID: {user.id.slice(0, 8)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredUsers.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-10">
            No players found.
          </div>
        )}
      </div>
    </div>
  );
}