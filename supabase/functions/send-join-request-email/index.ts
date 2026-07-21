import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Grab env variables
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  try {
    // 1. Parse the Webhook Payload
    const payload = await req.json()
    const { record } = payload

    // Only process INSERTS for 'team_members' with 'pending' status
    if (payload.type !== 'INSERT' || record.status !== 'pending') {
      return new Response("Not a pending join request. Ignored.", { status: 200 })
    }

    // 2. Initialize Supabase Client with Service Role (to bypass RLS for backend tasks)
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // 3. Fetch the Captain's Email & Team Info
    const { data: teamData, error: teamError } = await supabase
      .from('tournament_teams')
      .select(`
        name,
        users!tournament_teams_captain_id_fkey ( name, email )
      `)
      .eq('id', record.team_id)
      .single()

    if (teamError || !teamData) throw new Error("Could not find team or captain")

    // 4. Fetch the Requester's Info
    const { data: requesterData, error: reqError } = await supabase
      .from('users')
      .select('name')
      .eq('id', record.user_id)
      .single()

    if (reqError || !requesterData) throw new Error("Could not find requester")

    const captainEmail = teamData.users.email
    const captainName = teamData.users.name
    const teamName = teamData.name
    const requesterName = requesterData.name
    const joinMessage = record.join_message || "No message provided."

    // 5. Send Email via Resend API
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'KhelConnect Tournaments <tournaments@yourdomain.com>', // Update with your verified domain
        to: captainEmail,
        subject: `New Join Request: ${requesterName} wants to join ${teamName}!`,
        html: `
          <h2>Hello ${captainName},</h2>
          <p><strong>${requesterName}</strong> has requested to join your team, <strong>${teamName}</strong>.</p>
          <p><strong>Message from player:</strong></p>
          <blockquote style="border-left: 4px solid #ccc; padding-left: 10px; color: #555;">
            "${joinMessage}"
          </blockquote>
          <p>Log in to your KhelConnect Captain Dashboard to approve or decline this request.</p>
          <a href="https://khelconnect.in/tournaments" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: #fff; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
        `
      })
    })

    if (!resendRes.ok) {
      const errorText = await resendRes.text()
      throw new Error(`Failed to send email: ${errorText}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error: any) {
    console.error("Webhook processing error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})