"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabaseClient" 
import Link from "next/link"

export default function OwnerSignupPage() {
  const router = useRouter()
  
  // State for the Signup Form
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  })

  // State for the OTP Form
  const [otp, setOtp] = useState("")
  const [step, setStep] = useState<"signup" | "verify">("signup")
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // --- STEP 1: SIGN UP ---
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setMessage("")

    const { name, email, password, confirmPassword, phone } = formData

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      // 1. Sign Up with Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone: phone,
            role: 'owner', // 👑 This sets the role for the Database Trigger
          },
        },
      })

      if (authError) throw authError

      // 2. Check if session was created immediately (Auto-confirm enabled) or verification needed
      if (data.session) {
        // User is already logged in (Email confirmation might be disabled)
        router.push("/owner/dashboard")
      } else {
        // User created, but needs verification. Show OTP screen.
        setStep("verify")
        setMessage(`Verification code sent to ${email}`)
      }

    } catch (err: any) {
      console.error("Signup error:", err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // --- STEP 2: VERIFY OTP ---
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // Verify the OTP specifically for Signup
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: otp,
        type: 'signup', // This confirms the user's email address
      })

      if (verifyError) throw verifyError

      // Success! Redirect to Owner Dashboard
      router.refresh() // Sync cookies
      router.push("/owner/dashboard")

    } catch (err: any) {
      setError(err.message || "Invalid verification code")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container max-w-md mx-auto py-12 px-4">
      <Card className="bg-card border-border rounded-3xl shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">
            {step === "signup" ? "Turf Owner Sign Up" : "Verify Your Email"}
          </CardTitle>
          <CardDescription>
            {step === "signup" 
              ? "Register your business with KhelConnect" 
              : `Enter the code sent to ${formData.email}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          
          {error && <div className="mb-4 p-3 bg-red-500/10 text-red-500 text-sm rounded-lg text-center">{error}</div>}
          {message && <div className="mb-4 p-3 bg-green-500/10 text-green-500 text-sm rounded-lg text-center">{message}</div>}

          {step === "signup" ? (
            // --- FORM 1: SIGNUP ---
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input name="name" value={formData.name} onChange={handleChange} required placeholder="John Doe" />
              </div>
              
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="owner@example.com" />
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <Input name="phone" type="tel" value={formData.phone} onChange={handleChange} required placeholder="+91 98765 43210" />
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <Input name="password" type="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" />
              </div>

              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required placeholder="••••••••" />
              </div>

              <Button type="submit" className="w-full py-6 rounded-xl" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : "Sign Up"}
              </Button>
              
              <div className="text-center text-sm mt-4">
                Already have an account? <Link href="/owner/login" className="text-primary hover:underline">Log in</Link>
              </div>
            </form>

          ) : (
            // --- FORM 2: VERIFY OTP ---
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="space-y-2">
                <Label>Verification Code</Label>
                <Input 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  className="text-center text-2xl tracking-widest h-14" 
                  maxLength={6} 
                  placeholder="123456" 
                  required 
                />
              </div>

              <Button type="submit" className="w-full py-6 rounded-xl" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : "Verify & Login"}
              </Button>

              <Button 
                type="button" 
                variant="ghost" 
                className="w-full"
                onClick={() => setStep("signup")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Signup
              </Button>
            </form>
          )}

        </CardContent>
      </Card>
    </div>
  )
}