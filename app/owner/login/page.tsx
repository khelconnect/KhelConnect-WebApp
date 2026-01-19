"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Loader2, Lock, Mail } from "lucide-react"
import { supabase } from "@/lib/supabaseClient" 

export default function OwnerLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // 1. Supabase Auth Login
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError
      if (!data.user) throw new Error("No user found");

      // 2. Check Role (Corrected to use 'users' table)
      const { data: userProfile, error: profileError } = await supabase
        .from("users") // <--- FIXED: Was 'profiles'
        .select("role")
        .eq("id", data.user.id)
        .single()

      if (profileError || !userProfile) {
         // Fallback: If DB row is missing but Auth worked, user likely needs verification
         // We let them through to dashboard where "Unverified" screen handles it
         console.warn("User profile missing, redirecting to pending screen...");
      } else {
         // Strict Role Check
         if (userProfile.role !== 'owner' && userProfile.role !== 'admin') {
           await supabase.auth.signOut(); 
           throw new Error("Access denied. This account is not a Turf Owner.");
         }
      }

      // 3. Cookie Sync & Redirect
      // Force a router refresh to ensure Middleware sees the new cookie
      router.refresh(); 
      
      // Small delay to ensure cookies are set before redirecting
      await new Promise(resolve => setTimeout(resolve, 100));
      
      router.push("/owner/dashboard");
      
    } catch (err: any) {
      console.error("Owner Login Error:", err);
      setError(err.message || "Login failed");
      setIsLoading(false); // Only stop loading on error (on success we redirect)
    }
  }

  return (
    <div className="container max-w-md mx-auto py-12 px-4 min-h-screen flex items-center justify-center">
      <Card className="bg-card border-border rounded-3xl shadow-2xl w-full">
        <CardHeader className="space-y-2 text-center pb-8">
          <CardTitle className="text-3xl font-bold">Partner Login</CardTitle>
          <CardDescription className="text-base">
            Sign in to your Turf Manager Dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@turf.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-secondary border-border pl-10 py-6 rounded-xl"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <Link href="#" className="text-xs text-primary hover:underline" onClick={(e) => e.preventDefault()}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-secondary border-border pl-10 py-6 rounded-xl"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center font-medium">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl py-6 text-lg font-medium transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...
                </>
              ) : (
                "Access Dashboard"
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center text-sm text-muted-foreground">
            Want to list your turf?{" "}
            <Link 
              href="/owner/signup" 
              className="text-primary hover:text-primary/80 font-semibold hover:underline"
            >
              Apply as a Partner
            </Link>
          </div>
          
        </CardContent>
      </Card>
    </div>
  )
}