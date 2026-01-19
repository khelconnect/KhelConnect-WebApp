"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle, CheckCircle, Search } from "lucide-react";

// Updated Type based on 'users' table
type OwnerWithTurf = {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  // Join result
  turfs: { id: string; name: string; location: string }[]; 
};

const initialTurfData = {
  name: "", location: "", image: "", base_price: "", amenities: "",
  sports: "", default_sport: "football", default_price: "",
};

export default function OwnersTab() {
  const [owners, setOwners] = useState<OwnerWithTurf[]>([]);
  const [filteredOwners, setFilteredOwners] = useState<OwnerWithTurf[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [selectedOwner, setSelectedOwner] = useState<OwnerWithTurf | null>(null);
  const [turfData, setTurfData] = useState(initialTurfData);

  const fetchOwners = async () => {
    setIsLoading(true);
    // 1. Fetch Users who are 'owner'
    // 2. Left Join 'turfs' to see if they have one created
    const { data, error } = await supabase
      .from("users")
      .select("*, turfs(id, name, location)")
      .eq("role", "owner")
      .order("created_at", { ascending: false });

// Inside fetchOwners function:
if (!error && data) {
  setOwners(data as OwnerWithTurf[]);
  setFilteredOwners(data as OwnerWithTurf[]);
} else {
  // FIXED: Log the actual message, not just the object
  console.error("Error fetching owners:", error?.message || error);
}
    setIsLoading(false);
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  useEffect(() => {
    const lower = searchQuery.toLowerCase();
    setFilteredOwners(owners.filter(o => 
      o.name?.toLowerCase().includes(lower) || 
      o.email?.toLowerCase().includes(lower) ||
      o.phone?.includes(lower)
    ));
  }, [searchQuery, owners]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTurfData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwner) return;

    setIsSubmitting(true);
    try {
      // Create Turf Logic
      // 1. Insert into turfs table
      const { data: turf, error: turfError } = await supabase.from('turfs').insert({
        owner_id: selectedOwner.id, // Link to the user
        name: turfData.name,
        location: turfData.location,
        image: turfData.image,
        price: parseInt(turfData.base_price, 10),
        amenities: turfData.amenities.split(",").map((s) => s.trim()),
        sports: turfData.sports.split(",").map((s) => s.trim()),
        booking_window_days: 30,
        reschedule_window_days: 30,
        allow_rescheduling: true,
        allow_refunds: true
      }).select().single();

      if (turfError) throw turfError;

      // 2. Insert Initial Price Rule
      const { error: priceError } = await supabase.from('turf_prices').insert({
        turf_id: turf.id,
        sport: turfData.default_sport,
        price: parseFloat(turfData.default_price),
        priority: 1
      });

      if (priceError) throw priceError;

      alert("Turf created successfully!");
      fetchOwners(); // Refresh list
      setSelectedOwner(null);
      setTurfData(initialTurfData);
    } catch (error: any) {
      console.error("Verification error:", error);
      alert("Error creating turf: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Turf Partner Management</CardTitle>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search owners..." 
            className="pl-8" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Owner Details</TableHead>
                  <TableHead>Linked Turf</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOwners.map((owner) => {
                  const hasTurf = owner.turfs && owner.turfs.length > 0;
                  const turfName = hasTurf ? owner.turfs[0].name : "None";
                  
                  return (
                    <TableRow key={owner.id}>
                      <TableCell>
                        <div className="font-medium">{owner.name || "Unnamed"}</div>
                        <div className="text-sm text-muted-foreground">{owner.email}</div>
                        <div className="text-xs text-muted-foreground">{owner.phone}</div>
                      </TableCell>
                      <TableCell>{turfName}</TableCell>
                      <TableCell>
                        {hasTurf ? 
                          <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1"/> Active</Badge> : 
                          <Badge variant="secondary">Pending Setup</Badge>
                        }
                      </TableCell>
                      <TableCell>
                        {!hasTurf ? (
                          <Button size="sm" onClick={() => setSelectedOwner(owner)}>
                            <PlusCircle className="w-4 h-4 mr-1" /> Create Turf
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled>Configured</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!selectedOwner} onOpenChange={(isOpen) => !isOpen && setSelectedOwner(null)}>
        <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Setup Turf for {selectedOwner?.name}</DialogTitle>
            <DialogDescription>Enter initial details to verify this partner.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Turf Name</Label>
                <Input name="name" value={turfData.name} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input name="location" value={turfData.location} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input name="image" value={turfData.image} onChange={handleInputChange} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Base Price (₹)</Label>
                <Input name="base_price" type="number" value={turfData.base_price} onChange={handleInputChange} required />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Amenities (comma separated)</Label>
                <Input name="amenities" value={turfData.amenities} onChange={handleInputChange} placeholder="Wifi, Parking..." />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Sports (comma separated)</Label>
                <Input name="sports" value={turfData.sports} onChange={handleInputChange} placeholder="Football, Cricket..." />
              </div>
              
              <div className="col-span-2 pt-2 border-t"><Label className="text-primary">Initial Pricing Rule</Label></div>
              <div className="space-y-2">
                <Label>Default Sport</Label>
                <Input name="default_sport" value={turfData.default_sport} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label>Price (₹)</Label>
                <Input name="default_price" type="number" value={turfData.default_price} onChange={handleInputChange} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setSelectedOwner(null)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : "Create Turf"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}