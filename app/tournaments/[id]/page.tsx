"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { 
  Trophy, Calendar, MapPin, Users, Shield, Copy, CheckCircle, 
  XCircle, ChevronRight, Share2, Plus, Clock, UserPlus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { UniversalLoader } from "@/components/ui/universal-loader"

export default function TournamentPortal() {
  const params = useParams()
  const tournamentId = params.id as string

  const [activeTab, setActiveTab] = useState("overview")
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false)
  const [isJoinTeamOpen, setIsJoinTeamOpen] = useState(false)
  
  // Real Data States
  const [user, setUser] = useState<any>(null)
  const [tournament, setTournament] = useState<any>(null)
  const [availableTeams, setAvailableTeams] = useState<any[]>([])
  const [myTeam, setMyTeam] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Form States
  const [teamName, setTeamName] = useState("")
  const [selectedTeam, setSelectedTeam] = useState<any>(null)
  const [joinMessage, setJoinMessage] = useState("")

  const [isSubmittingJoin, setIsSubmittingJoin] = useState(false)

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      // 2. Fetch Tournament details
      const { data: tData } = await supabase
        .from('tournaments')
        .select('*, turfs(name, location)')
        .eq('id', tournamentId)
        .single()
      
      setTournament(tData)

      // 3. Fetch all teams for this tournament
      if (tData) {
        await fetchTeamsAndRosters(tData.max_players_per_team, user?.id)
      }
      
      setIsLoading(false)
    }
    
    if (tournamentId) loadData()
  }, [tournamentId])

  const fetchTeamsAndRosters = async (maxPlayers: number, userId?: string) => {
    // Fetch teams and their member count
    const { data: teams } = await supabase
      .from('tournament_teams')
      .select(`
        id, name, captain_id, invite_code,
        users!tournament_teams_captain_id_fkey(name),
        team_members(id, user_id, status, role, join_message, users(name))
      `)
      .eq('tournament_id', tournamentId)

    if (teams) {
      let myManagedTeam = null
      const publicTeams = teams.map((t: any) => {
        const approvedMembers = t.team_members.filter((m: any) => m.status === 'approved')
        const pendingMembers = t.team_members.filter((m: any) => m.status === 'pending')
        
        // Check if current user is the captain of this team
        if (userId && t.captain_id === userId) {
          myManagedTeam = {
            ...t,
            roster: approvedMembers,
            pendingRequests: pendingMembers
          }
        }

        return {
          ...t,
          captainName: t.users?.name || 'Unknown',
          playersCount: approvedMembers.length,
          maxPlayers: maxPlayers
        }
      })
      
      setAvailableTeams(publicTeams)
      setMyTeam(myManagedTeam)
    }
  }

  // --- HANDLERS ---
  const handleCopyLink = () => {
    if (!myTeam) return
    const inviteLink = `${window.location.origin}/tournaments/${tournamentId}/join?code=${myTeam.invite_code}`
    navigator.clipboard.writeText(inviteLink)
    toast.success("Invite link copied to clipboard!")
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return toast.error("Please login first!")

    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase()

    // 1. Create Team
    const { data: newTeam, error: teamError } = await supabase
      .from('tournament_teams')
      .insert({
        tournament_id: tournamentId,
        captain_id: user.id,
        name: teamName,
        invite_code: inviteCode
      })
      .select()
      .single()

    if (teamError) return toast.error(teamError.message)

    // 2. Add Captain to team_members automatically
    await supabase.from('team_members').insert({
      team_id: newTeam.id,
      user_id: user.id,
      role: 'captain',
      status: 'approved'
    })

    toast.success(`${teamName} created successfully!`)
    setIsCreateTeamOpen(false)
    await fetchTeamsAndRosters(tournament.max_players_per_team, user.id)
    setActiveTab("manage")
  }

