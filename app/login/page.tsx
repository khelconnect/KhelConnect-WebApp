"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useUserStore } from "@/lib/userStore";

export default function LoginPage() {
  const router = useRouter();
  const setName = useUserStore((state) => state.setName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const handleAuthSuccess = async (userId: string) => {
  try {
    setLoading(true);
    
    // 1. Fetch data
    const { data: user, error: dbError } = await supabase
      .from('users')
      .select('name, role')
      .eq('id', userId)
      .single();

    if (dbError || !user) throw new Error("User data not found");

    // 2. Set Zustand Store
    setName(user.name);

    // 3. IMPORTANT: Wait for Supabase to finish setting the auth cookie
    // Next.js client-side router needs a moment to catch up
    await router.refresh();
    
    // 4. Role-Based Redirect
    if (user.role === 'admin') {
      // Use window.location.replace to prevent going "back" to login
      window.location.replace("/admin");
    } else if (user.role === 'owner') {
      window.location.replace("/owner/dashboard");
    } else {
      window.location.replace("/");
    }
  } catch (err: any) {
    console.error("Login Sync Error:", err.message);
    setError("Account verified, but profile loading failed. Please try logging in again.");
    setLoading(false);
  }
};

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (data?.user) await handleAuthSuccess(data.user.id);
    } catch (err: any) {
      setError(err.message || "Invalid login credentials");
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({ email: otpEmail });
      if (otpErr) throw otpErr;
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        email: otpEmail,
        token: otpCode,
        type: "email", 
      });
      if (verifyErr) throw verifyErr;
      if (data?.user) await handleAuthSuccess(data.user.id);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-md mx-auto py-12 px-4">
      <Card className="bg-card border-border rounded-3xl shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Login to KhelConnect</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="password">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="otp">OTP Login</TabsTrigger>
            </TabsList>

            {error && <p className="text-sm text-red-500 text-center mb-4 p-2 bg-red-500/10 rounded-lg">{error}</p>}

            <TabsContent value="password">
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    placeholder="Enter email"
                    className="bg-secondary" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    placeholder="Enter password"
                    className="bg-secondary" 
                  />
                </div>
                <Button type="submit" className="w-full py-6 rounded-full" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : "Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="otp">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)} required placeholder="Enter your email" className="bg-secondary" />
                  </div>
                  <Button type="submit" className="w-full py-6 rounded-full" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : "Send OTP"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label>OTP Code</Label>
                    <Input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} className="text-center text-2xl tracking-widest bg-secondary" maxLength={6} required />
                  </div>
                  <Button type="submit" className="w-full py-6 rounded-full" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : "Verify & Login"}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setOtpSent(false)}>Use a different email</Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
          <div className="mt-6 text-center text-sm">
            Don't have an account? <Link href="/signup" className="underline text-primary">Sign up</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}