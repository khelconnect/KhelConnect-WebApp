"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart2, CalendarDays, CreditCard, Users } from "lucide-react";
// --- IMPORT UNIVERSAL LOADER ---
import { UniversalLoader } from "@/components/ui/universal-loader";

export default function DashboardTab() {
  const [stats, setStats] = useState({
    total_revenue: 0,
    today_revenue: 0,
    today_bookings: 0,
    week_bookings: 0,
    month_bookings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.rpc("get_admin_dashboard_stats");
        if (error) throw error;
        setStats(data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // --- REPLACED LOADER ---
  if (loading) return <UniversalLoader />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card className="bg-card border-border rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <CalendarDays className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bookings Today</p>
              <p className="text-2xl font-bold">{stats.today_bookings}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/10 p-3 rounded-full">
              <BarChart2 className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">This Week</p>
              <p className="text-2xl font-bold">{stats.week_bookings} bookings</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="bg-green-500/10 p-3 rounded-full">
              <CreditCard className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revenue Today</p>
              <p className="text-2xl font-bold">₹{stats.today_revenue}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="bg-purple-500/10 p-3 rounded-full">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Bookings</p>
              <p className="text-2xl font-bold">{stats.month_bookings}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border rounded-xl sm:col-span-2 lg:col-span-2">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="bg-orange-500/10 p-3 rounded-full">
              <CreditCard className="h-8 w-8 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Lifetime Revenue</p>
              <p className="text-3xl font-bold">₹{stats.total_revenue}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}