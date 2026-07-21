"use client"

import { useEffect, useState, Suspense } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Shield, Trophy, AlertTriangle, ArrowRight, CheckCircle, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { UniversalLoader } from "@/components/ui/universal-loader"

function JoinTeamContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const tournamentId = params.id as string
  const inviteCode = searchParams.get("code")

  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [user, setUser] = useState<any>(null)
  
  const [team, setTeam] = useState<any>(null)
  const [tournament, setTournament] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isTeamFull, setIsTeamFull] = useState(false)
  const [alreadyInTeam, setAlreadyInTeam] = useState(false)

  useEffect(() => {
    const fetchInviteDetails = async () => {
      setIsLoading(true)
      
      // 1. Get User
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (!inviteCode) {
        setErrorMsg("Invalid or missing invite code.")
        setIsLoading(false)
        return
      }

      // 2. Fetch Team and Tournament Data
      const { data: teamData, error: teamError } = await supabase
        .from('tournament_teams')
        .select(`
          *,
          users!tournament_teams_captain_id_fkey(name),
          tournaments(id, name, max_players_per_team, sport)
        `)
        .eq('invite_code', inviteCode)
        .eq('tournament_id', tournamentId)
        .single()

      if (teamError || !teamData) {
        setErrorMsg("This invite link is invalid or has expired.")
        setIsLoading(false)
        return
      }

      setTeam(teamData)
      setTournament(teamData.tournaments)

      // 3. Check Roster Size
      const { data: roster } = await supabase
        .from('team_members')
        .select('user_id, status')
        .eq('team_id', teamData.id)
        .eq('status', 'approved')
      
      if (roster && roster.length >= teamData.tournaments.max_players_per_team) {
        setIsTeamFull(true)
      }

      // 4. Check if current user is already in this team
      if (user && roster) {
        const isMember = roster.some((member: any) => member.user_id === user.id)
        if (isMember) setAlreadyInTeam(true)
      }

      setIsLoading(false)
    }

    fetchInviteDetails()
  }, [inviteCode, tournamentId])

  const handleJoin = async () => {
    if (!user) {
      toast.error("You must be logged in to join a team!")
      return
    }

    setIsJoining(true)

    // Because they have the secret invite code, we insert them as 'approved'
    const { error } = await supabase
      .from('team_members')
      .insert({
        tournament_id: tournamentId, // <-- ADDED CONSTRAINT REQUIREMENT HERE
        team_id: team.id,
        user_id: user.id,
        role: 'player',
        status: 'approved',
        join_message: 'Joined via invite link'
      })

    if (error) {
      if (error.code === '23505') {
        toast.error("You are already in a team for this tournament!")
      } else {
        toast.error(error.message)
      }
      setIsJoining(false)
      return
    }

    toast.success(`Successfully joined ${team.name}!`)
    router.push(`/tournaments/${tournamentId}`)
  }

  if (isLoading) return <UniversalLoader />

  if (errorMsg) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Invite Not Found</h2>
        <p className="text-muted-foreground mb-6">{errorMsg}</p>
        <Button onClick={() => router.push(`/tournaments/${tournamentId}`)}>Return to Tournament</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-6">
      <div className="absolute inset-0 bg-primary/5 z-0 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-full max-h-[500px] bg-primary/20 blur-[120px] rounded-full z-0 pointer-events-none" />

      <Card className="w-full max-w-md relative z-10 border-border/50 shadow-2xl rounded-3xl overflow-hidden backdrop-blur-xl bg-card/90">
        <div className="bg-primary p-6 text-center text-primary-foreground relative overflow-hidden">
          <div className="absolute -bottom-6 -right-6 opacity-20">
            <Shield className="w-32 h-32" />
          </div>
          <p className="text-sm font-bold uppercase tracking-wider mb-2 opacity-90">{tournament.sport} Tournament</p>
          <h2 className="text-2xl font-black leading-tight mb-1">{tournament.name}</h2>
        </div>

        <CardContent className="p-6 md:p-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4 border-4 border-background shadow-md -mt-16 relative z-20">
            <Trophy className="h-8 w-8 text-primary" />
          </div>

          <h3 className="text-xl font-medium mb-1">You've been invited to join</h3>
          <h1 className="text-3xl font-black text-primary mb-2">{team.name}</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Invited by Captain <strong>{team.users?.name}</strong>
          </p>

          {!user ? (
            <div className="w-full space-y-4">
              <div className="bg-secondary/50 p-4 rounded-2xl border border-border/50 text-sm">
                You need to log in to your KhelConnect account to accept this invite.
              </div>
              <Button 
                className="w-full py-6 rounded-xl text-lg font-bold shadow-lg gap-2" 
                onClick={() => {
                  const currentUrl = encodeURIComponent(`/tournaments/${tournamentId}/join?code=${inviteCode}`);
                  router.push(`/login?redirectTo=${currentUrl}`);
                }}
              >
                <LogIn className="h-5 w-5" /> Log In to Join
              </Button>
            </div>
          ) : alreadyInTeam ? (
            <div className="w-full space-y-4">
              <div className="bg-green-500/10 text-green-600 p-4 rounded-2xl border border-green-500/20 flex flex-col items-center gap-2">
                <CheckCircle className="h-8 w-8" />
                <p className="font-bold">You are already in this team!</p>
              </div>
              <Button variant="outline" className="w-full py-6 rounded-xl" onClick={() => router.push(`/tournaments/${tournamentId}`)}>
                Go to Team Dashboard
              </Button>
            </div>
          ) : isTeamFull ? (
            <div className="w-full space-y-4">
              <div className="bg-destructive/10 text-destructive p-4 rounded-2xl border border-destructive/20 flex flex-col items-center gap-2">
                <AlertTriangle className="h-8 w-8" />
                <p className="font-bold">This team is already full.</p>
                <p className="text-xs">Max capacity of {tournament.max_players_per_team} players reached.</p>
              </div>
              <Button variant="outline" className="w-full py-6 rounded-xl" onClick={() => router.push(`/tournaments/${tournamentId}`)}>
                Browse Other Teams
              </Button>
            </div>
          ) : (
            <div className="w-full space-y-3">
              <Button 
                className="w-full py-6 rounded-xl text-lg font-bold shadow-lg transition-transform hover:scale-[1.02]" 
                onClick={handleJoin}
                disabled={isJoining}
              >
                {isJoining ? "Joining..." : (
                  <span className="flex items-center">Join Squad <ArrowRight className="h-5 w-5 ml-2" /></span>
                )}
              </Button>
              <Button variant="ghost" className="w-full rounded-xl" onClick={() => router.push(`/tournaments/${tournamentId}`)}>
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function JoinTeamPage() {
  return (
    <Suspense fallback={<UniversalLoader />}>
      <JoinTeamContent />
    </Suspense>
  )
}