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
  const [slots, setSlots] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    price: '',
    amenities: '',
    distance: '',
    image: '',
    rating: '',
    sports: [] as string[],
    turf_owner_id: '',
  });
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineData, setInlineData] = useState<any>({});
  const [owners, setOwners] = useState<any[]>([]);
  const [selectedSport, setSelectedSport] = useState<Record<string, string>>({});
  const [pricingRules, setPricingRules] = useState<Record<string, any[]>>({});
  const [showRuleDialog, setShowRuleDialog] = useState<null | { turfId: string }>(null);
  const [ruleForm, setRuleForm] = useState<{
    ruleType: 'slot' | 'day_of_week' | 'date' | 'range' | 'period',
    slotId?: string,
    dayOfWeek?: string,
    date?: string,
    startTime?: string,
    endTime?: string,
    period?: string,
    dayType?: string,
    price?: string,
    priority?: string
  }>({
    ruleType: 'slot',
    dayType: 'weekday',
    priority: '1',
    price: '',
  });

  useEffect(() => {
    fetchTurfs();
    fetchSlots();
    fetchOwners();
  }, []);

  async function fetchTurfs() {
    const { data } = await supabase.from('turfs').select('*');
    setTurfs(data || []);
  }

  async function fetchSlots() {
    const { data } = await supabase.from('time_slots').select('*').order('start_time');
    setSlots(data || []);
  }

  async function fetchOwners() {
  const { data } = await supabase.from('turf_owners').select('id, name');
  setOwners(data || []);
}
  async function fetchPricingRules(turfId: string, sport: string) {
    const { data } = await supabase
      .from('turf_prices')
      .select('*')
      .eq('turf_id', turfId)
      .eq('sport', sport)
      .order('priority', { ascending: false });
    setPricingRules(prev => ({ ...prev, [turfId + '__' + sport]: data || [] }));
  }

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
      turf_owner_id: formData.turf_owner_id,
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
        turf_owner_id: '',
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

  function openNewRuleDialog(turfId: string) {
    setRuleForm({ ruleType: 'slot', dayType: 'weekday', priority: '1', price: '' });
    setShowRuleDialog({ turfId });
  }

  async function saveRule() {
    if (!showRuleDialog) return;
    const turfId = showRuleDialog.turfId;
    const sport = selectedSport[turfId];
    if (!sport) return;

    const payload: any = {
      turf_id: turfId,
      sport,
      price: parseFloat(ruleForm.price || '0'),
      priority: parseInt(ruleForm.priority || '1'),
    };

    switch (ruleForm.ruleType) {
      case 'slot': payload.slot_id = ruleForm.slotId; break;
      case 'day_of_week': payload.day_of_week = parseInt(ruleForm.dayOfWeek!); break;
      case 'date': payload.date = ruleForm.date; break;
      case 'range':
        payload.start_time = ruleForm.startTime;
        payload.end_time = ruleForm.endTime;
        break;
      case 'period':
        payload.period = ruleForm.period;
        payload.day_type = ruleForm.dayType;
        break;
    }

    await supabase.from('turf_prices').insert([payload]);
    await fetchPricingRules(turfId, sport);
    setShowRuleDialog(null);
  }

  return (
    <div className="p-6">
      <Tabs defaultValue="add" className="w-full">
        <TabsList>
          <TabsTrigger value="add">Add New Turf</TabsTrigger>
          <TabsTrigger value="edit">Edit/Delete Turfs</TabsTrigger>
        </TabsList>

        <TabsContent value="add">
          <div>
            <Label>Turf Owner</Label>
            <Select
              value={formData.turf_owner_id}
              onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, turf_owner_id: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Owner" />
            </SelectTrigger>
            <SelectContent>
              {owners.map((owner) => (
                <SelectItem key={owner.id} value={owner.id}>
                  {owner.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
            <div className="space-y-6">
              {turfs.map(turf => {
                const key = turf.id + '__' + (selectedSport[turf.id] || '');
                const rules = pricingRules[key] || [];
                return (
                  <Card key={turf.id} className="p-4">
                    <CardContent className="space-y-4">
                      {inlineEditingId === turf.id ? (
                        <>
                          {/* Add Turf Owner Dropdown Here */}
                          <div>
                            <Label>Turf Owner</Label>
                            <Select
                              value={inlineData.turf_owner_id || ''}
                              onValueChange={(value) =>
                                setInlineData((prev: any) => ({ ...prev, turf_owner_id: value }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select Owner" />
                              </SelectTrigger>
                              <SelectContent>
                                {owners.map((owner) => (
                                  <SelectItem key={owner.id} value={owner.id}>
                                    {owner.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
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
                        onValueChange={sport => {
                          setSelectedSport(prev => ({ ...prev, [turf.id]: sport }));
                          fetchPricingRules(turf.id, sport);
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
                          <Button onClick={() => openNewRuleDialog(turf.id)}>
                            Add pricing rule
                          </Button>
                          <div className="space-y-2">
                            {rules.map(rule => (
                              <div key={rule.id} className="border rounded p-2">
                                <pre className="text-xs">
                                  {JSON.stringify({
                                    type: rule.slot_id ? 'slot' :
                                      rule.date ? 'date' :
                                        rule.day_of_week !== null ? 'day_of_week' :
                                          rule.period ? 'period' : 'range',
                                    ...('slot_id' in rule && { slot_id: rule.slot_id }),
                                    ...(rule.day_of_week !== null && { day_of_week: rule.day_of_week }),
                                    ...(rule.date && { date: rule.date }),
                                    ...(rule.start_time && { start_time: rule.start_time, end_time: rule.end_time }),
                                    ...(rule.period && { period: rule.period, day_type: rule.day_type }),
                                    price: rule.price,
                                    priority: rule.priority,
                                  }, null, 2)}
                                </pre>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {showRuleDialog && (
        <Dialog open onOpenChange={() => setShowRuleDialog(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Pricing Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select
                value={ruleForm.ruleType}
                onValueChange={(v) => setRuleForm(f => ({ ...f, ruleType: v as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slot">By Slot</SelectItem>
                  <SelectItem value="day_of_week">By Day of Week</SelectItem>
                  <SelectItem value="date">By Date</SelectItem>
                  <SelectItem value="range">By Time Range</SelectItem>
                  <SelectItem value="period">By Period (day/evening)</SelectItem>
                </SelectContent>
              </Select>

              {ruleForm.ruleType === 'slot' && (
                <Select
                  value={ruleForm.slotId || ''}
                  onValueChange={(v) => setRuleForm(f => ({ ...f, slotId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {slots.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.start_time} - {s.end_time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {ruleForm.ruleType === 'day_of_week' && (
                <Select value={ruleForm.dayOfWeek} onValueChange={v => setRuleForm(f => ({ ...f, dayOfWeek: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select weekday (0–6)" /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 7 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {ruleForm.ruleType === 'date' && (
                <Input type="date" value={ruleForm.date} onChange={e => setRuleForm(f => ({ ...f, date: e.target.value }))} />
              )}

              {ruleForm.ruleType === 'range' && (
                <>
                  <Input type="time" value={ruleForm.startTime} onChange={e => setRuleForm(f => ({ ...f, startTime: e.target.value }))} />
                  <Input type="time" value={ruleForm.endTime} onChange={e => setRuleForm(f => ({ ...f, endTime: e.target.value }))} />
                </>
              )}

              {ruleForm.ruleType === 'period' && (
                <>
                  <Select value={ruleForm.period} onValueChange={v => setRuleForm(f => ({ ...f, period: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="evening">Evening</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={ruleForm.dayType} onValueChange={v => setRuleForm(f => ({ ...f, dayType: v }))}>
                    <SelectTrigger><SelectValue placeholder="Weekday/Weekend" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekday">Weekday</SelectItem>
                      <SelectItem value="weekend">Weekend</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}

              <Input
                type="number"
                placeholder="Price"
                value={ruleForm.price}
                onChange={e => setRuleForm(f => ({ ...f, price: e.target.value }))}
              />
              <Input
                type="number"
                placeholder="Priority (higher = override)"
                value={ruleForm.priority}
                onChange={e => setRuleForm(f => ({ ...f, priority: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button onClick={saveRule}>Save Rule</Button>
              <Button variant="ghost" onClick={() => setShowRuleDialog(null)}>Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
