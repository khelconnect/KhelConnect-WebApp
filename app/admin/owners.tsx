// app/admin/owners.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

// Type definition for an owner and their linked turf
type OwnerWithTurf = {
  id: string;
  name: string;
  email: string;
  phone: string;
  turf_name: string; // The *requested* turf name from signup
  location: string; // The *requested* location
  created_at: string;
  turfs: { id: string }[]; // An array of their turfs. If length > 0, they are verified.
};

// State for the verification form
const initialTurfData = {
  name: "",
  location: "",
  image: "",
  base_price: "",
  amenities: "",
  sports: "",
  default_sport: "football",
  default_price: "",
};

export default function OwnersTab() {
  const [owners, setOwners] = useState<OwnerWithTurf[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal state
  const [selectedOwner, setSelectedOwner] = useState<OwnerWithTurf | null>(null);
  const [turfData, setTurfData] = useState(initialTurfData);

  // Fetch owners and their verification status (by checking for a linked turf)
  const fetchOwners = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("turf_owners")
      .select("*, turfs(id)") // Select owner and the ID of their linked turf
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOwners(data as OwnerWithTurf[]);
    } else {
      console.error("Error fetching owners:", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  // Pre-fill the form when an owner is selected
  useEffect(() => {
    if (selectedOwner) {
      setTurfData({
        ...initialTurfData,
        name: selectedOwner.turf_name,
        location: selectedOwner.location,
      });
    }
  }, [selectedOwner]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTurfData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwner) return;

    setIsSubmitting(true);
    try {
      // This RPC function (you must create it - see SQL below)
      // will create the turf and the initial price in a single transaction.
      const { data, error } = await supabase.rpc(
        "verify_owner_and_create_turf",
        {
          p_owner_id: selectedOwner.id,
          p_turf_name: turfData.name,
          p_turf_location: turfData.location,
          p_turf_image: turfData.image,
          p_base_price: parseInt(turfData.base_price, 10),
          p_amenities: turfData.amenities.split(",").map((s) => s.trim()),
          p_sports: turfData.sports.split(",").map((s) => s.trim()),
          p_default_sport: turfData.default_sport,
          p_default_price: parseFloat(turfData.default_price),
        }
      );

      if (error) throw error;

      alert("Owner verified and turf created successfully!");
      // Update the owner in the local state to show "Verified"
      setOwners(
        owners.map((o) =>
          o.id === selectedOwner.id ? { ...o, turfs: [{ id: data }] } : o
        )
      );
      setSelectedOwner(null); // Close modal
    } catch (error: any) {
      console.error("Verification error:", error);
      alert("Error verifying owner: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Turf Owner Management</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Owner Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Requested Turf</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {owners.map((owner) => {
                const isVerified = owner.turfs.length > 0;
                return (
                  <TableRow key={owner.id}>
                    <TableCell>
                      <div className="font-medium">{owner.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {owner.email}
                      </div>
                    </TableCell>
                    <TableCell>{owner.phone}</TableCell>
                    <TableCell>
                      <div className="font-medium">{owner.turf_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {owner.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isVerified ? (
                        <Badge variant="default" className="bg-green-600">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isVerified}
                        onClick={() => setSelectedOwner(owner)}
                      >
                        {isVerified ? "Manage" : "Verify"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Verification Modal */}
      <Dialog
        open={!!selectedOwner}
        onOpenChange={(isOpen) => !isOpen && setSelectedOwner(null)}
      >
        <DialogContent className="sm:max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Verify Owner & Create Turf</DialogTitle>
            <DialogDescription>
              Confirm details for{" "}
              <span className="font-medium text-primary">
                {selectedOwner?.name}
              </span>{" "}
              and create their turf listing.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              {/* turfs Table Fields */}
              <div className="space-y-2">
                <Label htmlFor="name">Turf Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={turfData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={turfData.location}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">Image URL</Label>
                <Input
                  id="image"
                  name="image"
                  placeholder="https://example.com/image.png"
                  value={turfData.image}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="base_price">Base Price (₹)</Label>
                <Input
                  id="base_price"
                  name="base_price"
                  type="number"
                  placeholder="e.g., 800 (for 'Starting at' price)"
                  value={turfData.base_price}
                  onChange={handleInputChange}
                />
              </div>
              <div className="col-span-1 md:col-span-2 space-y-2">
                <Label htmlFor="amenities">Amenities</Label>
                <Input
                  id="amenities"
                  name="amenities"
                  placeholder="e.g., Wifi, Parking, Washroom (comma-separated)"
                  value={turfData.amenities}
                  onChange={handleInputChange}
                />
              </div>
              <div className="col-span-1 md:col-span-2 space-y-2">
                <Label htmlFor="sports">Available Sports</Label>
                <Input
                  id="sports"
                  name="sports"
                  placeholder="e.g., Football, Cricket (comma-separated)"
                  value={turfData.sports}
                  onChange={handleInputChange}
                />
              </div>

              {/* turf_prices Table Fields (Simple) */}
              <div className="col-span-1 md:col-span-2 pt-4 border-t border-border">
                <h4 className="font-medium mb-2">Initial Pricing Rule</h4>
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_sport">Default Sport</Label>
                <Input
                  id="default_sport"
                  name="default_sport"
                  placeholder="e.g., football"
                  value={turfData.default_sport}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_price">Price for Default Sport (₹)</Label>
                <Input
                  id="default_price"
                  name="default_price"
                  type="number"
                  placeholder="e.g., 1000"
                  value={turfData.default_price}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedOwner(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Verify & Create Turf"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}