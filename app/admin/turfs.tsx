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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

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
    rating: '',
    sports: [] as string[],
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineData, setInlineData] = useState<any>({});
  const [slots, setSlots] = useState<any[]>([]);
  const [pricing, setPricing] = useState<Record<string, any>>({});
  const [slotGroupPrice, setSlotGroupPrice] = useState<Record<string, any>>({});
  const [expandedTurfId, setExpandedTurfId] = useState<string | null>(null);
  const [popupSlot, setPopupSlot] = useState<null | {
    turfId: string;
    slotId: string;
    dayType: string;
    start: string;
    end: string;
  }>(null);
  const [popupPrice, setPopupPrice] = useState('');
  const [selectedSport, setSelectedSport] = useState<Record<string, string>>({});

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

  const fetchPricing = async (turfId: string, sport: string) => {
    const { data } = await supabase
      .from('turf_prices')
      .select('*')
      .eq('turf_id', turfId)
      .eq('sport', sport);

    const priceMap = (data || []).reduce((acc: any, record: any) => {
      acc[`${record.slot_id}__${record.day_type}`] = record.price;
      return acc;
    }, {});
    setPricing((prev) => ({ ...prev, [turfId + '__' + sport]: priceMap }));
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
    const payload = {
      ...formData,
      price: parseInt(formData.price),
      rating: parseFloat(formData.rating),
      amenities: formData.amenities
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      sports: formData.sports,
    };

    const { error } = await supabase.from('turfs').insert([payload]);
    if (error) console.error('Add turf error:', error);
    else {
      setFormData({
        name: '',
        location: '',
        price: '',
        amenities: '',
        distance: '',
        image: '',
        rating: '',
        sports: [],
      });
      fetchTurfs();
    }
  };

  const startEdit = (turf: any) => {
    setInlineEditingId(turf.id);
    setInlineData(turf);
  };

  const saveEdit = async (id: string) => {
    const updatePayload = {
      ...inlineData,
      price: parseInt(inlineData.price),
      rating: parseFloat(inlineData.rating),
      amenities: typeof inlineData.amenities === 'string'
        ? inlineData.amenities.split(',').map((a: string) => a.trim())
        : inlineData.amenities,
      sports: inlineData.sports,
    };

    const { error } = await supabase.from('turfs').update(updatePayload).eq('id', id);
    if (error) console.error('Update error:', error);
    else {
      setInlineEditingId(null);
      fetchTurfs();
    }
  };

  const deleteTurf = async (id: string) => {
    const { error } = await supabase.from('turfs').delete().eq('id', id);
    if (error) console.error('Delete error:', error);
    else fetchTurfs();
  };

  const handleGroupPriceChange = (turfId: string, period: string, dayType: string, value: string) => {
    setSlotGroupPrice((prev) => ({
      ...prev,
      [`${turfId}__${period}__${dayType}`]: value,
    }));
  };

  const saveGroupPrices = async (turfId: string) => {
    const sport = selectedSport[turfId];
    if (!sport) return;
    const entries = Object.entries(slotGroupPrice).filter(([k]) => k.startsWith(turfId));
    for (const [key, price] of entries) {
      const [, period, dayType] = key.split('__');
      const slotIds = slots.filter((s) => s.period === period).map((s) => s.id);
      for (const slot_id of slotIds) {
        await supabase
          .from('turf_prices')
          .upsert({
            turf_id: turfId,
            sport,
            slot_id,
            day_type: dayType,
            price: parseInt(price),
          }, { onConflict: ['turf_id', 'sport', 'slot_id', 'day_type'] });
      }
    }
    await fetchPricing(turfId, sport);
  };

  const saveIndividualPrice = async (
    turfId: string,
    slotId: string,
    dayType: string,
    value: string
  ) => {
    const sport = selectedSport[turfId];
    if (!sport) return;
    await supabase.from('turf_prices').upsert({
      turf_id: turfId,
      sport,
      slot_id: slotId,
      day_type: dayType,
      price: parseInt(value),
    }, { onConflict: ['turf_id', 'sport', 'slot_id', 'day_type'] });
    await fetchPricing(turfId, sport);
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
            {Object.keys(formData).map((key) =>
              key !== 'sports' ? (
                <div key={key}>
                  <Label>{key}</Label>
                  <Input
                    value={(formData as any)[key]}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                  />
                </div>
              ) : null
            )}
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
                          key !== 'id' ? (
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

                    <Label>Select Sport for Pricing</Label>
                    <Select
                      value={selectedSport[turf.id] || ''}
                      onValueChange={(sport) => {
                        setSelectedSport((prev) => ({ ...prev, [turf.id]: sport }));
                        fetchPricing(turf.id, sport);
                      }}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select Sport" />
                      </SelectTrigger>
                      <SelectContent>
                        {(turf.sports || []).map((s: string) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedSport[turf.id] && (
                      <>
                        {['day', 'evening'].map((period) => (
                          <div key={period} className="my-2">
                            <p className="font-semibold">{period.toUpperCase()}</p>
                            {['weekday', 'weekend'].map((dayType) => (
                              <div key={dayType} className="flex gap-2 items-center">
                                <Label className="w-20">{dayType}</Label>
                                <Input
                                  type="number"
                                  placeholder="₹"
                                  value={slotGroupPrice[`${turf.id}__${period}__${dayType}`] ?? ''}
                                  onChange={(e) =>
                                    handleGroupPriceChange(turf.id, period, dayType, e.target.value)
                                  }
                                />
                                <Button size="sm" onClick={() => saveGroupPrices(turf.id)}>Save Group</Button>
                              </div>
                            ))}
                          </div>
                        ))}

                        <div className="mt-4">
                          <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() =>
                              setExpandedTurfId(expandedTurfId === turf.id ? null : turf.id)
                            }
                          >
                            <p className="font-semibold">Individual Slot Prices</p>
                            <span className="text-xl">
                              {expandedTurfId === turf.id ? '▾' : '▸'}
                            </span>
                          </div>

                          {expandedTurfId === turf.id && (
                            <div className="space-y-4 mt-2">
                              {['weekday', 'weekend'].map((dayType) => (
                                <div key={dayType}>
                                  <p className="font-semibold capitalize">{dayType}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {slots.map((slot) => {
                                      const key = `${slot.id}__${dayType}`;
                                      const value = pricing[turf.id + '__' + selectedSport[turf.id]]?.[key] || '';
                                      return (
                                        <Button
                                          key={key}
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setPopupSlot({
                                              turfId: turf.id,
                                              slotId: slot.id,
                                              dayType,
                                              start: slot.start_time,
                                              end: slot.end_time,
                                            });
                                            setPopupPrice(value.toString());
                                          }}
                                        >
                                          {slot.start_time} - {slot.end_time}
                                        </Button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
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

      {popupSlot && (
        <Dialog open={true} onOpenChange={() => setPopupSlot(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Edit Price</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p>
                Slot: <strong>{popupSlot.start} - {popupSlot.end}</strong>
              </p>
              <p>Day Type: <strong>{popupSlot.dayType}</strong></p>
              <Input
                type="number"
                value={popupPrice}
                onChange={(e) => setPopupPrice(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  saveIndividualPrice(
                    popupSlot.turfId,
                    popupSlot.slotId,
                    popupSlot.dayType,
                    popupPrice
                  );
                  setPopupSlot(null);
                }}
              >
                Save
              </Button>
              <Button variant="ghost" onClick={() => setPopupSlot(null)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
