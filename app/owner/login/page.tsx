"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link" // Import Link
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
// 🚨 REMOVED: import { supabase } from "@/lib/supabaseClient"
// 🚨 REMOVED: import bcrypt from "bcryptjs" 

export default function OwnerLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  /**
   * 🔒 SECURE LOGIN HANDLER
   * This function now sends the email/password to a server-side
   * API route instead of pulling the password hash to the client.
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/owner/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Login failed")
      }

      // Store session
      localStorage.setItem("owner_id", data.id)

      // Redirect to owner dashboard
      router.push("/owner/dashboard")
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container max-w-md mx-auto py-12 px-4">
      <Card className="bg-card border-border rounded-3xl shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Turf Owner Login</CardTitle>
          <CardDescription>Sign in to manage your turf</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-mint-dark text-white rounded-full py-6"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging In...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>

          {/* === ADDED SECTION === */}
          <div className="mt-4 text-center text-sm">
            New?{" "}
            <Link 
              href="/owner/signup" 
              className="underline text-primary hover:text-primary/80 font-medium"
            >
              Sign up
            </Link>
          </div>
          {/* === END ADDED SECTION === */}
          
        </CardContent>
      </Card>
    </div>
  )
}