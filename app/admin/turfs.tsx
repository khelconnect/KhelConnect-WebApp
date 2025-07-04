'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const sportsOptions = [
  'football', 'cricket', 'badminton', 'pickleball',
  'basketball', 'table Tennis', 'bowling',
];

export default function TurfAdminPanel() {
  const [turfs, setTurfs] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    price: '',
    amenities: '',
    distance: '',
    image: '',
    sports: [] as string[],
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineData, setInlineData] = useState<any>({});
  const [slots, setSlots] = useState<any[]>([]);
  const [pricing, setPricing] = useState<Record<string, any>>({});
  const [slotGroupPrice, setSlotGroupPrice] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchTurfs();
    fetchSlots();
  }, []);

  const fetchTurfs = async () => {
    const { data } = await supabase.from('turfs').select('*');
    setTurfs(data || []);
  };

  const fetchSlots = async () => {
    const { data } = await supabase
      .from('time_slots')
      .select('*')
      .order('start_time', { ascending: true });
    setSlots(data || []);
  };

  const fetchPricing = async (turfId: string) => {
    const { data } = await supabase
      .from('turf_prices')
      .select('*')
      .eq('turf_id', turfId);

    const priceMap = (data || []).reduce((acc: any, record: any) => {
      acc[`${record.slot_id}__${record.day_type}`] = record.price;
      return acc;
    }, {});
    setPricing((prev) => ({ ...prev, [turfId]: priceMap }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (sport: string) => {
    setFormData((prev) => {
      const isSelected = prev.sports.includes(sport);
      return {
        ...prev,
        sports: isSelected
          ? prev.sports.filter((s) => s !== sport)
          : [...prev.sports, sport],
      };
    });
  };

  const addTurf = async () => {
    await supabase.from('turfs').insert([formData]);
    setFormData({
      name: '',
      location: '',
      price: '',
      amenities: '',
      distance: '',
      image: '',
      sports: [],
    });
    fetchTurfs();
  };

  const startEdit = (turf: any) => {
    setInlineEditingId(turf.id);
    setInlineData(turf);
    fetchPricing(turf.id);
  };

  const saveEdit = async (id: string) => {
    await supabase.from('turfs').update(inlineData).eq('id', id);
    setInlineEditingId(null);
    fetchTurfs();
  };

  const deleteTurf = async (id: string) => {
    await supabase.from('turfs').delete().eq('id', id);
    fetchTurfs();
  };

  const handleGroupPriceChange = (turfId: string, period: string, dayType: string, value: string) => {
    setSlotGroupPrice((prev) => ({
      ...prev,
      [`${turfId}__${period}__${dayType}`]: value,
    }));
  };

  const saveGroupPrices = async (turfId: string) => {
    const entries = Object.entries(slotGroupPrice).filter(([k]) => k.startsWith(turfId));
    for (const [key, price] of entries) {
      const [, period, dayType] = key.split('__');
      const slotIds = slots.filter((s) => s.period === period).map((s) => s.id);
      for (const slot_id of slotIds) {
        await supabase
          .from('turf_prices')
          .upsert({
            turf_id: turfId,
            slot_id,
            day_type: dayType,
            price: parseInt(price),
          }, { onConflict: ['turf_id', 'slot_id', 'day_type'] });
      }
    }
    await fetchPricing(turfId);
  };

  const saveIndividualPrice = async (
    turfId: string,
    slotId: string,
    dayType: string,
    value: string
  ) => {
    await supabase.from('turf_prices').upsert({
      turf_id: turfId,
      slot_id: slotId,
      day_type: dayType,
      price: parseInt(value),
    }, { onConflict: ['turf_id', 'slot_id', 'day_type'] });
    await fetchPricing(turfId);
  };

  return (
    <div className="p-6">
      <Tabs defaultValue="add" className="w-full">
        <TabsList>
          <TabsTrigger value="add">Add New Turf</TabsTrigger>
          <TabsTrigger value="edit">Edit/Delete Turfs</TabsTrigger>
        </TabsList>

        <TabsContent value="add">
          <div className="space-y-4 mt-4">
            {Object.keys(formData).map((key) => key !== 'sports' && (
              <div key={key}>
                <Label>{key}</Label>
                <Input
                  value={(formData as any)[key]}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                />
              </div>
            ))}
            <div className="flex flex-wrap gap-4">
              {sportsOptions.map((sport) => (
                <div key={sport}>
                  <Checkbox
                    checked={formData.sports.includes(sport)}
                    onCheckedChange={() => handleCheckboxChange(sport)}
                  />
                  <Label>{sport}</Label>
                </div>
              ))}
            </div>
            <Button onClick={addTurf}>Add Turf</Button>
          </div>
        </TabsContent>

        <TabsContent value="edit">
          <ScrollArea className="h-[600px] mt-4 w-full">
            <div className="space-y-4">
              {turfs.map((turf) => (
                <Card key={turf.id} className="p-4">
                  <CardContent className="space-y-2">
                    {inlineEditingId === turf.id ? (
                      <>
                        {Object.keys(turf).map((key) =>
                          key !== 'id' && key !== 'sports' ? (
                            <div key={key}>
                              <Label>{key}</Label>
                              <Input
                                value={inlineData[key] || ''}
                                onChange={(e) =>
                                  setInlineData((prev: any) => ({
                                    ...prev,
                                    [key]: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          ) : null
                        )}
                        <Button onClick={() => saveEdit(turf.id)}>Save</Button>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-semibold">{turf.name}</p>
                        <Button onClick={() => startEdit(turf)}>Edit</Button>
                        <Button variant="destructive" onClick={() => deleteTurf(turf.id)}>Delete</Button>
                      </>
                    )}

                    {/* Pricing Section */}
                    <h4 className="font-semibold mt-4">Pricing</h4>
                    {["day", "evening"].map((period) => (
                      <div key={period} className="my-2">
                        <p className="font-semibold">{period.toUpperCase()}</p>
                        {["weekday", "weekend"].map((dayType) => (
                          <div key={dayType} className="flex gap-2 items-center">
                            <Label className="w-20">{dayType}</Label>
                            <Input
                              type="number"
                              placeholder="₹"
                              value={slotGroupPrice[`${turf.id}__${period}__${dayType}`] ?? ""}
                              onChange={(e) => handleGroupPriceChange(turf.id, period, dayType, e.target.value)}
                            />
                            <Button size="sm" onClick={() => saveGroupPrices(turf.id)}>Save Group</Button>
                          </div>
                        ))}
                      </div>
                    ))}

                    <p className="font-semibold mt-4">Individual Slot Prices</p>
                    {slots.map((slot) =>
                      ['weekday', 'weekend'].map((dayType) => {
                        const key = `${slot.id}__${dayType}`;
                        const value = pricing[turf.id]?.[key] || '';
                        return (
                          <div key={key} className="flex gap-2 items-center">
                            <Label className="w-40">{slot.start_time}-{slot.end_time} ({dayType})</Label>
                            <Input
                              type="number"
                              value={value}
                              onChange={(e) => {
                                setPricing((prev) => ({
                                  ...prev,
                                  [turf.id]: {
                                    ...prev[turf.id],
                                    [key]: e.target.value,
                                  },
                                }));
                              }}
                            />
                            <Button size="sm" onClick={() =>
                              saveIndividualPrice(turf.id, slot.id, dayType, pricing[turf.id]?.[key])
                            }>Save</Button>
                          </div>
                        );
                      })
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
