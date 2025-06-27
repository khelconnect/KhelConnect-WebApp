"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const sportsOptions = [
  "Football",
  "Cricket",
  "Badminton",
  "Pickleball",
  "Basketball",
  "Table Tennis",
  "Bowling",
];

export default function TurfAdminPanel() {
  const [turfs, setTurfs] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    price: "",
    amenities: "",
    distance: "",
    image: "",
    sports: [] as string[],
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineData, setInlineData] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchTurfs();
  }, []);

  const fetchTurfs = async () => {
    const { data } = await supabase.from("turfs").select("*");
    setTurfs(data || []);
  };

  const handleCheckboxChange = (sport: string) => {
    setFormData((prev) => ({
      ...prev,
      sports: prev.sports.includes(sport)
        ? prev.sports.filter((s) => s !== sport)
        : [...prev.sports, sport],
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    const { name, location, price, amenities, distance, image, sports } = formData;
    const payload = {
      name,
      location,
      price: parseInt(price),
      amenities: amenities.split(",").map((a) => a.trim()),
      distance,
      image: image || null,
      sports,
    };

    if (editingId) {
      await supabase.from("turfs").update(payload).eq("id", editingId);
    } else {
      await supabase.from("turfs").insert([payload]);
    }

    setFormData({ name: "", location: "", price: "", amenities: "", distance: "", image: "", sports: [] });
    setEditingId(null);
    fetchTurfs();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("turfs").delete().eq("id", id);
    fetchTurfs();
  };

  const handleInlineEdit = (turf: any) => {
    setInlineEditingId(turf.id);
    setInlineData({
      ...turf,
      amenities: turf.amenities.join(", "),
    });
  };

  const handleInlineChange = (id: string, field: string, value: any) => {
    setInlineData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleInlineSport = (sport: string) => {
    const current = inlineData.sports || [];
    const exists = current.includes(sport);
    setInlineData((prev) => ({
      ...prev,
      sports: exists ? current.filter((s: string) => s !== sport) : [...current, sport],
    }));
  };

  const saveInlineEdit = async () => {
    if (!inlineEditingId) return;

    const payload = {
      ...inlineData,
      price: parseInt(inlineData.price),
      amenities: inlineData.amenities.split(",").map((a: string) => a.trim()),
      image: inlineData.image || null,
    };

    delete payload.id;

    await supabase.from("turfs").update(payload).eq("id", inlineEditingId);
    setInlineEditingId(null);
    fetchTurfs();
  };

  return (
    <div className="container mx-auto py-6">
      <Tabs defaultValue="add" className="w-full">
        <TabsList>
          <TabsTrigger value="add">Add New Turf</TabsTrigger>
          <TabsTrigger value="edit">Edit/Delete Turfs</TabsTrigger>
        </TabsList>

        <TabsContent value="add">
          <Card className="mt-4 p-6">
            <CardContent className="space-y-4">
              <Label>Name</Label>
              <Input name="name" value={formData.name} onChange={handleInputChange} />
              <Label>Location</Label>
              <Input name="location" value={formData.location} onChange={handleInputChange} />
              <Label>Price</Label>
              <Input name="price" type="number" value={formData.price} onChange={handleInputChange} />
              <Label>Amenities (comma separated)</Label>
              <Input name="amenities" value={formData.amenities} onChange={handleInputChange} />
              <Label>Distance</Label>
              <Input name="distance" value={formData.distance} onChange={handleInputChange} />
              <Label>Image URL (optional)</Label>
              <Input name="image" value={formData.image} onChange={handleInputChange} />
              <Label>Sports</Label>
              <div className="flex flex-wrap gap-3">
                {sportsOptions.map((sport) => (
                  <label key={sport} className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.sports.includes(sport)}
                      onCheckedChange={() => handleCheckboxChange(sport)}
                    />
                    {sport}
                  </label>
                ))}
              </div>
              <Button onClick={handleSubmit}>{editingId ? "Update" : "Add"} Turf</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edit">
          <ScrollArea className="h-[600px] mt-4 w-full">
            <div className="grid gap-4">
              {turfs.map((turf) => (
                <Card key={turf.id} className="p-4">
                  <CardContent className="space-y-2">
                    {inlineEditingId === turf.id ? (
                      <>
                        <Input value={inlineData.name} onChange={(e) => handleInlineChange(turf.id, "name", e.target.value)} />
                        <Input value={inlineData.location} onChange={(e) => handleInlineChange(turf.id, "location", e.target.value)} />
                        <Input type="number" value={inlineData.price} onChange={(e) => handleInlineChange(turf.id, "price", e.target.value)} />
                        <Input value={inlineData.distance} onChange={(e) => handleInlineChange(turf.id, "distance", e.target.value)} />
                        <Input value={inlineData.amenities} onChange={(e) => handleInlineChange(turf.id, "amenities", e.target.value)} />
                        <Input value={inlineData.image} onChange={(e) => handleInlineChange(turf.id, "image", e.target.value)} />
                        <Label>Sports</Label>
                        <div className="flex flex-wrap gap-3">
                          {sportsOptions.map((sport) => (
                            <label key={sport} className="flex items-center gap-2">
                              <Checkbox
                                checked={inlineData.sports?.includes(sport)}
                                onCheckedChange={() => toggleInlineSport(sport)}
                              />
                              {sport}
                            </label>
                          ))}
                        </div>
                        <Button onClick={saveInlineEdit}>Save</Button>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold">{turf.name}</h3>
                        <p><strong>Location:</strong> {turf.location}</p>
                        <p><strong>Price:</strong> ₹{turf.price}</p>
                        <p><strong>Distance:</strong> {turf.distance}</p>
                        <p><strong>Amenities:</strong> {turf.amenities.join(", ")}</p>
                        <p><strong>Sports:</strong> {turf.sports.join(", ")}</p>
                        <div className="flex gap-4 mt-4">
                          <Button onClick={() => handleInlineEdit(turf)}>Edit</Button>
                          <Button variant="destructive" onClick={() => handleDelete(turf.id)}>Delete</Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
