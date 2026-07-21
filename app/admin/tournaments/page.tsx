"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { 
  Plus, Trophy, Calendar, MapPin, Users, Copy, ExternalLink, Edit 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge" // <-- FIXED IMPORT
import { toast } from "sonner"
import { UniversalLoader } from "@/components/ui/universal-loader"
import Link from "next/link"

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<any[]>([])
  const [turfs, setTurfs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    sport: "football",
    turf_id: "",
    start_date: "",
    end_date: "",
    entry_fee: 2000,
    max_teams: 16,
    max_players_per_team: 8,
    status: "open"
  })

  // Fetch Data
  const fetchData = async () => {
    setIsLoading(true)
    const { data: turfsData } = await supabase.from('turfs').select('id, name')
    if (turfsData) setTurfs(turfsData)

    const { data: tourneysData } = await supabase
      .from('tournaments')
      .select('*, turfs(name)')
      .order('created_at', { ascending: false })
      
    if (tourneysData) setTournaments(tourneysData)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Handlers
  const openCreateModal = () => {
    setModalMode('create')
    setEditingId(null)
    setFormData({ name: "", sport: "football", turf_id: "", start_date: "", end_date: "", entry_fee: 2000, max_teams: 16, max_players_per_team: 8, status: "open" })
    setIsModalOpen(true)
  }

  const openEditModal = (t: any) => {
    setModalMode('edit')
    setEditingId(t.id)
    setFormData({ 
      name: t.name, sport: t.sport, turf_id: t.turf_id, 
      start_date: t.start_date, end_date: t.end_date, 
      entry_fee: t.entry_fee, max_teams: t.max_teams, 
      max_players_per_team: t.max_players_per_team, status: t.status 
    })
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (modalMode === 'create') {
      const { error } = await supabase.from('tournaments').insert([{
        ...formData, status: 'open' // force open on create
      }])
      if (error) toast.error(error.message)
      else toast.success("Tournament created successfully!")
    } else {
      const { error } = await supabase.from('tournaments').update(formData).eq('id', editingId)
      if (error) toast.error(error.message)
      else toast.success("Tournament updated successfully!")
    }

    setIsModalOpen(false)
    setIsSubmitting(false)
    fetchData() 
  }

  const copyLink = (id: string) => {
    const link = `${window.location.origin}/tournaments/${id}`
    navigator.clipboard.writeText(link)
    toast.success("Tournament Link Copied!")
  }

  if (isLoading) return <UniversalLoader />

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" /> Tournament Master
          </h1>
          <p className="text-muted-foreground mt-1">Create and manage upcoming tournaments.</p>
        </div>
        <Button onClick={openCreateModal} className="gap-2 rounded-xl py-6">
          <Plus className="h-5 w-5" /> Create Tournament
        </Button>
      </div>

      {/* List of Tournaments */}
      {tournaments.length === 0 ? (
        <Card className="border-dashed bg-transparent border-2">
          <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Trophy className="h-16 w-16 mb-4 opacity-20" />
            <p>No tournaments created yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t) => (
            <Card key={t.id} className="rounded-2xl border-border shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <Badge variant={t.status === 'open' ? 'default' : t.status === 'ongoing' ? 'secondary' : 'outline'} className="uppercase">
                    {t.status}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEditModal(t)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                
                <h3 className="text-xl font-bold mb-2 leading-tight">{t.name}</h3>
                
                <div className="space-y-2 text-sm text-muted-foreground mb-6">
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {t.turfs?.name}</p>
                  <p className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {t.start_date} to {t.end_date}</p>
                  <p className="flex items-center gap-2"><Users className="h-4 w-4" /> {t.max_teams} Teams Max</p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-lg gap-2" onClick={() => copyLink(t.id)}>
                    <Copy className="h-4 w-4" /> Link
                  </Button>
                  <Link href={`/tournaments/${t.id}`} target="_blank" className="flex-1">
                    <Button variant="default" className="w-full rounded-lg gap-2 bg-primary/10 text-primary hover:bg-primary/20">
                      Portal <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-black">
              {modalMode === 'create' ? "Host New Tournament" : "Edit Tournament"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Tournament Name</Label>
              <Input required placeholder="e.g. Monsoon Cup 2026" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sport</Label>
                <Select value={formData.sport} onValueChange={v => setFormData({...formData, sport: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="football">Football</SelectItem>
                    <SelectItem value="cricket">Cricket</SelectItem>
                    <SelectItem value="pickleball">Pickleball</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Venue (Turf)</Label>
                <Select value={formData.turf_id} onValueChange={v => setFormData({...formData, turf_id: v})} required>
                  <SelectTrigger><SelectValue placeholder="Select Turf" /></SelectTrigger>
                  <SelectContent>
                    {turfs.map(turf => (
                      <SelectItem key={turf.id} value={turf.id}>{turf.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" required value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" required value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Entry Fee (₹)</Label>
                <Input type="number" required value={formData.entry_fee} onChange={e => setFormData({...formData, entry_fee: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Max Teams</Label>
                <Input type="number" required value={formData.max_teams} onChange={e => setFormData({...formData, max_teams: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Players / Team</Label>
                <Input type="number" required value={formData.max_players_per_team} onChange={e => setFormData({...formData, max_players_per_team: Number(e.target.value)})} />
              </div>
            </div>

            {/* Only show status dropdown when editing */}
            {modalMode === 'edit' && (
              <div className="space-y-2 pt-2 border-t">
                <Label>Tournament Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open (Accepting Teams)</SelectItem>
                    <SelectItem value="ongoing">Ongoing (In Progress)</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button type="submit" className="w-full py-6 rounded-xl font-bold mt-4" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : modalMode === 'create' ? "Launch Tournament" : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}