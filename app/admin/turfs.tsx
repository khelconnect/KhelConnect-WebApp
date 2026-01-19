"use client";

import React, { useEffect, useState, useCallback } from "react";
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
import {
  Plus, Edit, ArrowLeft, MapPin, Star, Clock, XCircle, CheckCircle, RefreshCw, Trash2, Settings, ToggleLeft, ToggleRight, Info, AlertCircle, Lock
} from "lucide-react";
import { format, getDay } from "date-fns";
import { cn } from "@/lib/utils";

// --- TYPES ---
const sportsOptions = [
  'football', 'cricket', 'badminton', 'pickleball',
  'basketball', 'table Tennis', 'bowling',
];

interface Turf {
  id: string;
  name: string;
  location: string;
  image: string;
  price: number;
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
  is_coming_soon: boolean; // Added
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
  id?: string;
  turf_id: string;
  sport: string;
  price: number;
  priority: number;
  slot_id?: string;
  day_of_week?: number;
  date?: string;
  period?: string;
  start_time?: string;
  end_time?: string;
  day_type?: 'weekday' | 'weekend';
}

// ==================================================================
// HELPER 1: Add Turf Dialog
// ==================================================================
function AddTurfDialog({ isOpen, onClose, onTurfAdded }: { isOpen: boolean, onClose: () => void, onTurfAdded: () => void }) {
  const [formData, setFormData] = useState({
    name: '', location: '', price: '', amenities: '',
    distance: '', image: '', rating: '', sports: [] as string[], turf_owner_id: '',
    is_coming_soon: false, // Added
  });
  const [owners, setOwners] = useState<any[]>([]);

  useEffect(() => {
    async function fetchOwners() {
      const { data } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'owner');
      setOwners(data || []);
    }
    fetchOwners();
  }, []);

  const handleInputChange = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
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
      rating: parseFloat(formData.rating) || null,
      amenities: formData.amenities.split(',').map((a) => a.trim()).filter(Boolean),
      sports: formData.sports,
      turf_owner_id: formData.turf_owner_id || null,
      allow_rescheduling: true,
      allow_refunds: true,
      booking_window_days: 30,
      reschedule_window_days: 30,
      is_coming_soon: formData.is_coming_soon // Added
    };
    try {
      const { error } = await supabase.from('turfs').insert([payload]);
      if (error) throw error;
      setFormData({
        name: '', location: '', price: '', amenities: '',
        distance: '', image: '', rating: '', sports: [], turf_owner_id: '',
        is_coming_soon: false,
      });
      onTurfAdded();
    } catch (error: any) {
      console.error('Add turf error:', error);
      alert("Error adding turf: " + error.message);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Add New Turf</DialogTitle></DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-4 p-4">
            {/* COMING SOON TOGGLE */}
            <div className="flex items-center space-x-2 p-3 rounded-xl border border-orange-500/20 bg-orange-500/5">
              <Checkbox 
                id="add-is-coming-soon" 
                checked={formData.is_coming_soon}
                onCheckedChange={(checked) => handleInputChange('is_coming_soon', checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <label htmlFor="add-is-coming-soon" className="text-sm font-bold leading-none text-orange-600 flex items-center gap-2">
                  <Lock className="h-3 w-3" /> Coming Soon Mode
                </label>
                <p className="text-xs text-muted-foreground">This turf will appear blurred on the user site.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Turf Owner</Label>
              <Select
                value={formData.turf_owner_id}
                onValueChange={(value) => handleInputChange('turf_owner_id', value)}
              >
                <SelectTrigger><SelectValue placeholder="Select Owner" /></SelectTrigger>
                <SelectContent>
                  {owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {Object.keys(formData).filter(k => k !== 'sports' && k !== 'turf_owner_id' && k !== 'is_coming_soon').map((key) => (
              <div key={key} className="space-y-2">
                <Label className="capitalize">{key.replace('_', ' ')}</Label>
                <Input
                  value={(formData as any)[key]}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  type={key === 'price' || key === 'rating' ? 'number' : 'text'}
                  placeholder={`Enter ${key.replace('_', ' ')}`}
                />
              </div>
            ))}
            
            <div className="space-y-2">
              <Label>Sports</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {sportsOptions.map((sport) => (
                  <div key={sport} className="flex items-center space-x-2">
                    <Checkbox
                      id={`add-${sport}`}
                      checked={formData.sports.includes(sport)}
                      onCheckedChange={() => handleCheckboxChange(sport)}
                    />
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
  label: string,
  value: any,
  isEditing: boolean,
  onChange: (value: string) => void,
  type?: string
}) {
  return (
    <div className="space-y-1">
      {label && <Label className="text-muted-foreground">{label}</Label>}
      {isEditing ? (
        <Input
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1"
        />
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
    } catch (error: any) {
      console.error("Fetch turfs error:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTurfs();
  }, []);

  const filteredTurfs = turfs.filter(turf =>
    selectedSportFilter === "all" || (turf.sports && turf.sports.includes(selectedSportFilter))
  );

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Filter by Sport</h2>
      <ScrollArea className="w-full whitespace-nowrap rounded-md pb-4">
        <div className="flex space-x-3">
          <Button
            variant={selectedSportFilter === "all" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setSelectedSportFilter("all")}
          >
            All Turfs
          </Button>
          {sportsOptions.map(sport => (
            <Button
              key={sport}
              variant={selectedSportFilter === sport ? "default" : "outline"}
              className="rounded-full capitalize"
              onClick={() => setSelectedSportFilter(sport)}
            >
              {sport}
            </Button>
          ))}
        </div>
      </ScrollArea>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        <Card
          className="overflow-hidden bg-card border-border rounded-3xl flex items-center justify-center min-h-[400px] border-2 border-dashed hover:border-primary hover:bg-secondary cursor-pointer"
          onClick={() => setShowAddDialog(true)}
        >
          <div className="text-center text-muted-foreground">
            <Plus className="h-16 w-16 mx-auto" />
            <p className="text-xl font-semibold mt-4">Add New Turf</p>
          </div>
        </Card>

        {loading && <p>Loading turfs...</p>}
        
        {filteredTurfs.map((turf) => (
          <Card
            key={turf.id}
            className="overflow-hidden hover:shadow-xl transition-all hover:border-primary cursor-pointer bg-card border-border rounded-3xl"
            onClick={() => {
              const sportToPass = selectedSportFilter === "all" 
                ? turf.sports[0] || "football" 
                : selectedSportFilter;
              onSelectTurf(turf, sportToPass);
            }}
          >
            <div className="aspect-video relative">
              <img src={turf.image || "/placeholder.svg"} alt={turf.name} className="w-full h-full object-cover" />
              {turf.rating && (
                <div className="absolute top-4 right-4 bg-primary rounded-full px-3 py-1.5 flex items-center shadow-md">
                  <Star className="h-5 w-5 text-white fill-white mr-1.5" />
                  <span className="font-medium text-base text-white">{turf.rating}</span>
                </div>
              )}
              {turf.is_coming_soon && (
                <div className="absolute top-4 left-4 bg-orange-500 rounded-full px-3 py-1 flex items-center shadow-md">
                  <Lock className="h-3 w-3 text-white mr-1" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-tight">Soon</span>
                </div>
              )}
            </div>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-semibold">{turf.name}</h2>
                <Badge variant="secondary" className="ml-2 bg-primary text-primary-foreground text-base px-3 py-1 rounded-full">
                  ₹{turf.price}
                </Badge>
              </div>
              <div className="flex items-center text-muted-foreground mb-4 text-sm">
                <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>{turf.location}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(turf.sports || []).slice(0, 3).map((sport) => (
                  <Badge key={sport} variant="outline" className="bg-secondary border-border text-xs px-3 py-1 rounded-full capitalize">
                    {sport}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <AddTurfDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onTurfAdded={() => {
          setShowAddDialog(false);
          fetchTurfs();
        }}
      />
    </div>
  );
}

// ==================================================================
// PHASE 2: Turf Detail Dashboard View
// ==================================================================
function TurfDetailDashboard({ turf, sport, onBack }: { turf: Turf, sport: string, onBack: () => void }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlotDisplay[]>([]);
  const [bookings, setBookings] = useState<BookingType[]>([]);
  const [manualBlocks, setManualBlocks] = useState<ManualBlockType[]>([]);
  const [isBookingsLoading, setIsBookingsLoading] = useState(true);
  
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [inlineData, setInlineData] = useState<Turf>(turf);
  
  const [isPriceEditing, setIsPriceEditing] = useState(false);
  const [inlineBasePrice, setInlineBasePrice] = useState(turf.price.toString());
  
  const [dayPrice, setDayPrice] = useState("");
  const [periodPrices, setPeriodPrices] = useState({ day: "", evening: "" });
  const [weekdayPrice, setWeekdayPrice] = useState("");
  const [weekendPrice, setWeekendPrice] = useState("");
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  
  const [showSlotPriceDialog, setShowSlotPriceDialog] = useState(false);
  const [showDayPriceDialog, setShowDayPriceDialog] = useState(false);
  const [showPeriodPriceDialog, setShowPeriodPriceDialog] = useState(false);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [currentPriceChange, setCurrentPriceChange] = useState<any>(null);
  const [conflictingRule, setConflictingRule] = useState<PriceRule | null>(null);
  
  const [owners, setOwners] = useState<any[]>([]);
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [ruleForm, setRuleForm] = useState<any>({ ruleType: 'slot', dayType: 'weekday', priority: '1', price: '' });

  const fetchAllTimeSlots = async () => {
    try {
      const { data, error } = await supabase.from("time_slots").select("*").order("start_time");
      if (error) throw error;
      const formattedSlots = (data || []).map((slot: any) => ({
        id: slot.id, time: `${slot.start_time}${slot.period ? ` ${slot.period}` : ""}`, endTime: slot.end_time, period: slot.period || 'day'
      }));
      setTimeSlots(formattedSlots);
    } catch (error: any) { console.error("Fetch slots error:", error); }
  };
  
  const fetchOwners = async () => {
    try {
      const { data, error } = await supabase.from('users').select('id, name').eq('role', 'owner');
      if (error) throw error;
      setOwners(data || []);
    } catch (error: any) { console.error("Fetch owners error:", error); }
  };

  const fetchBookingsForDate = useCallback(async () => {
    if (!turf || !selectedDate) return;
    setIsBookingsLoading(true);
    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    try {
      const { data, error } = await supabase.from("bookings").select("*, users (name)").eq("turf_id", turf.id).eq("date", formattedDate);
      if (error) throw error;
      const newBookings: BookingType[] = [];
      const newBlocks: ManualBlockType[] = [];
      data.forEach((b: any) => {
        if (Array.isArray(b.slot)) {
          b.slot.forEach((slotId: string) => {
            const timeSlot = timeSlots.find(ts => ts.id === slotId);
            if (b.status === "blocked") { newBlocks.push({ id: b.id, slotId: slotId, reason: b.notes || b.sport }); }
            else { newBookings.push({ id: b.id, date: b.date, slot: timeSlot ? timeSlot.time : "Unknown", slotId: slotId, customerName: b.users?.name || "N/A", status: b.status, payment_status: b.payment_status }); }
          });
        }
      });
      setBookings(newBookings);
      setManualBlocks(newBlocks);
    } catch (error: any) { console.error("Error fetching bookings:", error); }
    finally { setIsBookingsLoading(false); }
  }, [selectedDate, turf, timeSlots]);

  const fetchPricingRules = async (sportToFetch: string) => {
    if (!sportToFetch) { setPricingRules([]); return; }
    try {
      const { data, error } = await supabase.from('turf_prices').select('*').eq('turf_id', turf.id).eq('sport', sportToFetch).order('priority', { ascending: false });
      if (error) throw error;
      setPricingRules(data || []);
    } catch (error: any) { console.error("Fetch rules error:", error); }
  };
  
  useEffect(() => { fetchAllTimeSlots(); fetchOwners(); }, []);
  useEffect(() => { if (timeSlots.length > 0) fetchBookingsForDate(); }, [selectedDate, timeSlots, fetchBookingsForDate]);
  useEffect(() => { fetchPricingRules(sport); }, [sport, turf.id]);

  const handleSaveDetails = async () => {
    const updatePayload = {
      name: inlineData.name,
      location: inlineData.location,
      image: inlineData.image,
      turf_owner_id: inlineData.turf_owner_id,
      price: parseInt(inlineBasePrice),
      rating: parseFloat(inlineData.rating as any) || null,
      amenities: Array.isArray(inlineData.amenities) ? inlineData.amenities : (inlineData.amenities as string).split(',').map(s => s.trim()),
      sports: inlineData.sports, 
      allow_rescheduling: inlineData.allow_rescheduling,
      allow_refunds: inlineData.allow_refunds,
      booking_window_days: parseInt(inlineData.booking_window_days as any) || 30,
      reschedule_window_days: parseInt(inlineData.reschedule_window_days as any) || 30,
      is_coming_soon: inlineData.is_coming_soon // Added
    };
    try {
      const { data, error } = await supabase.from('turfs').update(updatePayload).eq('id', turf.id).select().single();
      if (error) throw error;
      setInlineData(data); 
      setIsEditingDetails(false);
      setIsPriceEditing(false);
      alert("Details saved successfully!");
    } catch (error: any) { alert("Error saving details: " + error.message); }
  };

  const handleInlineCheckboxChange = (sport: string) => {
    setInlineData((prev) => {
      const isSelected = prev.sports.includes(sport);
      return { ...prev, sports: isSelected ? prev.sports.filter((s) => s !== sport) : [...prev.sports, sport] };
    });
  };

  const handleApproveWindow = async () => {
    if (!inlineData.pending_booking_window_days) return;
    try {
      const { error } = await supabase.from("turfs").update({ booking_window_days: inlineData.pending_booking_window_days, pending_booking_window_days: null }).eq("id", turf.id);
      if (error) throw error;
      setInlineData(prev => ({ ...prev, booking_window_days: inlineData.pending_booking_window_days as number, pending_booking_window_days: null }));
      alert(`Approved!`);
    } catch (e: any) { alert(e.message); }
  };

  const handleRejectWindow = async () => {
    try {
      const { error } = await supabase.from("turfs").update({ pending_booking_window_days: null }).eq("id", turf.id);
      if (error) throw error;
      setInlineData(prev => ({ ...prev, pending_booking_window_days: null }));
    } catch (e: any) { alert(e.message); }
  };

  const findDirectConflict = async (rule: Omit<PriceRule, 'id' | 'price'>): Promise<PriceRule | null> => {
    let query = supabase.from('turf_prices').select('*').eq('turf_id', rule.turf_id).eq('sport', rule.sport).eq('priority', rule.priority);
    if (rule.date) query = query.eq('date', rule.date); else query = query.is('date', null);
    if (rule.day_of_week) query = query.eq('day_of_week', rule.day_of_week); else query = query.is('day_of_week', null);
    if (rule.slot_id) query = query.eq('slot_id', rule.slot_id); else query = query.is('slot_id', null);
    if (rule.period) query = query.eq('period', rule.period); else query = query.is('period', null);
    if (rule.day_type) query = query.eq('day_type', rule.day_type); else query = query.is('day_type', null);
    try {
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    } catch (error: any) { return null; }
  };
  
  const savePriceRule = async (rule: Omit<PriceRule, 'id'>) => {
    const conflict = await findDirectConflict(rule);
    if (conflict) {
      setConflictingRule(conflict);
      setCurrentPriceChange({ ...rule, id: conflict.id });
      setShowConflictDialog(true);
      return;
    }
    const { error } = await supabase.from('turf_prices').insert(rule);
    if (error) throw error;
  };

  const handleOverrideRule = async () => {
    if (!conflictingRule || !currentPriceChange) return;
    try {
      const { error } = await supabase.from('turf_prices').update({ price: currentPriceChange.price }).eq('id', conflictingRule.id);
      if (error) throw error;
      alert("Rule overridden!");
      resetPriceDialogs();
      fetchPricingRules(sport);
    } catch (error: any) { alert(error.message); }
  };
  
  const resetPriceDialogs = () => {
    setShowSlotPriceDialog(false); setShowDayPriceDialog(false); setShowApplyDialog(false);
    setShowPeriodPriceDialog(false); setShowConflictDialog(false);
    setCurrentPriceChange(null); setConflictingRule(null); setSelectedSlots([]); setDayPrice("");
  };

  const handleSlotClick = (slotId: string) => {
    if (!isPriceEditing) return;
    if (isMultiSelect) { setSelectedSlots(prev => prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]); }
    else { setCurrentPriceChange({ type: 'slot', slots: [slotId], price: '' }); setShowSlotPriceDialog(true); }
  };

  const handleOpenMultiSlotDialog = () => {
    if (selectedSlots.length === 0) return;
    setCurrentPriceChange({ type: 'slot', slots: selectedSlots, price: '' });
    setShowSlotPriceDialog(true);
  };
  
  const handleSaveSlotPriceRule = async (applyType: 'date_only' | 'every_day' | 'weekday' | 'weekend') => {
    const { slots, price } = currentPriceChange;
    const rulesToInsert = slots.map((slotId: string) => ({
      turf_id: turf.id, sport, price: parseFloat(price), slot_id: slotId,
      date: applyType === 'date_only' ? format(selectedDate, "yyyy-MM-dd") : null,
      day_type: (applyType === 'weekday' || applyType === 'weekend') ? applyType : null,
      priority: applyType === 'date_only' ? 30 : (applyType === 'every_day' ? 20 : 25)
    }));
    try { for (const rule of rulesToInsert) await savePriceRule(rule); resetPriceDialogs(); fetchPricingRules(sport); }
    catch (error: any) { alert(error.message); }
  };
  
  const handleSaveDayPriceRule = async (applyType: 'date_only' | 'every_day_of_week') => {
    const { price, date } = currentPriceChange;
    const rule = { 
      turf_id: turf.id, sport, price: parseFloat(price),
      date: applyType === 'date_only' ? format(date, "yyyy-MM-dd") : null,
      day_of_week: applyType === 'every_day_of_week' ? getDay(date) : null,
      priority: applyType === 'date_only' ? 15 : 10
    };
    try { await savePriceRule(rule); resetPriceDialogs(); fetchPricingRules(sport); } catch (e: any) { alert(e.message); }
  };

  const handleSetDayPrice = () => {
    if (!dayPrice) return;
    setCurrentPriceChange({ type: 'day', price: dayPrice, date: selectedDate });
    setShowDayPriceDialog(true);
  };
  
  const handleSaveBulkPrice = async (dayType: 'weekday' | 'weekend') => {
    const price = dayType === 'weekday' ? weekdayPrice : weekendPrice;
    if (!price) return;
    const rule = { turf_id: turf.id, sport, price: parseFloat(price), day_type: dayType, priority: 1 };
    try { await savePriceRule(rule); fetchPricingRules(sport); } catch(e: any) { alert(e.message); }
  };

  const handleSetPeriodPrice = (period: 'day' | 'evening') => {
    const price = periodPrices[period];
    if (!price) return;
    setCurrentPriceChange({ type: 'period', price, period });
    setShowPeriodPriceDialog(true);
  };
  
  const handleSavePeriodPriceRule = async (applyType: 'date_only' | 'every_day') => {
    const { price, period } = currentPriceChange;
    const rule = { 
      turf_id: turf.id, sport, price: parseFloat(price), period,
      date: applyType === 'date_only' ? format(selectedDate, "yyyy-MM-dd") : null,
      priority: applyType === 'date_only' ? 18 : 5
    };
    try { await savePriceRule(rule); resetPriceDialogs(); fetchPricingRules(sport); } catch(e: any) { alert(e.message); }
  };

  const handleSaveOldRule = async () => {
    const payload: any = { turf_id: turf.id, sport, price: parseFloat(ruleForm.price || '0'), priority: parseInt(ruleForm.priority || '1') };
    switch (ruleForm.ruleType) {
      case 'slot': payload.slot_id = ruleForm.slotId; break;
      case 'day_of_week': payload.day_of_week = parseInt(ruleForm.dayOfWeek!); break;
      case 'date': payload.date = ruleForm.date; break;
      case 'period': payload.period = ruleForm.period; break;
    }
    try { await savePriceRule(payload); fetchPricingRules(sport); setShowRuleDialog(false); } catch(e: any) { alert(e.message); }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back to All Turfs</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsPriceEditing(p => !p)}>
            {isPriceEditing ? <XCircle className="mr-2 h-4 w-4" /> : <Settings className="mr-2 h-4 w-4" />} {isPriceEditing ? "Cancel Pricing" : "Edit Pricing"}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsEditingDetails(p => !p)}><Edit className="h-5 w-5" /></Button>
        </div>
      </div>

      <Card className="overflow-hidden bg-card border-border rounded-3xl mb-6">
        <CardContent className="p-0 flex flex-col md:flex-row">
          <div className="w-full md:w-1/3 aspect-video md:aspect-square relative">
            <img src={inlineData.image || "/placeholder.svg"} alt={inlineData.name} className="w-full h-full object-cover rounded-t-3xl md:rounded-l-3xl md:rounded-t-none" />
            {isEditingDetails && (
              <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/60 rounded-t-3xl md:rounded-l-3xl md:rounded-t-none">
                <Input value={inlineData.image || ''} onChange={(e) => setInlineData(p => ({...p, image: e.target.value}))} placeholder="Image URL" className="bg-white/90 text-black placeholder:text-gray-500" />
              </div>
            )}
          </div>
          <div className="flex-1 p-6 space-y-4 relative">
            <div className="flex justify-between items-start">
              {!isEditingDetails ? (
                <h2 className="text-3xl font-bold">{inlineData.name}{inlineData.rating && <span className="ml-3 text-lg font-semibold text-primary inline-flex items-center"><Star className="h-4 w-4 fill-primary mr-1" />{inlineData.rating}</span>}</h2>
              ) : (
                <Input value={inlineData.name} onChange={(e) => setInlineData(p => ({...p, name: e.target.value}))} className="text-3xl font-bold w-full md:w-2/3" />
              )}
              {isEditingDetails && <Button size="sm" onClick={handleSaveDetails} className="ml-auto">Save Details</Button>}
            </div>

            <div className="flex items-center text-muted-foreground"><MapPin className="h-4 w-4 mr-2" />{!isEditingDetails ? <p>{inlineData.location}</p> : <Input value={inlineData.location} onChange={(e) => setInlineData(p => ({...p, location: e.target.value}))} className="flex-1" />}</div>

            <div className="flex items-center text-muted-foreground"><span className="text-xl mr-2">₹</span>{!isPriceEditing ? <p className="text-xl font-bold text-primary">{inlineData.price} <span className="text-sm font-normal text-muted-foreground">base price / 30 min</span></p> : <Input type="number" value={inlineBasePrice} onChange={(e) => setInlineBasePrice(e.target.value)} className="w-32 text-xl" />}</div>

            <EditableField label="Amenities" value={Array.isArray(inlineData.amenities) ? inlineData.amenities.join(', ') : ''} isEditing={isEditingDetails} onChange={(v) => setInlineData(p => ({...p, amenities: v.split(',').map(s => s.trim())}))} />

            <div className="space-y-1">
              <Label className="text-muted-foreground">Sports:</Label>
              {isEditingDetails ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 border p-4 rounded-md">
                  {sportsOptions.map((s) => (
                    <div key={s} className="flex items-center space-x-2">
                      <Checkbox id={`edit-${s}`} checked={inlineData.sports.includes(s)} onCheckedChange={() => handleInlineCheckboxChange(s)} />
                      <Label htmlFor={`edit-${s}`} className="text-sm font-normal capitalize">{s}</Label>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm">{inlineData.sports?.join(', ')}</p>}
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground">Turf Owner:</Label>
              {isEditingDetails ? (
                <Select value={inlineData.turf_owner_id || ''} onValueChange={(v) => setInlineData(p => ({...p, turf_owner_id: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select Owner" /></SelectTrigger>
                  <SelectContent>{owners.map((o) => (<SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>))}</SelectContent>
                </Select>
              ) : <p className="text-sm font-medium">{owners.find(o => o.id === inlineData.turf_owner_id)?.name || 'N/A'}</p>}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
               <div className="flex flex-col space-y-2">
                 <div className="flex flex-col space-y-1">
                   <Label className="text-muted-foreground">Rescheduling</Label>
                   {isEditingDetails ? (
                     <div className="flex items-center space-x-2 mt-1">
                       <Checkbox id="allow_rescheduling" checked={inlineData.allow_rescheduling} onCheckedChange={(c) => setInlineData(p => ({...p, allow_rescheduling: c as boolean}))} />
                       <label htmlFor="allow_rescheduling" className="text-sm">Allow Users to Reschedule</label>
                     </div>
                   ) : <div className="mt-1">{inlineData.allow_rescheduling ? <Badge variant="outline" className="text-green-600 border-green-600">Allowed</Badge> : <Badge variant="outline" className="text-red-500 border-red-500">Not Allowed</Badge>}</div>}
                 </div>
                 <div className="flex flex-col space-y-1">
                    <EditableField label="Reschedule Window (Days)" value={inlineData.reschedule_window_days} isEditing={isEditingDetails} type="number" onChange={(v) => setInlineData(p => ({...p, reschedule_window_days: parseInt(v)}))} />
                 </div>
               </div>

               <div className="flex flex-col space-y-2">
                 <div className="flex flex-col space-y-1">
                   <Label className="text-muted-foreground">Cancellation & Refunds</Label>
                   {isEditingDetails ? (
                     <div className="flex items-center space-x-2 mt-1">
                       <Checkbox id="allow_refunds" checked={inlineData.allow_refunds} onCheckedChange={(c) => setInlineData(p => ({...p, allow_refunds: c as boolean}))} />
                       <label htmlFor="allow_refunds" className="text-sm">Allow Refunds</label>
                     </div>
                   ) : <div className="mt-1">{inlineData.allow_refunds ? <Badge variant="outline" className="text-green-600 border-green-600">Refunds Active</Badge> : <Badge variant="outline" className="text-orange-500 border-orange-500">No Refunds</Badge>}</div>}
                 </div>
                 <div className="flex flex-col space-y-1">
                    <EditableField label="Booking Window (Days)" value={inlineData.booking_window_days} isEditing={isEditingDetails} type="number" onChange={(v) => setInlineData(p => ({...p, booking_window_days: parseInt(v)}))} />
                 </div>
               </div>

               {/* COMING SOON STATUS TOGGLE */}
               <div className="flex flex-col space-y-2 col-span-full mt-4 p-4 border-2 border-dashed border-orange-500/30 rounded-2xl bg-orange-500/5">
                 <div className="flex flex-col space-y-1">
                   <Label className="text-orange-600 font-bold flex items-center gap-2">
                     <Lock className="h-4 w-4" /> Coming Soon Mode
                   </Label>
                   <p className="text-xs text-muted-foreground">Blur the turf card on the user site to signal a future launch.</p>
                   {isEditingDetails ? (
                     <div className="flex items-center space-x-2 mt-2">
                       <Checkbox 
                         id="is_coming_soon" 
                         checked={inlineData.is_coming_soon} 
                         onCheckedChange={(checked) => setInlineData(p => ({...p, is_coming_soon: checked as boolean}))}
                       />
                       <label htmlFor="is_coming_soon" className="text-sm font-medium">Enable Coming Soon Overlay</label>
                     </div>
                   ) : (
                     <div className="mt-1">
                       {inlineData.is_coming_soon ? (
                         <Badge className="bg-orange-500 text-white border-orange-600">Coming Soon Active</Badge>
                       ) : (
                         <Badge variant="outline" className="text-muted-foreground border-border">Standard Mode</Badge>
                       )}
                     </div>
                   )}
                 </div>
               </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-card border-border rounded-3xl">
            <CardHeader><CardTitle>Select Date</CardTitle></CardHeader>
            <CardContent>
              <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} className="rounded-md" />
              {isPriceEditing && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <Label>Price for {format(selectedDate, "PPP")}</Label>
                  <div className="flex gap-2"><Input type="number" placeholder="₹" value={dayPrice} onChange={(e) => setDayPrice(e.target.value)} /><Button onClick={handleSetDayPrice} disabled={!dayPrice}>Set</Button></div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {isPriceEditing ? (
            <Card className="bg-card border-border rounded-3xl">
              <CardHeader><CardTitle>Set Bulk Prices ({sport})</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4"><div className="flex-1 space-y-2"><Label>Weekday</Label><Input type="number" value={weekdayPrice} onChange={e => setWeekdayPrice(e.target.value)} /></div><Button size="sm" className="self-end" onClick={() => handleSaveBulkPrice('weekday')}>Apply</Button></div>
                <div className="flex gap-4"><div className="flex-1 space-y-2"><Label>Weekend</Label><Input type="number" value={weekendPrice} onChange={e => setWeekendPrice(e.target.value)} /></div><Button size="sm" className="self-end" onClick={() => handleSaveBulkPrice('weekend')}>Apply</Button></div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border rounded-3xl">
              <CardHeader><CardTitle>Pricing Rules ({sport})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button onClick={() => setShowRuleDialog(true)}>Add Rule</Button>
                  <Select><SelectTrigger><SelectValue placeholder={`${pricingRules.length} rules active.`} /></SelectTrigger><SelectContent>{pricingRules.map(r => (<SelectItem key={r.id} value={r.id} className="text-xs">₹{r.price} - {r.date || r.day_type || 'General'}</SelectItem>))}</SelectContent></Select>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-card border-border rounded-3xl">
            <CardHeader>
              <CardTitle>Slots for {format(selectedDate, "PPP")}</CardTitle>
              {isPriceEditing && (
                <div className="flex justify-between items-center pt-2">
                  <Button size="sm" variant={isMultiSelect ? "default" : "outline"} onClick={() => { setIsMultiSelect(!isMultiSelect); setSelectedSlots([]); }}>
                    {isMultiSelect ? <ToggleRight className="mr-2 h-4 w-4" /> : <ToggleLeft className="mr-2 h-4 w-4" />} Multi-Select
                  </Button>
                  {isMultiSelect && <Button size="sm" onClick={handleOpenMultiSlotDialog} disabled={selectedSlots.length === 0}>Set for {selectedSlots.length} Slots</Button>}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {isBookingsLoading ? <p>Loading...</p> : (
                <ScrollArea className="h-[400px]">
                  {['day', 'evening'].map(p => (
                    <div key={p} className="mb-6">
                      <h3 className="text-lg font-semibold capitalize mb-2">{p}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {timeSlots.filter(s => s.period === p).map((slot) => {
                          const isBooked = bookings.some(b => b.slotId === slot.id) || manualBlocks.some(b => b.slotId === slot.id);
                          return (
                            <Card key={slot.id} onClick={() => !isBooked && handleSlotClick(slot.id)} className={cn("border transition-all cursor-pointer", isBooked ? "bg-red-500/10 opacity-50" : (selectedSlots.includes(slot.id) ? "bg-primary/20 border-primary" : "bg-green-500/10 border-green-500"))}>
                              <CardContent className="p-4"><p className="font-medium">{slot.time}</p><p className="text-xs">{isBooked ? "Unavailable" : "Available"}</p></CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}><DialogContent><DialogHeader><DialogTitle>Add Pricing Rule</DialogTitle></DialogHeader><div className="space-y-4"><Select onValueChange={(v) => setRuleForm({...ruleForm, ruleType: v})}><SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="slot">Slot</SelectItem><SelectItem value="date">Date</SelectItem><SelectItem value="period">Period</SelectItem></SelectContent></Select><Input type="number" placeholder="Price" onChange={e => setRuleForm({...ruleForm, price: e.target.value})} /><Input type="number" placeholder="Priority" onChange={e => setRuleForm({...ruleForm, priority: e.target.value})} /></div><DialogFooter><Button onClick={handleSaveOldRule}>Save</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={showSlotPriceDialog} onOpenChange={setShowSlotPriceDialog}><DialogContent><DialogHeader><DialogTitle>Set Slot Price</DialogTitle></DialogHeader><Input type="number" placeholder="₹" onChange={(e) => setCurrentPriceChange({...currentPriceChange, price: e.target.value})} /><DialogFooter><Button onClick={() => setShowApplyDialog(true)}>Next</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}><DialogContent><DialogHeader><DialogTitle>Scope</DialogTitle></DialogHeader><div className="flex flex-col gap-2"><Button onClick={() => handleSaveSlotPriceRule('date_only')}>Today</Button><Button variant="outline" onClick={() => handleSaveSlotPriceRule('every_day')}>Every Day</Button><Button variant="outline" onClick={() => handleSaveSlotPriceRule('weekday')}>Weekdays</Button><Button variant="outline" onClick={() => handleSaveSlotPriceRule('weekend')}>Weekends</Button></div></DialogContent></Dialog>
      <Dialog open={showDayPriceDialog} onOpenChange={setShowDayPriceDialog}><DialogContent><DialogHeader><DialogTitle>Apply Day Price</DialogTitle></DialogHeader><div className="flex flex-col gap-2"><Button onClick={() => handleSaveDayPriceRule('date_only')}>Today Only</Button><Button variant="outline" onClick={() => handleSaveDayPriceRule('every_day_of_week')}>Every {format(selectedDate, 'EEEE')}</Button></div></DialogContent></Dialog>
      <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}><DialogContent><DialogHeader><DialogTitle>Override Rule?</DialogTitle></DialogHeader><p>A rule already exists for this scope. Override it?</p><DialogFooter><Button variant="ghost" onClick={resetPriceDialogs}>Cancel</Button><Button onClick={handleOverrideRule}>Override</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={showPeriodPriceDialog} onOpenChange={setShowPeriodPriceDialog}><DialogContent><DialogHeader><DialogTitle>Apply Period Price</DialogTitle></DialogHeader><div className="flex flex-col gap-2"><Button onClick={() => handleSavePeriodPriceRule('date_only')}>Today Only</Button><Button variant="outline" onClick={() => handleSavePeriodPriceRule('every_day')}>Every Day</Button></div></DialogContent></Dialog>
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