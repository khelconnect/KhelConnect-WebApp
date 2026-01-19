"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useUserStore } from "@/lib/userStore"

export default function PlayerSignupPage() {
  const router = useRouter()
  const setName = useUserStore((state) => state.setName)
  const [step, setStep] = useState<"details" | "otp">("details")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  })
  const [otp, setOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const { name, email, password, confirmPassword, phone } = formData

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone: phone,
            role: 'user', 
          },
        },
      })

      if (authError) throw authError

      // If Supabase requires email confirmation (OTP), move to OTP step
      if (data.user && !data.session) {
        setStep("otp")
      } else if (data.session) {
        // If auto-logged in, update store and redirect
        setName(name)
        router.push("/")
        router.refresh()
      }

    } catch (err: any) {
      console.error("Signup error:", err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: otp,
        type: "signup",
      })

      if (verifyError) throw verifyError

      // Update Zustand store with the name from our form
      setName(formData.name)

      // Success - Redirect to Home to show the updated Navbar
      router.push("/")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Invalid OTP code")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container max-w-md mx-auto py-12 px-4">
      <Card className="bg-card border-border rounded-3xl shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">
            {step === "details" ? "Player Sign Up" : "Verify Your Email"}
          </CardTitle>
          <CardDescription>
            {step === "details" 
              ? "Create an account to book turfs instantly" 
              : `Enter the 6-digit code sent to ${formData.email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-red-500 text-center mb-4 p-2 bg-red-500/10 rounded-lg">{error}</p>}

          {step === "details" ? (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleChange} required className="bg-secondary border-border py-6" />
              </div>
              
              <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required className="bg-secondary border-border py-6" />
              </div>

              <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} required className="bg-secondary border-border py-6" />
              </div>

              <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required className="bg-secondary border-border py-6" />
              </div>

              <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required className="bg-secondary border-border py-6" />
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-mint-dark text-white rounded-full py-6" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : "Get OTP Code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="text-center text-2xl tracking-widest bg-secondary border-border py-8"
                  maxLength={6}
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-mint-dark text-white rounded-full py-6" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : "Verify & Sign Up"}
              </Button>
              <Button 
                variant="ghost" 
                type="button" 
                className="w-full" 
                onClick={() => setStep("details")}
                disabled={isLoading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to details
              </Button>
            </form>
          )}

          {step === "details" && (
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link href="/login" className="underline text-primary hover:text-primary/80 font-medium">
                Log in
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}