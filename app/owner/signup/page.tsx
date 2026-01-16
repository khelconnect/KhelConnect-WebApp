"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabaseClient" // Client direct

export default function OwnerSignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    // Note: Turf specific details (turfName, location) might need to be 
    // saved to 'turf_owners' or 'turfs' table in a second step or via trigger.
    // For now, let's focus on Auth.
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
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
      // 1. Sign Up with Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone: phone,
            role: 'owner', // 👑 This sets the role for the Trigger
          },
        },
      })

      if (authError) throw authError

      // 2. (Optional) Create the Turf Owner entry
      // Ideally, the 'profiles' trigger handles the user identity.
      // But if you still rely on 'turf_owners' table for specific owner logic:
      if (data.user) {
         await supabase.from("turf_owners").insert({
             id: data.user.id, // Link IDs
             name: name,
             email: email,
             phone: phone
         });
      }

      alert("Account created! Please log in.")
      router.push("/owner/login")

    } catch (err: any) {
      console.error("Signup error:", err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // ... (Input Fields JSX remains similar to before, simplified for this example) ...
  return (
    <div className="container max-w-md mx-auto py-12 px-4">
      <Card className="bg-card border-border rounded-3xl shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Turf Owner Sign Up</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
             {error && <p className="text-sm text-red-500 text-center">{error}</p>}
             
             {/* Name */}
             <div className="space-y-2">
                <Label>Full Name</Label>
                <Input name="name" value={formData.name} onChange={handleChange} required />
             </div>
             
             {/* Email */}
             <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" type="email" value={formData.email} onChange={handleChange} required />
             </div>

             {/* Phone */}
             <div className="space-y-2">
                <Label>Phone</Label>
                <Input name="phone" type="tel" value={formData.phone} onChange={handleChange} required />
             </div>

             {/* Password */}
             <div className="space-y-2">
                <Label>Password</Label>
                <Input name="password" type="password" value={formData.password} onChange={handleChange} required />
             </div>

             <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required />
             </div>

             <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : "Sign Up"}
             </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}