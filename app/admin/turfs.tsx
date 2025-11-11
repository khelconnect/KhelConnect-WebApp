"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Edit, ArrowLeft, MapPin, Star, Clock, XCircle, CheckCircle, RefreshCw, Trash2, Settings, ToggleLeft, ToggleRight, Info, AlertCircle
} from "lucide-react";
import { format, getDay } from "date-fns";
import { cn } from "@/lib/utils";
import { DayContent, DayContentProps } from "react-day-picker";

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
}

type TimeSlotDisplay = {
  id: string
  time: string
  endTime: string
  period: string // 'day' or 'evening'
}

type BookingType = {
  id: string
  date: string
  slot: string
  slotId: string
  customerName: string
  status: string
  payment_status: string
}

type ManualBlockType = {
  id: string
  slotId: string
  reason: string | null
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
  day_type?: 'weekday' | 'weekend';
}

// ==================================================================
// HELPER 1: Add Turf Dialog
// ==================================================================
function AddTurfDialog({ isOpen, onClose, onTurfAdded }: { isOpen: boolean, onClose: () => void, onTurfAdded: () => void }) {
  const [formData, setFormData] = useState({
    name: '', location: '', price: '', amenities: '',
    distance: '', image: '', rating: '', sports: [] as string[], turf_owner_id: '',
  });
  const [owners, setOwners] = useState<any[]>([]);

  useEffect(() => {
    async function fetchOwners() {
      const { data } = await supabase.from('turf_owners').select('id, name');
      setOwners(data || []);
    }
    fetchOwners();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
    const payload = {
      ...formData,
      price: parseInt(formData.price),
      rating: parseFloat(formData.rating) || null,
      amenities: formData.amenities.split(',').map((a) => a.trim()).filter(Boolean),
      sports: formData.sports,
      turf_owner_id: formData.turf_owner_id || null,
    };
    try {
      const { error } = await supabase.from('turfs').insert([payload]);
      if (error) throw error;
      setFormData({
        name: '', location: '', price: '', amenities: '',
        distance: '', image: '', rating: '', sports: [], turf_owner_id: '',
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
            <Label>Turf Owner</Label>
            <Select
              value={formData.turf_owner_id}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, turf_owner_id: value }))}
            >
              <SelectTrigger><SelectValue placeholder="Select Owner" /></SelectTrigger>
              <SelectContent>
                {owners.map((owner) => (
                  <SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {Object.keys(formData).filter(k => k !== 'sports' && k !== 'turf_owner_id').map((key) => (
              <div key={key}>
                <Label className="capitalize">{key.replace('_', ' ')}</Label>
                <Input
                  value={(formData as any)[key]}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  type={key === 'price' || key === 'rating' ? 'number' : 'text'}
                />
              </div>
            ))}
            
            <div>
              <Label>Sports</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {sportsOptions.map((sport) => (
                  <div key={sport} className="flex items-center space-x-2">
                    <Checkbox
                      id={`add-${sport}`}
                      checked={formData.sports.includes(sport)}
                      onCheckedChange={() => handleCheckboxChange(sport)}
                    />
                    <Label htmlFor={`add-${sport}`} className="capitalize">{sport}</Label>
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
    <div>
      <Label>{label}</Label>
      {isEditing ? (
        <Input
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1"
        />
      ) : (
        <p className="text-sm p-2 rounded-md bg-secondary">{value}</p>
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
      {/* Sports Slider */}
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

      {/* Turf Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {/* Add New Turf Card */}
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
                {turf.sports && turf.sports.length > 3 && (
                  <Badge variant="outline" className="bg-secondary border-border text-xs px-3 py-1 rounded-full">
                    +{turf.sports.length - 3} more
                  </Badge>
                )}
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
  
  // Turf Card Edit State
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [inlineData, setInlineData] = useState<Turf>(turf);
  
  // Pricing Edit State
  const [isPriceEditing, setIsPriceEditing] = useState(false);
  const [inlineBasePrice, setInlineBasePrice] = useState(turf.price.toString());
  const [dayPrice, setDayPrice] = useState("");
  const [periodPrices, setPeriodPrices] = useState({ day: "", evening: "" });
  const [weekdayPrice, setWeekdayPrice] = useState("");
  const [weekendPrice, setWeekendPrice] = useState("");
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  
  // Dialog States
  const [showSlotPriceDialog, setShowSlotPriceDialog] = useState(false);
  const [showDayPriceDialog, setShowDayPriceDialog] = useState(false);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [currentPriceChange, setCurrentPriceChange] = useState<any>(null);
  const [conflictingRule, setConflictingRule] = useState<PriceRule | null>(null);
  
  // Original Pricing Rules
  const [owners, setOwners] = useState<any[]>([]);
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [ruleForm, setRuleForm] = useState<any>({ ruleType: 'slot', dayType: 'weekday', priority: '1', price: '' });

  // --- Data Fetching ---

  const fetchAllTimeSlots = async () => {
    try {
      const { data, error } = await supabase.from("time_slots").select("*").order("start_time");
      if (error) throw error;
      const formattedSlots = (data || []).map((slot: any) => ({
        id: slot.id,
        time: `${slot.start_time}${slot.period ? ` ${slot.period}` : ""}`,
        endTime: slot.end_time,
        period: slot.period || 'day'
      }));
      setTimeSlots(formattedSlots);
    } catch (error: any) {
      console.error("Fetch slots error:", error);
    }
  };
  
  const fetchOwners = async () => {
    try {
      const { data, error } = await supabase.from('turf_owners').select('id, name');
      if (error) throw error;
      setOwners(data || []);
    } catch (error: any) {
      console.error("Fetch owners error:", error);
    }
  };

  const fetchBookingsForDate = useCallback(async () => {
    if (!turf || !selectedDate) return;
    setIsBookingsLoading(true);
    
    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, users (name)")
        .eq("turf_id", turf.id)
        .eq("date", formattedDate);
      if (error) throw error;

      const newBookings: BookingType[] = [];
      const newBlocks: ManualBlockType[] = [];
      data.forEach((b: any) => {
        if (Array.isArray(b.slot)) {
          b.slot.forEach((slotId: string) => {
            const timeSlot = timeSlots.find(ts => ts.id === slotId);
            if (b.status === "blocked") {
              newBlocks.push({ id: b.id, slotId: slotId, reason: b.sport });
            } else {
              newBookings.push({
                id: b.id, date: b.date, slot: timeSlot ? timeSlot.time : "Unknown",
                slotId: slotId, customerName: b.users?.name || "N/A",
                status: b.status, payment_status: b.payment_status,
              });
            }
          });
        }
      });
      setBookings(newBookings);
      setManualBlocks(newBlocks);
    } catch (error: any) {
      console.error("Error fetching bookings:", error);
    } finally {
      setIsBookingsLoading(false);
    }
  }, [selectedDate, turf, timeSlots]);

  const fetchPricingRules = async (sportToFetch: string) => {
    if (!sportToFetch) { setPricingRules([]); return; }
    try {
      const { data, error } = await supabase
        .from('turf_prices').select('*').eq('turf_id', turf.id).eq('sport', sportToFetch)
        .order('priority', { ascending: false });
      if (error) throw error;
      setPricingRules(data || []);
    } catch (error: any) {
      console.error("Fetch rules error:", error);
    }
  };
  
  useEffect(() => {
    fetchAllTimeSlots();
    fetchOwners();
  }, []);
  
  useEffect(() => {
    if (timeSlots.length > 0) fetchBookingsForDate();
  }, [selectedDate, timeSlots, fetchBookingsForDate]);

  useEffect(() => {
    fetchPricingRules(sport);
  }, [sport]);

  // --- Handlers ---

  const handleSaveDetails = async () => {
    const updatePayload = {
      ...inlineData,
      price: parseInt(inlineBasePrice as any),
      rating: parseFloat(inlineData.rating as any) || null,
      amenities: typeof inlineData.amenities === 'string'
        ? (inlineData.amenities as string).split(',').map((a: string) => a.trim())
        : inlineData.amenities,
      sports: inlineData.sports, 
    };
    try {
      const { data, error } = await supabase
        .from('turfs')
        .update(updatePayload)
        .eq('id', turf.id)
        .select()
        .single();
      if (error) throw error;
      setInlineData(data); 
      setIsEditingDetails(false);
      setIsPriceEditing(false);
    } catch (error: any) {
      console.error('Update error:', error);
      alert("Error saving details: " + error.message);
    }
  };

  const handleInlineCheckboxChange = (sport: string) => {
    setInlineData((prev) => {
      const isSelected = prev.sports.includes(sport);
      return {
        ...prev,
        sports: isSelected ? prev.sports.filter((s) => s !== sport) : [...prev.sports, sport],
      };
    });
  };

  // --- NEW PRICING HANDLERS ---
  
  const findDirectConflict = async (rule: Omit<PriceRule, 'id' | 'price'>): Promise<PriceRule | null> => {
    let query = supabase.from('turf_prices')
      .select('*')
      .eq('turf_id', rule.turf_id)
      .eq('sport', rule.sport)
      .eq('priority', rule.priority);
      
    if (rule.date) query = query.eq('date', rule.date);
    else query = query.is('date', null);
    
    if (rule.day_of_week) query = query.eq('day_of_week', rule.day_of_week);
    else query = query.is('day_of_week', null);

    if (rule.slot_id) query = query.eq('slot_id', rule.slot_id);
    else query = query.is('slot_id', null);

    if (rule.period) query = query.eq('period', rule.period);
    else query = query.is('period', null);

    if (rule.day_type) query = query.eq('day_type', rule.day_type);
    else query = query.is('day_type', null);
    
    try {
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error("Conflict check error:", error);
      return null;
    }
  };
  
  const savePriceRule = async (rule: Omit<PriceRule, 'id'>) => {
    if (!confirm("Are you sure you want to save this price rule?")) return;
    
    try {
      const conflict = await findDirectConflict(rule);
      if (conflict) {
        setConflictingRule(conflict);
        setCurrentPriceChange({ ...rule, id: conflict.id });
        setShowConflictDialog(true);
        return; // Stop, wait for user input
      }
      
      const { error } = await supabase.from('turf_prices').insert(rule);
      if (error) throw error;
      
      alert("Price rule saved!");
      resetPriceDialogs();
      fetchPricingRules(sport);

    } catch (error: any) {
      console.error("Error saving price rule:", error);
      alert("Error: " + error.message);
    }
  };

  const handleOverrideRule = async () => {
    if (!conflictingRule || !currentPriceChange) return;
    
    try {
      const { error } = await supabase
        .from('turf_prices')
        .update({ price: currentPriceChange.price })
        .eq('id', conflictingRule.id);
      
      if (error) throw error;
      
      alert("Rule overridden successfully!");
      resetPriceDialogs();
      fetchPricingRules(sport);

    } catch (error: any) {
      console.error("Error overriding rule:", error);
      alert("Error: " + error.message);
    }
  };
  
  const resetPriceDialogs = () => {
    setShowSlotPriceDialog(false);
    setShowDayPriceDialog(false);
    setShowApplyDialog(false);
    setShowConflictDialog(false);
    setCurrentPriceChange(null);
    setConflictingRule(null);
    setSelectedSlots([]);
    setDayPrice("");
  };

  const handleSlotClick = (slotId: string) => {
    if (!isPriceEditing) return;
    if (isMultiSelect) {
      setSelectedSlots(prev =>
        prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]
      );
    } else {
      setCurrentPriceChange({ type: 'slot', slots: [slotId], price: '' });
      setShowSlotPriceDialog(true);
    }
  };

  const handleOpenMultiSlotDialog = () => {
    if (selectedSlots.length === 0) { alert("Please select one or more slots first."); return; }
    setCurrentPriceChange({ type: 'slot', slots: selectedSlots, price: '' });
    setShowSlotPriceDialog(true);
  };
  
  // --- THIS FUNCTION IS NOW FIXED ---
  const handleSaveSlotPriceRule = async (applyType: 'date_only' | 'every_day' | 'weekday' | 'weekend') => {
    // 1. Get the data from the state
    const { type, slots, price } = currentPriceChange;
    if (type !== 'slot' || !slots || !price) {
      alert("Error: Price or slots not set.");
      return;
    }
    
    if (!confirm("Are you sure you want to save this price rule?")) return;

    const date = selectedDate;
    const rulesToInsert: Omit<PriceRule, 'id'>[] = [];

    // 2. Build a list of rules to create
    slots.forEach((slotId: string) => {
      let rule: Omit<PriceRule, 'id'> = {
        turf_id: turf.id,
        sport: sport,
        price: parseFloat(price),
        slot_id: slotId,
        priority: 0 // Default
      };

      // 3. Set the correct priority based on the user's choice
      if (applyType === 'date_only') {
        rule.date = format(date, "yyyy-MM-dd");
        rule.priority = 30; // Specific Slot on Specific Date
      } else if (applyType === 'every_day') {
        rule.priority = 20; // Specific Slot, Every Day
      } else if (applyType === 'weekday') {
        rule.day_type = 'weekday';
        rule.priority = 25; // Specific Slot, on Weekdays
      } else if (applyType === 'weekend') {
        rule.day_type = 'weekend';
        rule.priority = 25; // Specific Slot, on Weekends
      }
      rulesToInsert.push(rule);
    });
    
    // 4. --- THIS IS THE FIX ---
    // Loop through ALL rules and save them one by one.
    try {
      for (const rule of rulesToInsert) {
        await savePriceRule(rule); // This will handle conflicts for each rule
      }
      
      alert("Price rules saved successfully!");
      resetPriceDialogs(); // Reset all dialogs
      fetchPricingRules(sport); // Refresh the list

    } catch (error: any) {
      console.error("Error in batch save:", error);
      alert("An error occurred while saving the rules. " + error.message);
    }
  };
  
  const handleSaveDayPriceRule = async (applyType: 'date_only' | 'every_day_of_week') => {
    const { price, date } = currentPriceChange;
    if (!price || !date || !sport) { alert("Missing data."); return; }
    
    let rule: Omit<PriceRule, 'id'> = { 
      turf_id: turf.id, 
      sport: sport, 
      price: parseFloat(price),
      priority: 0 // Default
    };

    if (applyType === 'date_only') {
      rule.date = format(date, "yyyy-MM-dd");
      rule.priority = 15; // All slots on Specific Date
    } else if (applyType === 'every_day_of_week') {
      rule.day_of_week = getDay(date);
      rule.priority = 10; // All slots on Specific Day of Week
    }
    
    savePriceRule(rule); // This will handle confirmation and conflicts
  };

  const handleSetDayPrice = () => {
    if (!dayPrice) return;
    if (!confirm(`Set price for ${format(selectedDate, "PPP")} to ₹${dayPrice}?`)) return;
    setCurrentPriceChange({
      type: 'day',
      price: dayPrice,
      date: selectedDate,
    });
    setShowDayPriceDialog(true);
  };
  
  const handleSaveBulkPrice = (dayType: 'weekday' | 'weekend') => {
    const price = dayType === 'weekday' ? weekdayPrice : weekendPrice;
    if (!price) { alert(`Please enter a price for ${dayType}s.`); return; }

    const rule: Omit<PriceRule, 'id'> = {
      turf_id: turf.id,
      sport: sport,
      price: parseFloat(price),
      day_type: dayType,
      priority: 1, // Lowest priority
    };
    
    savePriceRule(rule);
  };
  
  const handleSavePeriodPrice = (period: 'day' | 'evening') => {
    const price = periodPrices[period];
    if (!price) { alert(`Please enter a price for ${period} slots.`); return; }
    
    const rule: Omit<PriceRule, 'id'> = {
      turf_id: turf.id,
      sport: sport,
      price: parseFloat(price),
      period: period,
      priority: 5, // Higher than bulk, lower than day-of-week
    };
    
    savePriceRule(rule);
  };

  // --- THIS FUNCTION IS NOW NEEDED ---
  const handleSaveOldRule = async () => {
    const payload: Omit<PriceRule, 'id'> = {
      turf_id: turf.id,
      sport: sport,
      price: parseFloat(ruleForm.price || '0'),
      priority: parseInt(ruleForm.priority || '1'),
    };
    switch (ruleForm.ruleType) {
      case 'slot': 
        payload.slot_id = ruleForm.slotId; 
        break;
      case 'day_of_week': 
        payload.day_of_week = parseInt(ruleForm.dayOfWeek!); 
        break;
      case 'date': 
        payload.date = ruleForm.date; 
        break;
      case 'range':
        payload.start_time = ruleForm.startTime;
        payload.end_time = ruleForm.endTime;
        break;
      case 'period':
        payload.period = ruleForm.period;
        // payload.day_type = ruleForm.dayType;
        break;
    }
    await savePriceRule(payload);
    setRuleForm({ ruleType: 'slot', dayType: 'weekday', priority: '1', price: '' });
    setShowRuleDialog(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to All Turfs
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsPriceEditing(p => !p)}>
            {isPriceEditing ? <XCircle className="mr-2 h-4 w-4" /> : <Settings className="mr-2 h-4 w-4" />}
            {isPriceEditing ? "Cancel Pricing" : "Edit Pricing"}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsEditingDetails(p => !p)}>
            <Edit className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden bg-card border-border rounded-3xl mb-6">
        <CardContent className="p-0 flex flex-col md:flex-row">
          <div className="w-full md:w-1/3 aspect-video md:aspect-square relative">
            <img src={inlineData.image || "/placeholder.svg"} alt={inlineData.name} className="w-full h-full object-cover rounded-t-3xl md:rounded-l-3xl md:rounded-t-none" />
            {isEditingDetails && (
              <div className="absolute top-2 left-2 right-2 p-2 bg-black/50 text-white rounded-md">
                <Input value={inlineData.image || ''} onChange={(e) => setInlineData(p => ({...p, image: e.target.value}))} placeholder="Image URL" className="bg-white/20 border-none text-white placeholder-gray-300" />
              </div>
            )}
          </div>
          <div className="flex-1 p-6 space-y-4 relative">
            <div className="flex justify-between items-start">
              {!isEditingDetails ? (
                <h2 className="text-3xl font-bold">{inlineData.name}{inlineData.rating && <span className="ml-3 text-lg font-semibold text-primary flex items-center"><Star className="h-4 w-4 fill-primary mr-1" />{inlineData.rating}</span>}</h2>
              ) : (
                <Input value={inlineData.name} onChange={(e) => setInlineData(p => ({...p, name: e.target.value}))} className="text-3xl font-bold w-2/3" />
              )}
              {isEditingDetails && (
                <Button size="sm" onClick={handleSaveDetails} className="ml-auto">Save Details</Button>
              )}
            </div>

            <div className="flex items-center text-muted-foreground">
              <MapPin className="h-4 w-4 mr-2" />
              {!isEditingDetails ? <p>{inlineData.location}</p> : <Input value={inlineData.location} onChange={(e) => setInlineData(p => ({...p, location: e.target.value}))} className="flex-1" />}
            </div>

            <div className="flex items-center text-muted-foreground">
              <span className="text-xl mr-2">₹</span>
              {!isPriceEditing ? (
                <p className="text-xl font-bold text-primary">{inlineData.price} <span className="text-sm font-normal text-muted-foreground">base price / 30 min</span></p>
              ) : (
                <Input
                  type="number"
                  value={inlineBasePrice}
                  onChange={(e) => setInlineBasePrice(e.target.value)}
                  onBlur={handleSaveDetails}
                  className="w-32 text-xl"
                />
              )}
            </div>

            <div>
              <Label className="text-muted-foreground">Amenities:</Label>
              {!isEditingDetails ? <p className="text-sm">{inlineData.amenities?.join(', ') || 'N/A'}</p> : <Input value={inlineData.amenities?.join(', ') || ''} onChange={(e) => setInlineData(p => ({...p, amenities: e.target.value.split(',').map(s => s.trim())}))} placeholder="Comma-separated amenities" />}
            </div>
            
            <div>
              <Label className="text-muted-foreground">Sports:</Label>
              {!isEditingDetails ? <p className="text-sm">{inlineData.sports?.join(', ') || 'N/A'}</p> : (
                <div className="grid grid-cols-3 gap-2 mt-2 rounded-md border p-4">
                  {sportsOptions.map((sportItem) => (
                    <div key={sportItem} className="flex items-center space-x-2">
                      <Checkbox id={`edit-${sportItem}`} checked={inlineData.sports.includes(sportItem)} onCheckedChange={() => handleInlineCheckboxChange(sportItem)} />
                      <Label htmlFor={`edit-${sportItem}`} className="capitalize text-sm font-normal">{sportItem}</Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="text-muted-foreground">Turf Owner:</Label>
              {isEditingDetails ? (
                <Select value={inlineData.turf_owner_id || ''} onValueChange={(value) => setInlineData((prev: any) => ({ ...prev, turf_owner_id: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select Owner" /></SelectTrigger>
                  <SelectContent>
                    {owners.map((owner) => (<SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              ) : <p className="text-sm">{owners.find(o => o.id === inlineData.turf_owner_id)?.name || 'N/A'}</p>}
            </div>
          </div>
        </CardContent>
      </Card>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* === UPDATED Left Column === */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-card border-border rounded-3xl">
            <CardHeader><CardTitle>Select Date</CardTitle></CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setDayPrice("");
                  }
                }}
                className="rounded-md"
              />

              {isPriceEditing && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <Label htmlFor="day-price" className="font-semibold text-base">
                    Price for {format(selectedDate, "PPP")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Set a price for all slots on this date.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      id="day-price"
                      type="number"
                      placeholder="₹"
                      value={dayPrice}
                      onChange={(e) => setDayPrice(e.target.value)}
                    />
                    <Button 
                      onClick={handleSetDayPrice} 
                      disabled={!dayPrice}
                    >
                      Set
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        {/* === END UPDATED Left Column === */}

        {/* Right Column: Availability & Pricing */}
        <div className="lg:col-span-2 space-y-6">
          {isPriceEditing ? (
            <Card className="bg-card border-border rounded-3xl">
              <CardHeader>
                <CardTitle>Set Bulk Prices for <span className="capitalize text-primary">{sport}</span></CardTitle>
                <CardDescription>
                  Set bulk prices here. Click individual slots to set specific overrides.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label>Weekday Price (Mon-Fri)</Label>
                    <Input type="number" placeholder="₹" value={weekdayPrice} onChange={e => setWeekdayPrice(e.target.value)} />
                  </div>
                  <Button size="sm" className="self-end" onClick={() => handleSaveBulkPrice('weekday')}>Apply</Button>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label>Weekend Price (Sat-Sun)</Label>
                    <Input type="number" placeholder="₹" value={weekendPrice} onChange={e => setWeekendPrice(e.target.value)} />
                  </div>
                  <Button size="sm" className="self-end" onClick={() => handleSaveBulkPrice('weekend')}>Apply</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border rounded-3xl">
              <CardHeader><CardTitle>Pricing Rules for <span className="capitalize text-primary">{sport}</span></CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button onClick={() => setShowRuleDialog(true)}>
                    Add New Pricing Rule
                  </Button>
                  <div>
                    <Label>View Applied Rules for {sport}</Label>
                    <Select>
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder={`Found ${pricingRules.length} rule(s). Click to view.`} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {pricingRules.length === 0 && (
                          <SelectItem value="none" disabled>No rules found for this sport.</SelectItem>
                        )}
                        {pricingRules.map(rule => {
                          const ruleCopy: any = { ...rule };
                          if (ruleCopy.slot_id) {
                            const slot = timeSlots.find(s => s.id === ruleCopy.slot_id);
                            if (slot) {
                              ruleCopy.slot_time = slot.time;
                              delete ruleCopy.slot_id;
                            }
                          }
                          delete ruleCopy.id;
                          delete ruleCopy.turf_id;
                          delete ruleCopy.created_at;
                          delete ruleCopy.sport;

                          return (
                            <SelectItem key={rule.id} value={rule.id} className="whitespace-pre-wrap text-xs">
                              {JSON.stringify(ruleCopy, null, 2)}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Slot Availability Grid */}
          <Card className="bg-card border-border rounded-3xl">
            <CardHeader>
              <CardTitle>Slot Availability for {format(selectedDate, "PPP")}</CardTitle>
              {isPriceEditing ? (
                <div className="flex justify-between items-center pt-2">
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant={isMultiSelect ? "default" : "outline"} onClick={() => { setIsMultiSelect(p => !p); setSelectedSlots([]); }}>
                      {isMultiSelect ? <ToggleRight className="mr-2 h-4 w-4" /> : <ToggleLeft className="mr-2 h-4 w-4" />}
                      Multi-Select
                    </Button>
                    {isMultiSelect && (
                      <Button size="sm" onClick={handleOpenMultiSlotDialog} disabled={selectedSlots.length === 0}>
                        Set Price for {selectedSlots.length} Slots
                      </Button>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={fetchBookingsForDate} className="h-auto p-0 text-xs text-muted-foreground flex items-center">
                    <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                  </Button>
                </div>
              ) : (
                <CardDescription>
                  <Button variant="ghost" size="sm" onClick={fetchBookingsForDate} className="h-auto p-0 text-xs text-muted-foreground flex items-center">
                    <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                  </Button>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {isBookingsLoading ? <p>Loading slots...</p> : (
                <ScrollArea className="h-[400px]">
                  {['day', 'evening'].map(period => (
                    <div key={period} className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold capitalize">{period}</h3>
                        {isPriceEditing && (
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`price-${period}`} className="text-xs">Set {period} price:</Label>
                            <Input
                              id={`price-${period}`}
                              type="number"
                              placeholder="₹"
                              value={periodPrices[period as 'day' | 'evening']}
                              onChange={e => setPeriodPrices(p => ({ ...p, [period]: e.target.value }))}
                              className="h-8 w-24"
                            />
                            <Button size="sm" className="h-8" onClick={() => handleSavePeriodPrice(period as 'day' | 'evening')}>Set</Button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pr-4">
                        {timeSlots.filter(s => s.period === period).map((slot) => {
                          const booking = bookings.find((b) => b.slotId === slot.id);
                          const block = manualBlocks.find((b) => b.slotId === slot.id);
                          const isBooked = !!booking || !!block;
                          const isSelected = selectedSlots.includes(slot.id);
                          
                          let statusText = "Available";
                          let bgColor = "bg-green-500/10 text-green-700";
                          let borderColor = "border-green-500";
                          let icon = <CheckCircle className="h-4 w-4 mr-1" />;
                          
                          if(isPriceEditing && !isBooked) {
                            statusText = "Click to set price";
                            bgColor = "bg-secondary/50";
                            borderColor = "border-border";
                            if(isSelected) {
                              bgColor = "bg-primary/20";
                              borderColor = "border-primary";
                            }
                          } else if (block) {
                            statusText = `Blocked: ${block.reason || 'Offline'}`;
                            bgColor = "bg-orange-500/10 text-orange-700";
                            borderColor = "border-orange-500";
                            icon = <XCircle className="h-4 w-4 mr-1" />;
                          } else if (booking) {
                            statusText = `Booked: ${booking.customerName}`;
                            bgColor = "bg-blue-500/10 text-blue-700";
                            borderColor = "border-blue-500";
                            icon = <Clock className="h-4 w-4 mr-1" />;
                            if (booking.status === 'completed') {
                              bgColor = "bg-emerald-500/10 text-emerald-700";
                              borderColor = "border-emerald-500";
                              icon = <CheckCircle className="h-4 w-4 mr-1" />;
                            } else if (booking.status === 'cancelled') {
                              statusText = `Cancelled: ${booking.customerName}`;
                              bgColor = "bg-red-500/10 text-red-700";
                              borderColor = "border-red-500";
                              icon = <XCircle className="h-4 w-4 mr-1" />;
                            }
                          }

                          return (
                            <Card
                              key={slot.id}
                              onClick={() => !isBooked && handleSlotClick(slot.id)}
                              className={cn(
                                "border", bgColor, borderColor,
                                (isPriceEditing && !isBooked) && "cursor-pointer hover:border-primary",
                                (isBooked && isPriceEditing) && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <CardContent className="p-4">
                                <p className="font-medium text-lg flex items-center">{icon} {slot.time}</p>
                                <p className="text-sm text-muted-foreground">{statusText}</p>
                                {booking && !isPriceEditing && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    <Badge className={cn("capitalize text-xs",
                                      booking.status === 'confirmed' ? 'bg-green-600 hover:bg-green-600/90 text-white' :
                                      booking.status === 'pending' ? 'bg-yellow-500 hover:bg-yellow-500/90 text-black' :
                                      booking.status === 'completed' ? 'bg-blue-600 hover:bg-blue-600/90 text-white' :
                                      booking.status === 'cancelled' ? 'bg-red-600 hover:bg-red-600/9OS text-white' : '')}>
                                      {booking.status}
                                    </Badge>
                                    <Badge className={cn("capitalize text-xs",
                                      booking.payment_status === 'paid' ? 'bg-green-600 hover:bg-green-600/90 text-white' :
                                      booking.payment_status === 'refund processed' ? 'bg-blue-500 hover:bg-blue-500/90 text-white' :
                                      booking.payment_status === 'refund_initiated' ? 'bg-orange-500 hover:bg-orange-500/90 text-white' :
                                      booking.payment_status === 'pending' ? 'bg-red-500 hover:bg-red-500/90 text-white' : '')}>
                                      {booking.payment_status.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                )}
                              </CardContent>
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
      
      {/* --- DIALOGS --- */}

      {/* 1. Old Pricing Rule Dialog (for "Add New" button) */}
      <Dialog open={showRuleDialog} onOpenChange={() => setShowRuleDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Pricing Rule for {sport}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={ruleForm.ruleType} onValueChange={(v) => setRuleForm({ ...ruleForm, ruleType: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="slot">By Specific Slot</SelectItem>
                <SelectItem value="day_of_week">By Day of Week</SelectItem>
                <SelectItem value="date">By Specific Date</SelectItem>
                <SelectItem value="range">By Time Range</SelectItem>
                <SelectItem value="period">By Period (day/evening)</SelectItem>
              </SelectContent>
            </Select>
            {ruleForm.ruleType === 'slot' && (
              <Select value={ruleForm.slotId || ''} onValueChange={(v) => setRuleForm(f => ({ ...f, slotId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select Slot" /></SelectTrigger>
                <SelectContent>
                  {timeSlots.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {ruleForm.ruleType === 'day_of_week' && (
              <Select value={ruleForm.dayOfWeek} onValueChange={v => setRuleForm(f => ({ ...f, dayOfWeek: v }))}>
                <SelectTrigger><SelectValue placeholder="Select day (0=Sun, 1=Mon...)" /></SelectTrigger>
                <SelectContent>
                  {["0 (Sunday)", "1 (Monday)", "2 (Tuesday)", "3 (Wednesday)", "4 (Thursday)", "5 (Friday)", "6 (Saturday)"].map((day, i) => (
                    <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
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
            <Input type="number" placeholder="Price" value={ruleForm.price} onChange={e => setRuleForm(f => ({ ...f, price: e.target.value }))} />
            <Input type="number" placeholder="Priority (higher = override)" value={ruleForm.priority} onChange={e => setRuleForm(f => ({ ...f, priority: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button onClick={handleSaveOldRule}>Save Rule</Button>
            <Button variant="ghost" onClick={() => setShowRuleDialog(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 2. Slot Price Dialog */}
      <Dialog open={showSlotPriceDialog} onOpenChange={setShowSlotPriceDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Price for Slot(s)</DialogTitle>
            <DialogDescription>
              You are setting the price for {currentPriceChange?.slots?.length || 0} slot(s)
              on {format(selectedDate, "PPP")}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="slot-price">New Price (₹)</Label>
            <Input
              id="slot-price"
              type="number"
              placeholder="₹1200"
              value={currentPriceChange?.price || ""}
              onChange={(e) => setCurrentPriceChange((p: any) => ({ ...p, price: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={resetPriceDialogs}>Cancel</Button>
            <Button onClick={() => setShowApplyDialog(true)} disabled={!currentPriceChange?.price}>Next</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 3. Apply Slot Price Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>How do you want to apply this price?</DialogTitle>
            <DialogDescription>
              Set price to **₹{currentPriceChange?.price}** for the selected slot(s).
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-3 pt-4">
            <Button onClick={() => handleSaveSlotPriceRule('date_only')}>
              Apply for {format(selectedDate, "PPP")} **Only**
            </Button>
            <Button variant="outline" onClick={() => handleSaveSlotPriceRule('every_day')}>
              Apply for this time **Every Day**
            </Button>
            <Button variant="outline" onClick={() => handleSaveSlotPriceRule('weekday')}>
              Apply for this time **Every Weekday**
            </Button>
            <Button variant="outline" onClick={() => handleSaveSlotPriceRule('weekend')}>
              Apply for this time **Every Weekend**
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* 4. Apply Day Price Dialog */}
      <Dialog open={showDayPriceDialog} onOpenChange={setShowDayPriceDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>How do you want to apply this price?</DialogTitle>
            <DialogDescription>
              Set all slots on **{format(currentPriceChange?.date || new Date(), "PPP")}** to **₹{currentPriceChange?.price}**?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-3 pt-4">
            <Button onClick={() => handleSaveDayPriceRule('date_only')}>
              Apply for {format(currentPriceChange?.date || new Date(), "PPP")} **Only**
            </Button>
            <Button variant="outline" onClick={() => handleSaveDayPriceRule('every_day_of_week')}>
              Apply to **Every {format(currentPriceChange?.date || new Date(), "EEEE")}**
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. NEW: Conflict Dialog */}
      <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertCircle className="text-destructive"/> Rule Conflict Found</DialogTitle>
            <DialogDescription>
              A rule with these exact parameters already exists.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <p className="font-semibold">Existing Rule:</p>
            <pre className="text-xs p-2 bg-secondary rounded-md">Price: ₹{conflictingRule?.price}</pre>
            <p className="font-semibold">New Rule:</p>
            <pre className="text-xs p-2 bg-secondary rounded-md">Price: ₹{currentPriceChange?.price}</pre>
            <p className="pt-2">Do you want to override the existing rule with the new price?</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={resetPriceDialogs}>Cancel</Button>
            <Button onClick={handleOverrideRule}>Override</Button>
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
  const [selectedSport, setSelectedSport] = useState<string>("football"); // Store sport

  if (selectedTurf) {
    return <TurfDetailDashboard 
      turf={selectedTurf} 
      sport={selectedSport} // Pass sport as prop
      onBack={() => setSelectedTurf(null)} 
    />;
  } else {
    return <TurfListingGrid 
      onSelectTurf={(turf, sport) => {
        setSelectedTurf(turf);
        setSelectedSport(sport); // Set sport on selection
      }} 
    />;
  }
}