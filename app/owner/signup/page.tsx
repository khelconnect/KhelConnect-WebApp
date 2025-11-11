"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Eye, EyeOff } from "lucide-react"

export default function OwnerSignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    turfName: "",
    location: "",
    phone: "",
  })
  const [showPassword, setShowPassword] = useState(false)
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

    const { password, confirmPassword, ...restOfData } = formData

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      // 🔒 Send data to our secure API route
      const response = await fetch("/api/owner/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, ...restOfData }), // Send all data
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Signup failed. Please try again.")
      }

      // Success
      alert("Account created successfully! Please log in.")
      router.push("/owner/login")

    } catch (err: any) {
      console.error("Signup error:", err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    // UPDATED: Changed py-12 to py-6 sm:py-12 for better mobile padding
    <div className="container max-w-md mx-auto py-6 sm:py-12 px-4">
      <Card className="bg-card border-border rounded-3xl shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Turf Owner Sign Up</CardTitle>
          <CardDescription>Create an account to manage your turf bookings</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            
            <InputField id="name" label="Full Name" value={formData.name} onChange={handleChange} />
            <InputField id="email" label="Email Address" type="email" value={formData.email} onChange={handleChange} />

            <PasswordField
              id="password"
              label="Password"
              value={formData.password}
              onChange={handleChange}
              showPassword={showPassword}
              toggle={() => setShowPassword(!showPassword)}
            />

            <InputField
              id="confirmPassword"
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />

            <InputField
              id="turfName"
              label="Turf Name"
              value={formData.turfName}
              onChange={handleChange}
            />
            <InputField
              id="location"
              label="Location"
              value={formData.location}
              onChange={handleChange}
            />
            <InputField
              id="phone"
              label="Phone Number"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
            />

            <Button
              type="submit"
              // UPDATED: Changed py-6 to py-4 sm:py-6 and adjusted text size
              className="w-full bg-primary hover:bg-mint-dark text-white rounded-full py-4 sm:py-6 text-base sm:text-lg"
              disabled={isLoading}
            >
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...</> : "Sign Up"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// Custom reusable field components
function InputField({ id, label, type = "text", value, onChange }: any) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={`Enter ${label.toLowerCase()}`}
        className="bg-secondary border-border"
      />
    </div>
  )
}

function PasswordField({ id, label, value, onChange, showPassword, toggle }: any) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          value={value}
          onChange={onChange}
          className="bg-secondary border-border pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={toggle}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
    </div>
  )
}