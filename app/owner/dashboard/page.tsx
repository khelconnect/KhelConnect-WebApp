"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, Users, Plus, Trash2 } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// Types
type BookingType = {
  id: string
  date: string
  slot: string
  customerName: string
  customerPhone: string
  customerEmail: string
  sport: string
  price: number
  status: "confirmed" | "pending" | "cancelled"
  source: "app" | "manual"
}

type ManualBlockType = {
  id: string
  date: string
  slot: string
  reason: string
}

export default function OwnerDashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("bookings")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [bookings, setBookings] = useState<BookingType[]>([])
  const [manualBlocks, setManualBlocks] = useState<ManualBlockType[]>([])
  const [newBooking, setNewBooking] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    sport: "football",
    slot: "",
    price: "",
  })
  const [newBlock, setNewBlock] = useState({
    slot: "",
    reason: "",
  })

  // Static owner data
  const owner = {
    name: "Demo Owner",
    turfName: "Demo Turf",
    location: "Demo Location",
  }

  // Mock data for demonstration
  useEffect(() => {
    const mockBookings: BookingType[] = [
      {
        id: "book-1",
        date: format(new Date(), "yyyy-MM-dd"),
        slot: "6:00 PM",
        customerName: "Rahul Sharma",
        customerPhone: "+91 98765 43210",
        customerEmail: "rahul@example.com",
        sport: "football",
        price: 800,
        status: "confirmed",
        source: "app",
      },
      {
        id: "book-2",
        date: format(new Date(), "yyyy-MM-dd"),
        slot: "7:00 PM",
        customerName: "Priya Patel",
        customerPhone: "+91 87654 32109",
        customerEmail: "priya@example.com",
        sport: "cricket",
        price: 900,
        status: "confirmed",
        source: "app",
      },
      {
        id: "book-3",
        date: format(new Date(Date.now() + 86400000), "yyyy-MM-dd"), // Tomorrow
        slot: "5:00 PM",
        customerName: "Amit Kumar",
        customerPhone: "+91 76543 21098",
        customerEmail: "amit@example.com",
        sport: "football",
        price: 800,
        status: "pending",
        source: "manual",
      },
    ]

    const mockBlocks: ManualBlockType[] = [
      {
        id: "block-1",
        date: format(new Date(), "yyyy-MM-dd"),
        slot: "8:00 PM",
        reason: "Maintenance",
      },
      {
        id: "block-2",
        date: format(new Date(Date.now() + 86400000), "yyyy-MM-dd"), // Tomorrow
        slot: "6:30 PM",
        reason: "Private Event",
      },
    ]

    setBookings(mockBookings)
    setManualBlocks(mockBlocks)
  }, [])

  // Generate time slots from 6 AM to 10 PM in 30-minute increments
  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 6; hour < 22; hour++) {
      const hourFormatted = hour % 12 === 0 ? 12 : hour % 12
      const ampm = hour < 12 ? "AM" : "PM"

      // First slot of the hour
      slots.push(`${hourFormatted}:00 ${ampm}`)

      // Second slot of the hour
      slots.push(`${hourFormatted}:30 ${ampm}`)
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  // Filter bookings and blocks for the selected date
  const filteredBookings = bookings.filter((booking) => booking.date === format(selectedDate, "yyyy-MM-dd"))
  const filteredBlocks = manualBlocks.filter((block) => block.date === format(selectedDate, "yyyy-MM-dd"))

  // Check if a slot is booked or blocked
  const isSlotTaken = (slot: string) => {
    return (
      filteredBookings.some((booking) => booking.slot === slot) || filteredBlocks.some((block) => block.slot === slot)
    )
  }

  // Add a new manual booking
  const handleAddBooking = () => {
    if (
      !newBooking.customerName ||
      !newBooking.customerPhone ||
      !newBooking.slot ||
      !newBooking.sport ||
      !newBooking.price
    ) {
      alert("Please fill all required fields")
      return
    }

    const booking: BookingType = {
      id: `book-${Date.now()}`,
      date: format(selectedDate, "yyyy-MM-dd"),
      slot: newBooking.slot,
      customerName: newBooking.customerName,
      customerPhone: newBooking.customerPhone,
      customerEmail: newBooking.customerEmail || "-",
      sport: newBooking.sport,
      price: Number(newBooking.price),
      status: "confirmed",
      source: "manual",
    }

    setBookings([...bookings, booking])
    setNewBooking({
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      sport: "football",
      slot: "",
      price: "",
    })
  }

  // Add a new manual block
  const handleAddBlock = () => {
    if (!newBlock.slot || !newBlock.reason) {
      alert("Please fill all required fields")
      return
    }

    const block: ManualBlockType = {
      id: `block-${Date.now()}`,
      date: format(selectedDate, "yyyy-MM-dd"),
      slot: newBlock.slot,
      reason: newBlock.reason,
    }

    setManualBlocks([...manualBlocks, block])
    setNewBlock({
      slot: "",
      reason: "",
    })
  }

  // Delete a booking
  const handleDeleteBooking = (id: string) => {
    setBookings(bookings.filter((booking) => booking.id !== id))
  }

  // Delete a block
  const handleDeleteBlock = (id: string) => {
    setManualBlocks(manualBlocks.filter((block) => block.id !== id))
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Turf Owner Dashboard</h1>
          <p className="text-muted-foreground">
            Manage bookings and availability for <span className="font-medium text-primary">{owner.turfName}</span>
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => router.push("/owner/login")}>
          Sign Out
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Today's Bookings</CardTitle>
            <CardDescription>
              {filteredBookings.length} booking{filteredBookings.length !== 1 && "s"} today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{filteredBookings.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Blocked Slots</CardTitle>
            <CardDescription>
              {filteredBlocks.length} slot{filteredBlocks.length !== 1 && "s"} blocked today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{filteredBlocks.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Revenue Today</CardTitle>
            <CardDescription>From all confirmed bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              ₹{filteredBookings.reduce((sum, booking) => sum + booking.price, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-card border-border rounded-xl md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border-border"
            />
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-xl md:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Schedule for {format(selectedDate, "EEEE, MMMM d, yyyy")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="bookings" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Bookings
                </TabsTrigger>
                <TabsTrigger value="availability" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Availability
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bookings" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Bookings</h3>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-primary hover:bg-mint-dark text-white gap-2">
                        <Plus className="h-4 w-4" />
                        Add Manual Booking
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-card border-border">
                      <DialogHeader>
                        <DialogTitle>Add Manual Booking</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="customerName">Customer Name*</Label>
                          <Input
                            id="customerName"
                            value={newBooking.customerName}
                            onChange={(e) => setNewBooking({ ...newBooking, customerName: e.target.value })}
                            placeholder="Enter customer name"
                            className="bg-secondary border-border"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="customerPhone">Phone Number*</Label>
                          <Input
                            id="customerPhone"
                            value={newBooking.customerPhone}
                            onChange={(e) => setNewBooking({ ...newBooking, customerPhone: e.target.value })}
                            placeholder="Enter phone number"
                            className="bg-secondary border-border"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="customerEmail">Email (Optional)</Label>
                          <Input
                            id="customerEmail"
                            value={newBooking.customerEmail}
                            onChange={(e) => setNewBooking({ ...newBooking, customerEmail: e.target.value })}
                            placeholder="Enter email address"
                            className="bg-secondary border-border"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sport">Sport*</Label>
                          <Select
                            value={newBooking.sport}
                            onValueChange={(value) => setNewBooking({ ...newBooking, sport: value })}
                          >
                            <SelectTrigger className="bg-secondary border-border">
                              <SelectValue placeholder="Select sport" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="football">Football</SelectItem>
                              <SelectItem value="cricket">Cricket</SelectItem>
                              <SelectItem value="pickleball">Pickleball</SelectItem>
                              <SelectItem value="badminton">Badminton</SelectItem>
                              <SelectItem value="table-tennis">Table Tennis</SelectItem>
                              <SelectItem value="basketball">Basketball</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="slot">Time Slot*</Label>
                          <Select
                            value={newBooking.slot}
                            onValueChange={(value) => setNewBooking({ ...newBooking, slot: value })}
                          >
                            <SelectTrigger className="bg-secondary border-border">
                              <SelectValue placeholder="Select time slot" />
                            </SelectTrigger>
                            <SelectContent>
                              {timeSlots.map((slot) => (
                                <SelectItem key={slot} value={slot} disabled={isSlotTaken(slot)}>
                                  {slot} {isSlotTaken(slot) && "(Unavailable)"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="price">Price (₹)*</Label>
                          <Input
                            id="price"
                            value={newBooking.price}
                            onChange={(e) => setNewBooking({ ...newBooking, price: e.target.value })}
                            placeholder="Enter price"
                            type="number"
                            className="bg-secondary border-border"
                          />
                        </div>
                        <Button onClick={handleAddBooking} className="w-full bg-primary hover:bg-mint-dark text-white">
                          Add Booking
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {filteredBookings.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No bookings for this date. Add a manual booking or wait for customers to book.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredBookings.map((booking) => (
                      <Card key={booking.id} className="bg-secondary border-border">
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="bg-primary/10 p-3 rounded-full">
                                <Clock className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{booking.slot}</h4>
                                  <Badge
                                    variant={booking.source === "app" ? "default" : "outline"}
                                    className={cn(
                                      "text-xs",
                                      booking.source === "app"
                                        ? "bg-primary text-white"
                                        : "bg-secondary text-primary border-primary",
                                    )}
                                  >
                                    {booking.source === "app" ? "App Booking" : "Manual Entry"}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {booking.customerName} • {booking.customerPhone}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {booking.sport.charAt(0).toUpperCase() + booking.sport.slice(1)} • ₹{booking.price}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteBooking(booking.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="availability" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Blocked Slots</h3>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-primary hover:bg-mint-dark text-white gap-2">
                        <Plus className="h-4 w-4" />
                        Block Slot
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-card border-border">
                      <DialogHeader>
                        <DialogTitle>Block Time Slot</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="slot">Time Slot*</Label>
                          <Select
                            value={newBlock.slot}
                            onValueChange={(value) => setNewBlock({ ...newBlock, slot: value })}
                          >
                            <SelectTrigger className="bg-secondary border-border">
                              <SelectValue placeholder="Select time slot" />
                            </SelectTrigger>
                            <SelectContent>
                              {timeSlots.map((slot) => (
                                <SelectItem key={slot} value={slot} disabled={isSlotTaken(slot)}>
                                  {slot} {isSlotTaken(slot) && "(Unavailable)"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reason">Reason*</Label>
                          <Input
                            id="reason"
                            value={newBlock.reason}
                            onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
                            placeholder="Enter reason for blocking"
                            className="bg-secondary border-border"
                          />
                        </div>
                        <Button onClick={handleAddBlock} className="w-full bg-primary hover:bg-mint-dark text-white">
                          Block Slot
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {timeSlots.map((slot) => {
                    const booking = filteredBookings.find((b) => b.slot === slot)
                    const block = filteredBlocks.find((b) => b.slot === slot)
                    const isAvailable = !booking && !block

                    return (
                      <Card
                        key={slot}
                        className={cn(
                          "border",
                          isAvailable
                            ? "bg-secondary/50 border-border"
                            : booking
                              ? "bg-primary/10 border-primary/30"
                              : "bg-destructive/10 border-destructive/30",
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{slot}</p>
                              <p className="text-sm text-muted-foreground">
                                {isAvailable
                                  ? "Available"
                                  : booking
                                    ? `Booked: ${booking.customerName}`
                                    : `Blocked: ${block?.reason}`}
                              </p>
                            </div>
                            {block && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteBlock(block.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
