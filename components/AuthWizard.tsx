"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  ArrowLeft, User, Building2, Mail, Lock, Phone, Loader2, Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabaseClient"
import { useUserStore } from "@/lib/userStore"
import { toast } from "sonner"

interface AuthWizardProps {
    onClose: () => void;
}

export function AuthWizard({ onClose }: AuthWizardProps) {
    const router = useRouter();
    const setName = useUserStore((state) => state.setName);
    const setRole = useUserStore((state) => state.setRole);
    
    const [view, setView] = useState<'selection' | 'login' | 'signup' | 'owner-login'>('selection');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
    // Login/Signup States
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otpEmail, setOtpEmail] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [otpSent, setOtpSent] = useState(false);

    const [signupData, setSignupData] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
    const [signupStep, setSignupStep] = useState<'details' | 'otp'>('details');
    const [signupOtp, setSignupOtp] = useState("");

    // --- CRITICAL FIX: Robust Success Handler ---
    const handleAuthSuccess = async (user: any) => {
        setLoading(true);
        try {
            // 1. Try to get the profile from the 'users' table
            let { data: profile } = await supabase
                .from('users')
                .select('name, role')
                .eq('id', user.id)
                .single();
            
            // 2. Fallback: If DB trigger hasn't finished, use metadata from Auth
            const displayName = profile?.name || user.user_metadata?.full_name || signupData.name;
            const displayRole = profile?.role || user.user_metadata?.role || 'user';

            setName(displayName);
            setRole(displayRole);

            // 3. Refresh and Close
            router.refresh();
            
            if (displayRole === 'owner' || displayRole === 'admin') {
                router.push('/owner/dashboard');
            }
            
            onClose(); 
            toast.success(`Welcome back, ${displayName}!`);
        } catch (err) {
            console.error("Auth success processing error:", err);
            onClose(); // Close anyway if we have a session
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent, type: 'password' | 'otp-send' | 'otp-verify') => {
        e.preventDefault();
        setLoading(true); setError("");
        try {
            if (type === 'password') {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                if (data.user) await handleAuthSuccess(data.user);
            } else if (type === 'otp-send') {
                const { error } = await supabase.auth.signInWithOtp({ email: otpEmail });
                if (error) throw error;
                setOtpSent(true);
                toast.info("OTP sent to your email");
            } else {
                const { data, error } = await supabase.auth.verifyOtp({ email: otpEmail, token: otpCode, type: 'email' });
                if (error) throw error;
                if (data.user) await handleAuthSuccess(data.user);
            }
        } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError("");
        if (signupData.password !== signupData.confirm) { setError("Passwords do not match"); setLoading(false); return; }
        
        try {
            const { data, error } = await supabase.auth.signUp({
                email: signupData.email, 
                password: signupData.password,
                options: { 
                    data: { 
                        full_name: signupData.name, 
                        phone: signupData.phone, 
                        role: 'user' 
                    } 
                }
            });
            if (error) throw error;
            
            if (data.user && !data.session) {
                setSignupStep('otp');
            } else if (data.session) {
                await handleAuthSuccess(data.user!);
            }
        } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };

    const handleSignupVerify = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true); setError("");
        try {
            const { data, error } = await supabase.auth.verifyOtp({ 
                email: signupData.email, 
                token: signupOtp, 
                type: 'signup' 
            });
            if (error) throw error;
            if (data.user) await handleAuthSuccess(data.user);
        } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };

    const handleOwnerLogin = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true); setError("");
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            
            const { data: profile } = await supabase.from('users').select('role').eq('id', data.user.id).single();
            if (profile?.role !== 'owner' && profile?.role !== 'admin') {
                await supabase.auth.signOut();
                throw new Error("Access denied. Not a partner account.");
            }
            await handleAuthSuccess(data.user);
        } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };

    // --- VIEWS ---
    if (view === 'selection') {
        return (
            <div className="grid gap-4 py-4">
                <Button className="w-full py-6 text-lg rounded-2xl font-bold bg-primary text-white" onClick={() => setView('login')}>
                    <User className="mr-2 h-5 w-5" /> Player Login / Sign Up
                </Button>
                <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
                </div>
                <Button className="w-full py-6 text-lg rounded-2xl font-bold" variant="outline" onClick={() => setView('owner-login')}>
                    <Building2 className="mr-2 h-5 w-5" /> Partner Login
                </Button>
            </div>
        );
    }

    if (view === 'login') {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <Button variant="ghost" size="sm" onClick={() => setView('selection')} className="p-0 hover:bg-transparent"><ArrowLeft className="h-5 w-5"/></Button>
                    <h3 className="text-xl font-bold">Player Login</h3>
                </div>
                {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl text-center border border-red-100">{error}</p>}
                
                <Tabs defaultValue="password" title="Login Methods">
                    <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-secondary rounded-xl p-1">
                        <TabsTrigger value="password" className="rounded-lg h-full">Password</TabsTrigger>
                        <TabsTrigger value="otp" className="rounded-lg h-full">OTP</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="password">
                        <form onSubmit={(e) => handleLogin(e, 'password')} className="space-y-4">
                            <Input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="py-6 bg-secondary border-transparent rounded-xl focus:ring-primary"/>
                            <Input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="py-6 bg-secondary border-transparent rounded-xl focus:ring-primary"/>
                            <Button className="w-full py-6 rounded-xl font-bold text-lg" disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : "Login"}</Button>
                        </form>
                    </TabsContent>
                    
                    <TabsContent value="otp">
                        {!otpSent ? (
                            <form onSubmit={(e) => handleLogin(e, 'otp-send')} className="space-y-4">
                                <Input placeholder="Email" type="email" value={otpEmail} onChange={e => setOtpEmail(e.target.value)} required className="py-6 bg-secondary border-transparent rounded-xl focus:ring-primary"/>
                                <Button className="w-full py-6 rounded-xl font-bold text-lg" disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : "Send OTP"}</Button>
                            </form>
                        ) : (
                            <form onSubmit={(e) => handleLogin(e, 'otp-verify')} className="space-y-4">
                                <Input placeholder="6-digit Code" value={otpCode} onChange={e => setOtpCode(e.target.value)} className="text-center text-2xl tracking-widest py-8 bg-secondary border-transparent rounded-xl" maxLength={6}/>
                                <Button className="w-full py-6 rounded-xl font-bold text-lg" disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : "Verify & Login"}</Button>
                                <Button type="button" variant="ghost" className="w-full" onClick={() => setOtpSent(false)}>Change Email</Button>
                            </form>
                        )}
                    </TabsContent>
                </Tabs>
                <p className="text-center text-sm mt-4">
                    New here? <button onClick={() => setView('signup')} className="text-primary font-bold hover:underline">Create Account</button>
                </p>
            </div>
        );
    }

    if (view === 'signup') {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <Button variant="ghost" size="sm" onClick={() => setView('login')} className="p-0 hover:bg-transparent"><ArrowLeft className="h-5 w-5"/></Button>
                    <h3 className="text-xl font-bold">Create Account</h3>
                </div>
                {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl text-center border border-red-100">{error}</p>}

                {signupStep === 'details' ? (
                    <form onSubmit={handleSignup} className="space-y-3">
                        <Input placeholder="Full Name" value={signupData.name} onChange={e => setSignupData({...signupData, name: e.target.value})} required className="py-6 bg-secondary border-transparent rounded-xl"/>
                        <Input placeholder="Email" type="email" value={signupData.email} onChange={e => setSignupData({...signupData, email: e.target.value})} required className="py-6 bg-secondary border-transparent rounded-xl"/>
                        <Input placeholder="Phone Number" type="tel" value={signupData.phone} onChange={e => setSignupData({...signupData, phone: e.target.value})} required className="py-6 bg-secondary border-transparent rounded-xl"/>
                        <Input placeholder="Password" type="password" value={signupData.password} onChange={e => setSignupData({...signupData, password: e.target.value})} required className="py-6 bg-secondary border-transparent rounded-xl"/>
                        <Input placeholder="Confirm Password" type="password" value={signupData.confirm} onChange={e => setSignupData({...signupData, confirm: e.target.value})} required className="py-6 bg-secondary border-transparent rounded-xl"/>
                        <Button className="w-full py-6 rounded-xl font-bold text-lg mt-2" disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : "Sign Up"}</Button>
                    </form>
                ) : (
                    <form onSubmit={handleSignupVerify} className="space-y-4">
                        <div className="text-center mb-2">
                            <p className="text-sm text-muted-foreground">Enter code sent to {signupData.email}</p>
                        </div>
                        <Input placeholder="000000" value={signupOtp} onChange={e => setSignupOtp(e.target.value)} className="text-center text-2xl tracking-widest py-8 bg-secondary border-transparent rounded-xl" maxLength={6}/>
                        <Button className="w-full py-6 rounded-xl font-bold text-lg" disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : "Verify & Sign Up"}</Button>
                        <Button type="button" variant="ghost" className="w-full" onClick={() => setSignupStep('details')}>Edit Details</Button>
                    </form>
                )}
            </div>
        );
    }

    if (view === 'owner-login') {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <Button variant="ghost" size="sm" onClick={() => setView('selection')} className="p-0 hover:bg-transparent"><ArrowLeft className="h-5 w-5"/></Button>
                    <h3 className="text-xl font-bold">Partner Login</h3>
                </div>
                {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl text-center border border-red-100">{error}</p>}
                <form onSubmit={handleOwnerLogin} className="space-y-4">
                    <Input placeholder="Partner Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="py-6 bg-secondary border-transparent rounded-xl"/>
                    <Input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="py-6 bg-secondary border-transparent rounded-xl"/>
                    <Button className="w-full py-6 rounded-xl font-bold text-lg" disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : "Access Dashboard"}</Button>
                </form>
            </div>
        );
    }

    return null; 
}