const handleRequestToJoin = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!user) return toast.error("Please log in to join a team!")

  setIsSubmittingJoin(true)

  try {
    // 1. Check if they are already in THIS team
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('status')
      .eq('team_id', selectedTeam.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingMember) {
      if (existingMember.status === 'approved') {
        toast.error("You are already an approved member of this team!")
      } else if (existingMember.status === 'pending') {
        toast.error("You already have a pending request for this team.")
      } else {
        toast.error("Your previous request to join was declined.")
      }
      setIsJoinTeamOpen(false)
      setIsSubmittingJoin(false)
      return
    }

    // 2. If clear, insert the request
    const { error } = await supabase.from('team_members').insert({
      team_id: selectedTeam.id,
      user_id: user.id,
      role: 'player',
      status: 'pending',
      join_message: joinMessage
    })

    if (error) throw error

    toast.success(`Request sent! The captain of ${selectedTeam.name} will be notified.`)
    setIsJoinTeamOpen(false)
    setJoinMessage("") // clear the form

  } catch (error: any) {
    console.error("Join Request Error:", error)
    toast.error(error.message || "Something went wrong sending your request.")
  } finally {
    setIsSubmittingJoin(false)
  }
}

  const handleProcessRequest = async (memberId: string, action: 'approve' | 'reject') => {
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    
    const { error } = await supabase
      .from('team_members')
      .update({ status: newStatus })
      .eq('id', memberId)

    if (error) return toast.error(error.message)

    toast.success(action === 'approve' ? "Player added to roster!" : "Request declined.")
    await fetchTeamsAndRosters(tournament.max_players_per_team, user?.id)
  }

  if (isLoading || !tournament) return <UniversalLoader />

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* --- HERO SECTION --- */}
      <div className="relative w-full h-[40vh] min-h-[300px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-blue-900/90 mix-blend-multiply z-10" />
        <img src="/placeholder.svg" alt="Tournament Cover" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 md:p-12 container mx-auto max-w-6xl">
          <Badge className="w-fit mb-4 bg-white/20 text-white backdrop-blur-md border-white/30 hover:bg-white/30">
            {tournament.sport} Tournament
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-2 leading-tight">{tournament.name}</h1>
          <div className="flex flex-wrap items-center gap-4 md:gap-8 text-white/90 text-sm md:text-base font-medium">
            <span className="flex items-center gap-2"><Calendar className="h-5 w-5" /> {tournament.start_date}</span>
            <span className="flex items-center gap-2"><MapPin className="h-5 w-5" /> {tournament.turfs?.name || 'TBA'}</span>
            <span className="flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-400" /> ₹{tournament.entry_fee} Entry</span>
          </div>
        </div>
      </div>

      {/* --- MAIN PORTAL --- */}
      <div className="container mx-auto px-4 md:px-6 max-w-6xl -mt-8 relative z-30">
        <Card className="bg-card border-border rounded-3xl shadow-xl overflow-hidden backdrop-blur-xl bg-background/80">
          <CardHeader className="border-b border-border/50 p-2 md:p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-transparent w-full justify-start h-auto p-0 overflow-x-auto scrollbar-hide">
                <TabsTrigger value="overview" className="rounded-full px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-base">Overview</TabsTrigger>
                <TabsTrigger value="vacancies" className="rounded-full px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-base">Teams & Vacancies</TabsTrigger>
                {myTeam && (
                  <TabsTrigger value="manage" className="rounded-full px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-base flex gap-2">
                    <Shield className="h-4 w-4" /> My Team Dashboard
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          </CardHeader>
          
          <CardContent className="p-6 md:p-8">
            
            {/* 1. OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <section>
                    <h3 className="text-2xl font-bold mb-4">About the Tournament</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Get ready for the ultimate showdown. Register your team below or join an existing squad as a free agent.
                    </p>
                  </section>
                  <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-secondary/50 p-4 rounded-2xl border border-border/50">
                      <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Max Players</p>
                      <p className="font-semibold">{tournament.max_players_per_team} per team</p>
                    </div>
                    <div className="bg-secondary/50 p-4 rounded-2xl border border-border/50">
                      <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Entry Fee</p>
                      <p className="font-semibold">₹{tournament.entry_fee}</p>
                    </div>
                    <div className="bg-secondary/50 p-4 rounded-2xl border border-border/50">
                      <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Teams</p>
                      <p className="font-semibold">{availableTeams.length} / {tournament.max_teams}</p>
                    </div>
                  </section>
                </div>
                
                {/* Registration CTA */}
                <div className="lg:col-span-1">
                  <Card className="bg-primary/5 border-primary/20 rounded-3xl h-full shadow-inner">
                    <CardContent className="p-6 flex flex-col justify-center h-full space-y-6 text-center">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                        <Trophy className="h-8 w-8" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold mb-2">Ready to Play?</h4>
                        <p className="text-sm text-muted-foreground">Register a new team as a captain, or browse existing teams looking for players.</p>
                      </div>
                      <div className="space-y-3">
                        {!myTeam && (
                          <Button className="w-full py-6 rounded-2xl text-base shadow-lg" onClick={() => setIsCreateTeamOpen(true)}>
                            <Plus className="h-5 w-5 mr-2" /> Create New Team
                          </Button>
                        )}
                        <Button variant="outline" className="w-full py-6 rounded-2xl text-base" onClick={() => setActiveTab("vacancies")}>
                          <Users className="h-5 w-5 mr-2" /> Find a Team
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* 2. TEAMS & VACANCIES TAB */}
            {activeTab === "vacancies" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold">Teams Looking for Players</h3>
                  <p className="text-muted-foreground">Don't have a team? Request to join one of the squads below.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableTeams.map(team => (
                    <Card key={team.id} className="rounded-3xl hover:shadow-md transition-shadow group">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="font-bold text-lg leading-tight">{team.name}</h4>
                            <p className="text-xs text-muted-foreground">Capt: {team.captainName}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-6">
                          <div className="bg-secondary/50 px-3 py-1.5 rounded-lg">
                            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" /> {team.playersCount} / {team.maxPlayers} Filled
                            </p>
                          </div>
                          {team.playersCount < team.maxPlayers && team.captain_id !== user?.id && (
<Button type="submit" disabled={isSubmittingJoin} className="w-full py-6 rounded-xl font-bold text-lg shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white">
  {isSubmittingJoin ? "Sending Request..." : <><UserPlus className="h-5 w-5 mr-2" /> Send Join Request</>}
</Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* 3. CAPTAIN'S DASHBOARD TAB */}
            {activeTab === "manage" && myTeam && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Col: Roster & Invite */}
                <div className="lg:col-span-7 space-y-8">
                  <div>
                    <h3 className="text-2xl font-bold flex items-center gap-2">{myTeam.name} <Badge className="bg-primary/20 text-primary hover:bg-primary/30">Registered</Badge></h3>
                    <p className="text-muted-foreground">Manage your squad and invite players.</p>
                  </div>

                  {/* Invite Link */}
                  <div className="p-1 rounded-2xl bg-gradient-to-r from-primary to-blue-600 shadow-sm">
                    <div className="bg-card rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <p className="font-bold mb-1 flex items-center gap-2"><Share2 className="h-4 w-4 text-primary" /> Invite Players</p>
                        <p className="text-xs text-muted-foreground">Send this secret link to your friends so they can join directly.</p>
                      </div>
                      <div className="flex w-full sm:w-auto items-center gap-2 bg-secondary p-1.5 rounded-full border">
                        <code className="text-xs px-3 font-medium truncate max-w-[150px] sm:max-w-xs text-muted-foreground">/join?code={myTeam.invite_code}</code>
                        <Button size="sm" className="rounded-full h-8 shrink-0" onClick={handleCopyLink}><Copy className="h-3 w-3 mr-2" /> Copy</Button>
                      </div>
                    </div>
                  </div>

                  {/* Roster */}
                  <Card className="rounded-3xl border-border shadow-none bg-transparent">
                    <CardHeader className="px-0"><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" /> Current Roster ({myTeam.roster.length}/{tournament.max_players_per_team})</CardTitle></CardHeader>
                    <CardContent className="px-0 space-y-3">
                      {myTeam.roster.map((player: any) => (
                        <div key={player.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/50">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">{player.users.name.charAt(0)}</div>
                            <p className="font-semibold">{player.users.name}</p>
                          </div>
                          <Badge variant={player.role === "captain" ? "default" : "secondary"}>{player.role}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Col: Pending Requests */}
                <div className="lg:col-span-5">
                  <Card className="rounded-3xl border-orange-500/20 bg-orange-500/5 h-full">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-orange-600">
                        <Clock className="h-5 w-5" /> Pending Requests
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">Approve players who requested to join your team.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {myTeam.pendingRequests.length === 0 ? (
                        <p className="text-sm text-center text-muted-foreground py-8">No pending requests.</p>
                      ) : (
                        myTeam.pendingRequests.map((req: any) => (
                          <div key={req.id} className="bg-card p-4 rounded-2xl border shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                              <h5 className="font-bold">{req.users.name}</h5>
                            </div>
                            <p className="text-xs text-muted-foreground italic mb-4 border-l-2 pl-2 border-primary/50">"{req.join_message}"</p>
                            <div className="flex gap-2">
                              <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleProcessRequest(req.id, 'approve')}>Approve</Button>
                              <Button size="sm" variant="outline" className="flex-1 text-destructive hover:bg-destructive/10 border-destructive/20" onClick={() => handleProcessRequest(req.id, 'reject')}>Decline</Button>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- MODALS --- */}
      <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-black">Register Team</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTeam} className="space-y-6">
            <div className="space-y-2">
              <Label>Team Name</Label>
              <Input placeholder="e.g. Kolkata Blasters" value={teamName} onChange={(e) => setTeamName(e.target.value)} required className="py-6 rounded-xl bg-secondary border-none" />
            </div>
            <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 flex justify-between items-center">
              <span className="font-medium">Registration Fee</span>
              <span className="font-black text-xl">₹{tournament.entry_fee}</span>
            </div>
            <Button type="submit" className="w-full py-6 rounded-xl font-bold text-lg shadow-lg">Pay & Register Team</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isJoinTeamOpen} onOpenChange={setIsJoinTeamOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-black">Request to Join</DialogTitle>
            <DialogDescription>Send a message to the captain of <strong className="text-foreground">{selectedTeam?.name}</strong>.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRequestToJoin} className="space-y-6">
            <div className="space-y-2">
              <Label>Message to Captain</Label>
              <Input placeholder="e.g. I play mid-field, available both days." value={joinMessage} onChange={(e) => setJoinMessage(e.target.value)} required className="py-6 rounded-xl bg-secondary border-none" />
            </div>
            <Button type="submit" className="w-full py-6 rounded-xl font-bold text-lg shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white">
              <UserPlus className="h-5 w-5 mr-2" /> Send Join Request
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  )
}