"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Edit, ArrowLeft, MapPin, Star, Clock, XCircle, CheckCircle, RefreshCw, Trash2, Settings, ToggleLeft, ToggleRight, Info, AlertCircle, Lock, CalendarDays, History, Trophy
} from "lucide-react";
import { format, getDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

// --- TYPES & CONSTANTS ---
const sportsOptions = [
  'football', 'cricket', 'badminton', 'pickleball',
  'basketball', 'table Tennis', 'bowling',
];

const priorityMap = {
  date_slot: 100,      // Specific date + Specific slot
  date_only: 90,       // Entire specific date
  recurring_slot: 80,  // Every Monday at 5 PM
  recurring_day: 70,   // Every Monday
  day_type_slot: 60,   // Every Weekend at 5 PM
  day_type: 50,        // Every Weekend
  base: 10             // Sport Base Price
};

interface Turf {
  id: string;
  name: string;
  location: string;
  image: string;
  price: number;
  advance_price: number;
  rating: number;
  amenities: string[];
  distance: string;
  sports: string[];
  turf_owner_id: string | null;
  booking_window_days: number;
  pending_booking_window_days: number | null;
  allow_rescheduling: boolean;
  allow_refunds: boolean;
  reschedule_window_days: number;
  is_coming_soon: boolean; 
}

type TimeSlotDisplay = {
  id: string;
  time: string;
  endTime: string;
  period: string; 
}

type BookingType = {
  id: string;
  date: string;
  slot: string;
  slotId: string;
  customerName: string;
  status: string;
  payment_status: string;
}

type ManualBlockType = {
  id: string;
  slotId: string;
  reason: string | null;
}

type PriceRule = {
  id: string;
  turf_id: string;
  sport: string;
  price: number;
  priority: number;
  slot_id: string | null;
  day_of_week: number | null;
  date: string | null;
  period: string | null;
  day_type: 'weekday' | 'weekend' | null;
  notes?: string;
}

// ==================================================================
// HELPER 1: Add Turf Dialog
// ==================================================================
function AddTurfDialog({ isOpen, onClose, onTurfAdded }: { isOpen: boolean, onClose: () => void, onTurfAdded: () => void }) {
  const [formData, setFormData] = useState({
    name: '', location: '', price: '', advance_price: '500', amenities: '',
    distance: '', image: '', rating: '', sports: [] as string[], turf_owner_id: '',
    is_coming_soon: false, 
  });
  const [owners, setOwners] = useState<any[]>([]);

  useEffect(() => {
    async function fetchOwners() {
      const { data } = await supabase.from('users').select('id, name').eq('role', 'owner');
      setOwners(data || []);
    }
    fetchOwners();
  }, []);

  const handleInputChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleCheckboxChange = (sport: string) => {
    setFormData((prev) => {
      const isSelected = prev.sports.includes(sport);
      return {
        ...prev,
        sports: isSelected ? prev.sports.filter((s) => s !== sport) : [...prev.sports, sport],
      };
    });
  };

  const addTurf = async () => {
    if (!formData.name || !formData.price) {
      alert("Please fill in the Turf Name and Price.");
      return;
    }
    const payload = {
      ...formData,
      price: parseInt(formData.price) || 0,
      advance_price: parseInt(formData.advance_price) || 0,
      rating: parseFloat(formData.rating) || null,
      amenities: formData.amenities.split(',').map((a) => a.trim()).filter(Boolean),
      sports: formData.sports,
      turf_owner_id: formData.turf_owner_id || null,
      allow_rescheduling: true,
      allow_refunds: true,
      booking_window_days: 30,
      reschedule_window_days: 30,
      is_coming_soon: formData.is_coming_soon 
    };
    try {
      const { error } = await supabase.from('turfs').insert([payload]);
      if (error) throw error;
      onTurfAdded();
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Add New Turf</DialogTitle></DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-4 p-4">
            <div className="flex items-center space-x-2 p-3 rounded-xl border border-orange-500/20 bg-orange-500/5">
              <Checkbox id="add-is-coming-soon" checked={formData.is_coming_soon} onCheckedChange={(checked) => handleInputChange('is_coming_soon', checked as boolean)} />
              <div className="grid gap-1.5 leading-none">
                <label htmlFor="add-is-coming-soon" className="text-sm font-bold leading-none text-orange-600 flex items-center gap-2"><Lock className="h-3 w-3" /> Coming Soon Mode</label>
                <p className="text-xs text-muted-foreground">This turf will appear blurred on the user site.</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Turf Owner</Label>
              <Select value={formData.turf_owner_id} onValueChange={(value) => handleInputChange('turf_owner_id', value)}>
                <SelectTrigger><SelectValue placeholder="Select Owner" /></SelectTrigger>
                <SelectContent>{owners.map((owner) => (<SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Full Slot Price</Label>
                    <Input value={formData.price} onChange={(e) => handleInputChange('price', e.target.value)} type="number" placeholder="1500" />
                </div>
                <div className="space-y-2">
                    <Label>Advance (Online)</Label>
                    <Input value={formData.advance_price} onChange={(e) => handleInputChange('advance_price', e.target.value)} type="number" placeholder="500" />
                </div>
            </div>
            {Object.keys(formData).filter(k => !['sports', 'turf_owner_id', 'is_coming_soon', 'price', 'advance_price'].includes(k)).map((key) => (
              <div key={key} className="space-y-2">
                <Label className="capitalize">{key.replace('_', ' ')}</Label>
                <Input value={(formData as any)[key]} onChange={(e) => handleInputChange(key, e.target.value)} type={key === 'rating' ? 'number' : 'text'} placeholder={`Enter ${key}`} />
              </div>
            ))}
            <div className="space-y-2">
              <Label>Sports</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {sportsOptions.map((sport) => (
                  <div key={sport} className="flex items-center space-x-2">
                    <Checkbox id={`add-${sport}`} checked={formData.sports.includes(sport)} onCheckedChange={() => handleCheckboxChange(sport)} />
                    <Label htmlFor={`add-${sport}`} className="capitalize text-sm font-normal">{sport}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={addTurf}>Add Turf</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================================================================
// HELPER 2: Editable Field
// ==================================================================
function EditableField({ label, value, isEditing, onChange, type = "text" }: {
  label: string, value: any, isEditing: boolean, onChange: (value: string) => void, type?: string
}) {
  return (
    <div className="space-y-1">
      {label && <Label className="text-muted-foreground">{label}</Label>}
      {isEditing ? (
        <Input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} className="mt-1" />
      ) : (
        <p className="text-sm p-2 rounded-md bg-secondary min-h-[40px] flex items-center">{value}</p>
      )}
    </div>
  )
}

// ==================================================================
// PHASE 1: Turf Listing Grid View
// ==================================================================
function TurfListingGrid({ onSelectTurf }: { onSelectTurf: (turf: Turf, sport: string) => void }) {
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSportFilter, setSelectedSportFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);

  const fetchTurfs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("turfs").select("*").order("name");
      if (error) throw error;
      setTurfs(data || []);
    } catch (error: any) { console.error(error); }
    setLoading(false);
  };

  useEffect(() => { fetchTurfs(); }, []);

  const filteredTurfs = turfs.filter(turf => selectedSportFilter === "all" || (turf.sports && turf.sports.includes(selectedSportFilter)));

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Filter by Sport</h2>
      <ScrollArea className="w-full whitespace-nowrap rounded-md pb-4">
        <div className="flex space-x-3">
          <Button variant={selectedSportFilter === "all" ? "default" : "outline"} className="rounded-full" onClick={() => setSelectedSportFilter("all")}>All Turfs</Button>
          {sportsOptions.map(sport => (<Button key={sport} variant={selectedSportFilter === sport ? "default" : "outline"} className="rounded-full capitalize" onClick={() => setSelectedSportFilter(sport)}>{sport}</Button>))}
        </div>
      </ScrollArea>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        <Card className="overflow-hidden bg-card border-border rounded-3xl flex items-center justify-center min-h-[400px] border-2 border-dashed hover:border-primary hover:bg-secondary cursor-pointer" onClick={() => setShowAddDialog(true)}>
          <div className="text-center text-muted-foreground"><Plus className="h-16 w-16 mx-auto" /><p className="text-xl font-semibold mt-4">Add New Turf</p></div>
        </Card>
        {loading && <p>Loading turfs...</p>}
        {filteredTurfs.map((turf) => (
          <Card key={turf.id} className="overflow-hidden hover:shadow-xl transition-all hover:border-primary cursor-pointer bg-card border-border rounded-3xl" onClick={() => onSelectTurf(turf, selectedSportFilter === "all" ? turf.sports[0] || "football" : selectedSportFilter)}>
            <div className="aspect-video relative">
              <img src={turf.image || "/placeholder.svg"} alt={turf.name} className="w-full h-full object-cover" />
              {turf.rating && (<div className="absolute top-4 right-4 bg-primary rounded-full px-3 py-1.5 flex items-center shadow-md"><Star className="h-5 w-5 text-white fill-white mr-1.5" /><span className="font-medium text-base text-white">{turf.rating}</span></div>)}
              {turf.is_coming_soon && (<div className="absolute top-4 left-4 bg-orange-500 rounded-full px-3 py-1 flex items-center shadow-md"><Lock className="h-3 w-3 text-white mr-1" /><span className="text-[10px] font-bold text-white uppercase tracking-tight">Soon</span></div>)}
            </div>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-2"><h2 className="text-xl font-semibold">{turf.name}</h2><Badge variant="secondary" className="ml-2 bg-primary text-primary-foreground text-base px-3 py-1 rounded-full">₹{turf.price}</Badge></div>
              <div className="flex items-center text-muted-foreground mb-4 text-sm"><MapPin className="h-4 w-4 mr-2 flex-shrink-0" /><span>{turf.location}</span></div>
              <div className="flex flex-wrap gap-2">{(turf.sports || []).slice(0, 3).map((sport) => (<Badge key={sport} variant="outline" className="bg-secondary border-border text-xs px-3 py-1 rounded-full capitalize">{sport}</Badge>))}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <AddTurfDialog isOpen={showAddDialog} onClose={() => setShowAddDialog(false)} onTurfAdded={() => { setShowAddDialog(false); fetchTurfs(); }} />
    </div>
  );
}

// ==================================================================
// PHASE 2: Turf Detail Dashboard View (OPTIMIZED PRICING)
// ==================================================================
function TurfDetailDashboard({ turf, sport: initialSport, onBack }: { turf: Turf, sport: string, onBack: () => void }) {
  // STATE: Active Sport Context
  const [activeSport, setActiveSport] = useState(initialSport);
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlotDisplay[]>([]);
  const [bookings, setBookings] = useState<BookingType[]>([]);
  const [manualBlocks, setManualBlocks] = useState<ManualBlockType[]>([]);
  const [isBookingsLoading, setIsBookingsLoading] = useState(true);
  
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isPriceEditing, setIsPriceEditing] = useState(false);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  // Turf Details
  const [inlineData, setInlineData] = useState<Turf>(turf);
  // Base Price for Active Sport
  const [sportBasePrice, setSportBasePrice] = useState(turf.price.toString());
  const [inlineAdvancePrice, setInlineAdvancePrice] = useState(turf.advance_price?.toString() || '0');
  
  const [pricingRules, setPricingRules] = useState<PriceRule[]>([]);
  const [owners, setOwners] = useState<any[]>([]);

  // Rule Form State
  const [showAddRuleDialog, setShowAddRuleDialog] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    type: 'slot' as 'slot' | 'range' | 'day' | 'period',
    scope: 'date' as 'date' | 'recurring' | 'bulk',
    slotId: '',
    startSlot: '',
    endSlot: '',
    dayOfWeek: format(new Date(), 'i'),
    dayType: 'weekday' as 'weekday' | 'weekend',
    period: 'day' as 'day' | 'evening',
    price: '',
    notes: ''
  });

  const fetchAllTimeSlots = async () => {
    const { data } = await supabase.from("time_slots").select("*").order("start_time");
    if (data) setTimeSlots(data.map((s: any) => ({ id: s.id, time: `${s.start_time} ${s.period || ''}`, endTime: s.end_time, period: s.period || 'day' })));
  };

  const fetchPricingRules = useCallback(async () => {
    // Fetch rules strictly for the active sport
    const { data } = await supabase.from('turf_prices').select('*').eq('turf_id', turf.id).eq('sport', activeSport).order('priority', { ascending: false });
    if (data) {
        setPricingRules(data);
        // Extract sport-specific base price if it exists
        const baseRule = data.find((r: any) => r.priority === priorityMap.base && !r.day_of_week && !r.date && !r.slot_id);
        setSportBasePrice(baseRule ? baseRule.price.toString() : turf.price.toString());
    }
  }, [turf.id, activeSport, turf.price]);

  const fetchBookingsForDate = useCallback(async () => {
    setIsBookingsLoading(true);
    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    const { data } = await supabase.from("bookings").select("*, users (name)").eq("turf_id", turf.id).eq("date", formattedDate);
    if (data) {
      const newBookings: BookingType[] = [];
      const newBlocks: ManualBlockType[] = [];
      data.forEach((b: any) => {
        if (Array.isArray(b.slot)) b.slot.forEach((sid: string) => {
          if (b.status === "blocked") newBlocks.push({ id: b.id, slotId: sid, reason: b.notes });
          else newBookings.push({ id: b.id, date: b.date, slotId: sid, slot: '', customerName: b.users?.name || "N/A", status: b.status, payment_status: b.payment_status });
        });
      });
      setBookings(newBookings);
      setManualBlocks(newBlocks);
    }
    setIsBookingsLoading(false);
  }, [selectedDate, turf.id]);

  useEffect(() => { fetchAllTimeSlots(); fetchOwners(); }, []);
  useEffect(() => { fetchPricingRules(); }, [fetchPricingRules]);
  useEffect(() => { if (timeSlots.length > 0) fetchBookingsForDate(); }, [selectedDate, timeSlots, fetchBookingsForDate]);

  const fetchOwners = async () => {
    const { data } = await supabase.from('users').select('id, name').eq('role', 'owner');
    if (data) setOwners(data);
  };

  // --- OPTIMIZED PRICE CALCULATION ENGINE ---
  const slotPriceMap = useMemo(() => {
    const map: Record<string, number> = {};
    const dayOfWeek = getDay(selectedDate);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dayType = isWeekend ? 'weekend' : 'weekday';

    // Filter rules applicable to the selected date
    const applicableRules = pricingRules.filter(r => 
        (!r.date || r.date === dateStr) &&
        (r.day_of_week === null || r.day_of_week === dayOfWeek) &&
        (r.day_type === null || r.day_type === dayType)
    ).sort((a, b) => b.priority - a.priority); // Sort high priority first

    timeSlots.forEach(slot => {
        // Find the first rule that matches this slot or is a general rule
        const rule = applicableRules.find(r => 
            (r.slot_id === null || r.slot_id === slot.id) &&
            (r.period === null || r.period === slot.period)
        );
        map[slot.id] = rule ? rule.price : parseInt(sportBasePrice);
    });

    return map;
  }, [pricingRules, selectedDate, timeSlots, sportBasePrice]);

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Delete this pricing rule?")) return;
    const { error } = await supabase.from('turf_prices').delete().eq('id', id);
    if (!error) fetchPricingRules();
  };

  const handleSaveAdvancedRule = async () => {
    if (!ruleForm.price) return alert("Please enter a price");

    const basePayload: any = {
      turf_id: turf.id,
      sport: activeSport,
      price: parseFloat(ruleForm.price),
      notes: ruleForm.notes
    };

    const rulesToInsert: any[] = [];
    
    // Determine target slots
    let targetSlots: string[] = [];
    if (ruleForm.type === 'slot') targetSlots = [ruleForm.slotId];
    else if (ruleForm.type === 'range') {
        const startIdx = timeSlots.findIndex(s => s.id === ruleForm.startSlot);
        const endIdx = timeSlots.findIndex(s => s.id === ruleForm.endSlot);
        targetSlots = timeSlots.slice(Math.min(startIdx, endIdx), Math.max(startIdx, endIdx) + 1).map(s => s.id);
    }

    // Determine Priority and Logic based on Scope
    if (targetSlots.length > 0) {
      targetSlots.forEach(sid => {
        const item = { ...basePayload, slot_id: sid };
        if (ruleForm.scope === 'date') {
          item.date = format(selectedDate, "yyyy-MM-dd");
          item.priority = priorityMap.date_slot;
        } else if (ruleForm.scope === 'recurring') {
          item.day_of_week = parseInt(ruleForm.dayOfWeek);
          item.priority = priorityMap.recurring_slot;
        } else {
          item.day_type = ruleForm.dayType;
          item.priority = priorityMap.day_type_slot;
        }
        rulesToInsert.push(item);
      });
    } else {
      // Entire Day or Period
      const item = { ...basePayload };
      if (ruleForm.type === 'period') item.period = ruleForm.period;
      
      if (ruleForm.scope === 'date') {
        item.date = format(selectedDate, "yyyy-MM-dd");
        item.priority = ruleForm.type === 'period' ? priorityMap.date_only + 1 : priorityMap.date_only;
      } else if (ruleForm.scope === 'recurring') {
        item.day_of_week = parseInt(ruleForm.dayOfWeek);
        item.priority = ruleForm.type === 'period' ? priorityMap.recurring_day + 1 : priorityMap.recurring_day;
      } else {
        item.day_type = ruleForm.dayType;
        item.priority = ruleForm.type === 'period' ? priorityMap.day_type + 1 : priorityMap.day_type;
      }
      rulesToInsert.push(item);
    }

    const { error } = await supabase.from('turf_prices').insert(rulesToInsert);
    if (error) alert(error.message);
    else {
      setShowAddRuleDialog(false);
      fetchPricingRules();
      setRuleForm({ ...ruleForm, price: '', notes: '' });
    }
  };

  // --- NEW HANDLER FOR SPORTS EDITING ---
  const handleInlineSportChange = (sport: string) => {
    setInlineData((prev) => {
      const isSelected = prev.sports.includes(sport);
      const newSports = isSelected ? prev.sports.filter((s) => s !== sport) : [...prev.sports, sport];
      
      // Safety check: if active sport is removed, switch active to the first available
      if (isSelected && activeSport === sport && newSports.length > 0) {
          setActiveSport(newSports[0]);
      }
      return { ...prev, sports: newSports };
    });
  };

  const handleSaveDetails = async () => {
    // 1. Update Global Turf Details
    const updatePayload = {
      name: inlineData.name, location: inlineData.location, image: inlineData.image,
      turf_owner_id: inlineData.turf_owner_id, 
      advance_price: parseInt(inlineAdvancePrice),
      rating: parseFloat(inlineData.rating as any),
      amenities: Array.isArray(inlineData.amenities) ? inlineData.amenities : [],
      sports: inlineData.sports, allow_rescheduling: inlineData.allow_rescheduling,
      allow_refunds: inlineData.allow_refunds, booking_window_days: parseInt(inlineData.booking_window_days as any),
      reschedule_window_days: parseInt(inlineData.reschedule_window_days as any),
      is_coming_soon: inlineData.is_coming_soon 
    };
    
    // 2. Handle Sport-Specific Base Price
    const existingBaseRule = pricingRules.find(r => r.priority === priorityMap.base && !r.date && !r.day_of_week);
    if (existingBaseRule) {
        await supabase.from('turf_prices').update({ price: parseInt(sportBasePrice) }).eq('id', existingBaseRule.id);
    } else {
        await supabase.from('turf_prices').insert({
            turf_id: turf.id,
            sport: activeSport,
            price: parseInt(sportBasePrice),
            priority: priorityMap.base
        });
    }

    const { error } = await supabase.from('turfs').update(updatePayload).eq('id', turf.id);
    if (!error) { 
        setIsEditingDetails(false); 
        setIsPriceEditing(false); 
        fetchPricingRules(); 
        alert("Saved!"); 
    }
  };

  // RESTORED: Booking Window Actions
  const handleApproveWindow = async () => {
    if (!inlineData.pending_booking_window_days) return;
    const { error } = await supabase.from("turfs").update({ booking_window_days: inlineData.pending_booking_window_days, pending_booking_window_days: null }).eq("id", turf.id);
    if (!error) {
        setInlineData(prev => ({ ...prev, booking_window_days: inlineData.pending_booking_window_days as number, pending_booking_window_days: null }));
        alert("Approved!");
    }
  };

  const handleRejectWindow = async () => {
    const { error } = await supabase.from("turfs").update({ pending_booking_window_days: null }).eq("id", turf.id);
    if (!error) {
        setInlineData(prev => ({ ...prev, pending_booking_window_days: null }));
        alert("Rejected.");
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
        <div className="flex gap-2">
          <Button variant={isPriceEditing ? "default" : "outline"} onClick={() => setIsPriceEditing(!isPriceEditing)}>
             {isPriceEditing ? <XCircle className="mr-2 h-4 w-4" /> : <Settings className="mr-2 h-4 w-4" />} Pricing Mode
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsEditingDetails(!isEditingDetails)}><Edit className="h-5 w-5" /></Button>
        </div>
      </div>

      {/* --- TURF INFO CARD --- */}
      <Card className="overflow-hidden bg-card border-border rounded-3xl mb-6">
        <CardContent className="p-0 flex flex-col md:flex-row">
          <div className="w-full md:w-1/3 aspect-video md:aspect-square relative">
            <img src={inlineData.image || "/placeholder.svg"} className="w-full h-full object-cover" />
            {isEditingDetails && (
              <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/60"><Input value={inlineData.image} onChange={(e) => setInlineData({...inlineData, image: e.target.value})} placeholder="Image URL" className="bg-white" /></div>
            )}
          </div>
          <div className="flex-1 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex-1 w-full">
                  {isEditingDetails ? <Input value={inlineData.name} onChange={e => setInlineData({...inlineData, name: e.target.value})} className="text-2xl font-bold mb-2" /> : <h2 className="text-3xl font-bold mb-2">{inlineData.name}</h2>}
                  
                  {/* --- SPORT TABS --- */}
                  <Tabs value={activeSport} onValueChange={setActiveSport} className="w-full">
                    <TabsList className="bg-secondary/50 flex-wrap h-auto">
                        {inlineData.sports.map(s => (
                            <TabsTrigger key={s} value={s} className="capitalize px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                {s}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                  </Tabs>
              </div>
              {(isEditingDetails || isPriceEditing) && <Button size="sm" onClick={handleSaveDetails}>Save Changes</Button>}
            </div>

            <div className="flex items-center text-muted-foreground"><MapPin className="h-4 w-4 mr-2" /> {isEditingDetails ? <Input value={inlineData.location} onChange={e => setInlineData({...inlineData, location: e.target.value})} /> : <span>{inlineData.location}</span>}</div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1">Base Price <Badge variant="outline" className="text-[10px] h-4 px-1 py-0">{activeSport}</Badge></Label>
                {isPriceEditing ? <Input type="number" value={sportBasePrice} onChange={e => setSportBasePrice(e.target.value)} /> : <p className="text-xl font-bold text-primary">₹{sportBasePrice}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-green-600 uppercase font-bold">Advance Payment</Label>
                {isPriceEditing ? <Input type="number" value={inlineAdvancePrice} onChange={e => setInlineAdvancePrice(e.target.value)} /> : <p className="text-xl font-bold text-green-600">₹{inlineData.advance_price}</p>}
              </div>
            </div>

            {/* --- RESTORED: SPORTS EDITING UI --- */}
            {isEditingDetails && (
                <div className="pt-4 border-t border-border">
                    <Label className="text-muted-foreground mb-2 block">Manage Sports</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {sportsOptions.map(sport => (
                            <div key={sport} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`edit-${sport}`} 
                                    checked={inlineData.sports.includes(sport)} 
                                    onCheckedChange={() => handleInlineSportChange(sport)} 
                                />
                                <Label htmlFor={`edit-${sport}`} className="capitalize text-sm cursor-pointer">{sport}</Label>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- OWNER EDITING UI --- */}
            {isEditingDetails && (
                <div className="pt-4 border-t border-border">
                    <Label className="text-muted-foreground mb-2 block">Turf Owner</Label>
                    <Select 
                        value={inlineData.turf_owner_id || ''} 
                        onValueChange={(v) => setInlineData(p => ({...p, turf_owner_id: v}))}
                    >
                        <SelectTrigger><SelectValue placeholder="Select Owner" /></SelectTrigger>
                        <SelectContent>
                            {owners.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 border-t pt-4">
               <div>
                  <Label className="text-xs text-muted-foreground">Rescheduling</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {isEditingDetails ? <Checkbox checked={inlineData.allow_rescheduling} onCheckedChange={c => setInlineData({...inlineData, allow_rescheduling: !!c})} /> : null}
                    <Badge variant="outline" className={inlineData.allow_rescheduling ? "text-green-600 border-green-600" : "text-red-500"}>{inlineData.allow_rescheduling ? "Enabled" : "Disabled"}</Badge>
                  </div>
               </div>
               <div>
                  <Label className="text-xs text-muted-foreground">Refunds</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {isEditingDetails ? <Checkbox checked={inlineData.allow_refunds} onCheckedChange={c => setInlineData({...inlineData, allow_refunds: !!c})} /> : null}
                    <Badge variant="outline" className={inlineData.allow_refunds ? "text-green-600 border-green-600" : "text-red-500"}>{inlineData.allow_refunds ? "Enabled" : "Disabled"}</Badge>
                  </div>
               </div>
            </div>

            <div className="pt-4 border-t border-border mt-4">
               <Label className="text-muted-foreground">Booking Window:</Label>
               <div className="flex items-center justify-between mt-1">
                 <p className="text-sm font-medium">{inlineData.booking_window_days} Days</p>
                 {inlineData.pending_booking_window_days && (
                   <div className="flex gap-3 bg-yellow-500/10 border border-yellow-500/30 p-2 rounded-md items-center">
                     <span className="text-xs text-yellow-600">Requested: <strong>{inlineData.pending_booking_window_days} Days</strong></span>
                     <Button size="sm" className="h-6 text-xs bg-green-600" onClick={handleApproveWindow}>Approve</Button>
                     <Button size="sm" variant="destructive" className="h-6 text-xs" onClick={handleRejectWindow}>Reject</Button>
                   </div>
                 )}
               </div>
            </div>
            
            <div className="p-3 bg-orange-500/5 border border-dashed border-orange-500/20 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-orange-600 font-bold text-sm"><Lock className="h-4 w-4" /> Coming Soon Mode</div>
                {isEditingDetails ? <Checkbox checked={inlineData.is_coming_soon} onCheckedChange={c => setInlineData({...inlineData, is_coming_soon: !!c})} /> : <Badge variant="secondary">{inlineData.is_coming_soon ? "Active" : "Off"}</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- LEFT: CALENDAR & QUICK RULES --- */}
        <div className="space-y-6">
          <Card className="rounded-3xl border-border">
            <CardHeader><CardTitle className="text-lg">Select Date</CardTitle></CardHeader>
            <CardContent><Calendar mode="single" selected={selectedDate} onSelect={d => d && setSelectedDate(d)} className="rounded-md border" /></CardContent>
          </Card>

          <Card className="rounded-3xl border-border bg-primary/5">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><History className="h-5 w-5" /> Rules for {activeSport}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" onClick={() => setShowAddRuleDialog(true)}>Add Advanced Rule</Button>
              <ScrollArea className="h-[250px] pr-4">
                <div className="space-y-2">
                  {pricingRules.map(rule => (
                    <div key={rule.id} className="p-3 bg-card border rounded-xl flex justify-between items-center text-sm shadow-sm">
                      <div>
                        <p className="font-bold text-primary">₹{rule.price}</p>
                        <p className="text-[10px] text-muted-foreground uppercase leading-none mt-1">
                          {rule.priority === priorityMap.base ? "Base Price" : rule.date ? format(parseISO(rule.date), 'MMM d') : rule.day_of_week !== null ? `Every ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][rule.day_of_week]}` : rule.day_type}
                          {rule.slot_id ? ` • Slot: ${timeSlots.find(s => s.id === rule.slot_id)?.time}` : rule.period ? ` • ${rule.period}` : ''}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteRule(rule.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* --- RIGHT: SLOTS GRID --- */}
        <div className="lg:col-span-2">
          <Card className="rounded-3xl border-border h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Availability & Live Pricing</CardTitle>
                <CardDescription>{format(selectedDate, "EEEE, MMMM do")} • <span className="font-bold text-primary capitalize">{activeSport}</span></CardDescription>
              </div>
              <div className="flex items-center gap-2">
                 <Button variant={isMultiSelect ? "default" : "outline"} size="sm" onClick={() => { setIsMultiSelect(!isMultiSelect); setSelectedSlots([]); }}>
                    {isMultiSelect ? <ToggleRight className="mr-2" /> : <ToggleLeft className="mr-2" />} Multi-Select
                 </Button>
                 {isMultiSelect && selectedSlots.length > 0 && <Button size="sm" onClick={() => { setRuleForm({...ruleForm, type: 'range', scope: 'date', slotId: '', price: ''}); setShowAddRuleDialog(true); }}>Price {selectedSlots.length} Slots</Button>}
              </div>
            </CardHeader>
            <CardContent>
               <ScrollArea className="h-[600px] pr-4">
                  {['day', 'evening'].map(p => (
                    <div key={p} className="mb-8">
                       <h3 className="text-sm font-black uppercase text-muted-foreground tracking-widest mb-4 flex items-center gap-2"><Clock className="h-4 w-4" /> {p} Slots</h3>
                       <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {timeSlots.filter(ts => ts.period === p).map(slot => {
                            const isBooked = bookings.some(b => b.slotId === slot.id) || manualBlocks.some(b => b.slotId === slot.id);
                            const isActive = selectedSlots.includes(slot.id);
                            
                            // OPTIMIZED LOOKUP
                            const livePrice = slotPriceMap[slot.id];

                            return (
                              <div key={slot.id} onClick={() => !isBooked && (isMultiSelect ? setSelectedSlots(prev => prev.includes(slot.id) ? prev.filter(x => x !== slot.id) : [...prev, slot.id]) : (setRuleForm({...ruleForm, type: 'slot', slotId: slot.id, price: livePrice.toString()}), setShowAddRuleDialog(true)))} 
                                className={cn("p-4 rounded-2xl border-2 transition-all cursor-pointer relative", 
                                  isBooked ? "bg-secondary opacity-50 border-transparent grayscale" : 
                                  isActive ? "border-primary bg-primary/10 scale-95" : "bg-card hover:border-primary border-border")}>
                                  <p className="font-bold text-sm">{slot.time}</p>
                                  <p className="text-xs font-medium text-primary">₹{livePrice}</p>
                                  {isBooked && <Badge className="absolute top-1 right-1 text-[8px] h-4">Booked</Badge>}
                              </div>
                            )
                          })}
                       </div>
                    </div>
                  ))}
               </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* --- ENHANCED ADD RULE DIALOG --- */}
      <Dialog open={showAddRuleDialog} onOpenChange={setShowAddRuleDialog}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Advanced Pricing Rule</DialogTitle>
            <DialogDescription>Configure custom rates for slots, ranges, or bulk days.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label className="text-xs uppercase font-bold">Rule Target</Label>
                   <Select value={ruleForm.type} onValueChange={(v: any) => setRuleForm({...ruleForm, type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                         <SelectItem value="slot">Single Slot</SelectItem>
                         <SelectItem value="range">Happy Hour (Range)</SelectItem>
                         <SelectItem value="day">Entire Day</SelectItem>
                         <SelectItem value="period">By Period (Morning/Night)</SelectItem>
                      </SelectContent>
                   </Select>
                </div>
                <div className="space-y-2">
                   <Label className="text-xs uppercase font-bold">Scope</Label>
                   <Select value={ruleForm.scope} onValueChange={(v: any) => setRuleForm({...ruleForm, scope: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                         <SelectItem value="date">Specific Date</SelectItem>
                         <SelectItem value="recurring">Weekly (Repeat)</SelectItem>
                         <SelectItem value="bulk">Bulk (Wkday/Wkend)</SelectItem>
                      </SelectContent>
                   </Select>
                </div>
             </div>

             {ruleForm.type === 'range' && (
                <div className="grid grid-cols-2 gap-2">
                   <Select onValueChange={v => setRuleForm({...ruleForm, startSlot: v})}><SelectTrigger><SelectValue placeholder="From" /></SelectTrigger><SelectContent>{timeSlots.map(s => <SelectItem key={s.id} value={s.id}>{s.time}</SelectItem>)}</SelectContent></Select>
                   <Select onValueChange={v => setRuleForm({...ruleForm, endSlot: v})}><SelectTrigger><SelectValue placeholder="To" /></SelectTrigger><SelectContent>{timeSlots.map(s => <SelectItem key={s.id} value={s.id}>{s.time}</SelectItem>)}</SelectContent></Select>
                </div>
             )}

             {ruleForm.scope === 'recurring' && (
                <Select value={ruleForm.dayOfWeek} onValueChange={v => setRuleForm({...ruleForm, dayOfWeek: v})}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => <SelectItem key={d} value={i.toString()}>{d}</SelectItem>)}</SelectContent>
                </Select>
             )}

             {ruleForm.scope === 'bulk' && (
                <Select value={ruleForm.dayType} onValueChange={(v: any) => setRuleForm({...ruleForm, dayType: v})}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent><SelectItem value="weekday">Weekdays (Mon-Fri)</SelectItem><SelectItem value="weekend">Weekends (Sat-Sun)</SelectItem></SelectContent>
                </Select>
             )}

             <div className="space-y-2">
                <Label className="text-primary font-bold">Price Override (₹)</Label>
                <Input type="number" placeholder="Enter custom price" value={ruleForm.price} onChange={e => setRuleForm({...ruleForm, price: e.target.value})} className="text-lg font-bold" />
             </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowAddRuleDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveAdvancedRule} className="flex-1">Apply Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================================================================
// --- Main Component Export ---
// ==================================================================
export default function TurfsTab() {
  const [selectedTurf, setSelectedTurf] = useState<Turf | null>(null);
  const [selectedSport, setSelectedSport] = useState<string>("football");

  if (selectedTurf) {
    return <TurfDetailDashboard turf={selectedTurf} sport={selectedSport} onBack={() => setSelectedTurf(null)} />;
  } else {
    return <TurfListingGrid onSelectTurf={(turf, sport) => { setSelectedTurf(turf); setSelectedSport(sport); }} />;
  }
}