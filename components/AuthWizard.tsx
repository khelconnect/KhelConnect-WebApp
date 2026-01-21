"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  ArrowLeft, User, Building2, Mail, Lock, Phone, Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabaseClient"
import { useUserStore } from "@/lib/userStore"

interface AuthWizardProps {
  onClose: () => void;
}

export function AuthWizard({ onClose }: AuthWizardProps) {
    const router = useRouter();
    const setName = useUserStore((state) => state.setName);
    const setRole = useUserStore((state) => state.setRole);
    
    // View State
    const [view, setView] = useState<'selection' | 'login' | 'signup' | 'owner-login'>('selection');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
    // Login Form States
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otpEmail, setOtpEmail] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [otpSent, setOtpSent] = useState(false);

    // Signup Form States
    const [signupData, setSignupData] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
    const [signupStep, setSignupStep] = useState<'details' | 'otp'>('details');
    const [signupOtp, setSignupOtp] = useState("");

    // --- HELPERS ---
    const handleAuthSuccess = async (userId: string) => {
        setLoading(true);
        const { data: user } = await supabase.from('users').select('name, role').eq('id', userId).single();
        
        if (user) {
            setName(user.name);
            setRole(user.role);
            router.refresh();
            
            if (user.role === 'owner' || user.role === 'admin') {
                router.push('/owner/dashboard');
                onClose();
            } else {
                onClose(); // Close sheet on current page
            }
        }
        setLoading(false);
    };

    // --- HANDLERS ---
    const handleLogin = async (e: React.FormEvent, type: 'password' | 'otp-send' | 'otp-verify') => {
        e.preventDefault();
        setLoading(true); setError("");
        try {
            if (type === 'password') {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                if (data.user) await handleAuthSuccess(data.user.id);
            } else if (type === 'otp-send') {
                const { error } = await supabase.auth.signInWithOtp({ email: otpEmail });
                if (error) throw error;
                setOtpSent(true);
            } else {
                const { data, error } = await supabase.auth.verifyOtp({ email: otpEmail, token: otpCode, type: 'email' });
                if (error) throw error;
                if (data.user) await handleAuthSuccess(data.user.id);
            }
        } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError("");
        if (signupData.password !== signupData.confirm) { setError("Passwords do not match"); setLoading(false); return; }
        
        try {
            const { data, error } = await supabase.auth.signUp({
                email: signupData.email, password: signupData.password,
                options: { data: { full_name: signupData.name, phone: signupData.phone, role: 'user' } }
            });
            if (error) throw error;
            
            if (data.user && !data.session) {
                setSignupStep('otp'); // Move to OTP entry
            } else if (data.session) {
                await handleAuthSuccess(data.user!.id);
            }
        } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };

    const handleSignupVerify = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true); setError("");
        try {
            const { data, error } = await supabase.auth.verifyOtp({ email: signupData.email, token: signupOtp, type: 'signup' });
            if (error) throw error;
            if (data.user) await handleAuthSuccess(data.user.id);
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
            // Success
            setName(data.user.user_metadata.full_name);
            setRole(profile.role);
            router.refresh();
            router.push('/owner/dashboard');
            onClose();
        } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };

    // --- RENDER VIEWS ---

    // 1. Initial Selection
    if (view === 'selection') {
        return (
            <div className="grid gap-4 py-4">
                <Button className="w-full py-6 text-lg rounded-xl font-qualy-bold" onClick={() => setView('login')}>
                    <User className="mr-2 h-5 w-5" /> Player Login / Sign Up
                </Button>
                
                <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground font-qualy-light">Or</span></div>
                </div>

                <Button className="w-full py-6 text-lg rounded-xl font-qualy-bold" variant="outline" onClick={() => setView('owner-login')}>
                    <Building2 className="mr-2 h-5 w-5" /> Partner Login
                </Button>
                <div className="text-center text-sm text-muted-foreground font-qualy-light">
                    New Partner? <button onClick={() => window.location.href = '/owner/signup'} className="text-primary hover:underline font-qualy-bold">Register here</button>
                </div>
            </div>
        );
    }

    // 2. Player Login
    if (view === 'login') {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <Button variant="ghost" size="sm" onClick={() => setView('selection')} className="p-0 hover:bg-transparent"><ArrowLeft className="h-5 w-5"/></Button>
                    <h3 className="text-xl font-qualy-bold">Player Login</h3>
                </div>
                {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg text-center">{error}</p>}
                
                <Tabs defaultValue="password">
                    <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-secondary rounded-xl p-1">
                        <TabsTrigger value="password" className="rounded-lg h-full">Password</TabsTrigger>
                        <TabsTrigger value="otp" className="rounded-lg h-full">OTP</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="password">
                        <form onSubmit={(e) => handleLogin(e, 'password')} className="space-y-4">
                            <Input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="py-6 bg-secondary border-transparent focus:border-primary rounded-xl"/>
                            <Input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="py-6 bg-secondary border-transparent focus:border-primary rounded-xl"/>
                            <Button className="w-full py-6 rounded-xl font-qualy-bold text-lg" disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : "Login"}</Button>
                        </form>
                    </TabsContent>
                    
                    <TabsContent value="otp">
                        {!otpSent ? (
                            <form onSubmit={(e) => handleLogin(e, 'otp-send')} className="space-y-4">
                                <Input placeholder="Email" type="email" value={otpEmail} onChange={e => setOtpEmail(e.target.value)} required className="py-6 bg-secondary border-transparent focus:border-primary rounded-xl"/>
                                <Button className="w-full py-6 rounded-xl font-qualy-bold text-lg" disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : "Send OTP"}</Button>
                            </form>
                        ) : (
                            <form onSubmit={(e) => handleLogin(e, 'otp-verify')} className="space-y-4">
                                <Input placeholder="Enter 6-digit Code" value={otpCode} onChange={e => setOtpCode(e.target.value)} className="text-center text-2xl tracking-widest py-6 bg-secondary border-transparent focus:border-primary rounded-xl" maxLength={6}/>
                                <Button className="w-full py-6 rounded-xl font-qualy-bold text-lg" disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : "Verify & Login"}</Button>
                                <Button type="button" variant="ghost" className="w-full" onClick={() => setOtpSent(false)}>Change Email</Button>
                            </form>
                        )}
                    </TabsContent>
                </Tabs>
                <p className="text-center text-sm font-qualy-light mt-4">
                    New here? <button onClick={() => setView('signup')} className="text-primary font-qualy-bold hover:underline">Create Account</button>
                </p>
            </div>
        );
    }

    // 3. Player Sign Up
    if (view === 'signup') {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <Button variant="ghost" size="sm" onClick={() => setView('login')} className="p-0 hover:bg-transparent"><ArrowLeft className="h-5 w-5"/></Button>
                    <h3 className="text-xl font-qualy-bold">Create Account</h3>
                </div>
                {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg text-center">{error}</p>}

                {signupStep === 'details' ? (
                    <form onSubmit={handleSignup} className="space-y-3">
                        <Input placeholder="Full Name" value={signupData.name} onChange={e => setSignupData({...signupData, name: e.target.value})} required className="py-6 bg-secondary border-transparent rounded-xl"/>
                        <Input placeholder="Email" type="email" value={signupData.email} onChange={e => setSignupData({...signupData, email: e.target.value})} required className="py-6 bg-secondary border-transparent rounded-xl"/>
                        <Input placeholder="Phone Number" type="tel" value={signupData.phone} onChange={e => setSignupData({...signupData, phone: e.target.value})} required className="py-6 bg-secondary border-transparent rounded-xl"/>
                        <Input placeholder="Password" type="password" value={signupData.password} onChange={e => setSignupData({...signupData, password: e.target.value})} required className="py-6 bg-secondary border-transparent rounded-xl"/>
                        <Input placeholder="Confirm Password" type="password" value={signupData.confirm} onChange={e => setSignupData({...signupData, confirm: e.target.value})} required className="py-6 bg-secondary border-transparent rounded-xl"/>
                        <Button className="w-full py-6 rounded-xl font-qualy-bold text-lg mt-2" disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : "Sign Up"}</Button>
                    </form>
                ) : (
                    <form onSubmit={handleSignupVerify} className="space-y-4 py-4">
                        <div className="text-center mb-4">
                            <p className="text-sm text-muted-foreground">Enter the code sent to {signupData.email}</p>
                        </div>
                        <Input placeholder="Enter OTP" value={signupOtp} onChange={e => setSignupOtp(e.target.value)} className="text-center text-2xl tracking-widest py-6 bg-secondary border-transparent rounded-xl" maxLength={6}/>
                        <Button className="w-full py-6 rounded-xl font-qualy-bold text-lg" disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : "Verify & Sign Up"}</Button>
                        <Button type="button" variant="ghost" className="w-full" onClick={() => setSignupStep('details')}>Back</Button>
                    </form>
                )}
            </div>
        );
    }

    // 4. Partner Login
    if (view === 'owner-login') {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <Button variant="ghost" size="sm" onClick={() => setView('selection')} className="p-0 hover:bg-transparent"><ArrowLeft className="h-5 w-5"/></Button>
                    <h3 className="text-xl font-qualy-bold">Partner Login</h3>
                </div>
                {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg text-center">{error}</p>}
                
                <form onSubmit={handleOwnerLogin} className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-4 top-4 h-5 w-5 text-muted-foreground"/>
                        <Input placeholder="Partner Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="py-6 pl-12 bg-secondary border-transparent rounded-xl"/>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-4 h-5 w-5 text-muted-foreground"/>
                        <Input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="py-6 pl-12 bg-secondary border-transparent rounded-xl"/>
                    </div>
                    <Button className="w-full py-6 rounded-xl font-qualy-bold text-lg" disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : "Access Dashboard"}</Button>
                </form>
            </div>
        );
    }

    return null; 
}