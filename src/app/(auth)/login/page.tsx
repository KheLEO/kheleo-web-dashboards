"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, Phone, Lock, KeyRound, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { homeForRole } from "@/server/auth/permissions";
import type { UserRole } from "@/contracts/enums.generated";

export default function LoginPage() {
  const router = useRouter();
  const { setSession, switchDemoRole } = useAuthStore();

  const [method, setMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsOtpSent(true);
      setIsLoading(false);
      toast.success("OTP sent! For demo/test mode, use: 123456");
    }, 600);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (method === "email") {
        if (!email || !password) {
          toast.error("Please enter your email and password");
          setIsLoading(false);
          return;
        }

        // Standard auth flow with Supabase / Mock session
        const mockUser = {
          id: "usr-" + Math.random().toString(36).substring(2, 9),
          name: email.split("@")[0] || "KheLEO Athlete",
          email,
          phone: null,
          role: "ATHLETE" as UserRole,
          isGovIdVerified: true,
          athleteProfileId: "prof-001",
          gtiScore: 720,
        };

        const mockToken = "kheleo-session-" + btoa(email);
        setSession(mockUser, mockToken);
        toast.success(`Welcome back, ${mockUser.name}!`);
        router.replace(homeForRole(mockUser.role));
      } else {
        if (!otp || otp.length !== 6) {
          toast.error("Please enter the 6-digit OTP");
          setIsLoading(false);
          return;
        }

        const mockUser = {
          id: "usr-" + Math.random().toString(36).substring(2, 9),
          name: "Mobile Athlete",
          email: null,
          phone,
          role: "ATHLETE" as UserRole,
          isGovIdVerified: true,
          athleteProfileId: "prof-002",
          gtiScore: 740,
        };

        const mockToken = "kheleo-otp-token-" + btoa(phone);
        setSession(mockUser, mockToken);
        toast.success("Phone verified successfully!");
        router.replace(homeForRole(mockUser.role));
      }
    } catch {
      toast.error("Authentication failed. Please verify credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = (role: "ATHLETE" | "ORGANIZER" | "SCOUT" | "SUPER_ADMIN") => {
    switchDemoRole(role);
    toast.success(`Switched to verified ${role} persona`);
    router.replace(homeForRole(role));
  };

  return (
    <div className="flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Welcome back to <span className="text-primary font-black">KheLEO</span>
        </h2>
        <p className="mt-1.5 text-sm text-kheleo-silver-muted">
          Sign in using your verified credentials or select an instant campus testing persona.
        </p>
      </div>

      {/* Auth Method Selector */}
      <div className="flex rounded-lg border border-border bg-kheleo-surface p-1 mb-6">
        <button
          type="button"
          onClick={() => {
            setMethod("email");
            setIsOtpSent(false);
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-xs font-semibold transition-all ${
            method === "email"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          Email & Password
        </button>
        <button
          type="button"
          onClick={() => {
            setMethod("phone");
            setIsOtpSent(false);
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-xs font-semibold transition-all ${
            method === "phone"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Phone className="h-3.5 w-3.5" />
          Phone & OTP
        </button>
      </div>

      {/* Login Form */}
      {method === "email" ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-kheleo-silver-chrome mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="athlete@kheleo.in"
                required
                className="w-full rounded-lg border border-input bg-kheleo-canvas pl-9 pr-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-kheleo-silver-chrome">
                Password
              </label>
              <a href="#" className="text-xs text-primary hover:underline">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full rounded-lg border border-input bg-kheleo-canvas pl-9 pr-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:opacity-95 disabled:opacity-50"
          >
            {isLoading ? "Signing in..." : "Sign in with Credentials"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <form onSubmit={isOtpSent ? handleLogin : handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-kheleo-silver-chrome mb-1.5">
              Mobile Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                required
                disabled={isOtpSent}
                className="w-full rounded-lg border border-input bg-kheleo-canvas pl-9 pr-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
              />
            </div>
          </div>

          {isOtpSent && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-kheleo-silver-chrome">
                  6-Digit OTP Code
                </label>
                <button
                  type="button"
                  onClick={() => setIsOtpSent(false)}
                  className="text-xs text-primary hover:underline"
                >
                  Change number
                </button>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-input bg-kheleo-canvas pl-9 pr-3 py-2.5 font-mono text-base tracking-widest text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:opacity-95 disabled:opacity-50"
          >
            {isLoading
              ? "Verifying..."
              : isOtpSent
                ? "Verify OTP & Sign In"
                : "Request Verification OTP"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      )}

      {/* Quick Demo Role Shortcuts */}
      <div className="mt-8 rounded-xl border border-border/80 bg-kheleo-canvas/60 p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Quick Demo Sign-In
          </span>
          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
            1-Click Pass
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Jump into any verified workspace instantly for evaluation:
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => handleQuickDemo("ATHLETE")}
            className="flex flex-col items-center justify-center rounded-lg border border-border bg-kheleo-surface p-2 text-center text-xs transition-colors hover:border-primary hover:bg-secondary"
          >
            <span className="text-lg">🏅</span>
            <span className="font-semibold text-foreground mt-1">Athlete</span>
            <span className="text-[10px] text-muted-foreground">GTI 785</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickDemo("ORGANIZER")}
            className="flex flex-col items-center justify-center rounded-lg border border-border bg-kheleo-surface p-2 text-center text-xs transition-colors hover:border-primary hover:bg-secondary"
          >
            <span className="text-lg">🏟️</span>
            <span className="font-semibold text-foreground mt-1">Organizer</span>
            <span className="text-[10px] text-muted-foreground">Tournaments</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickDemo("SCOUT")}
            className="flex flex-col items-center justify-center rounded-lg border border-border bg-kheleo-surface p-2 text-center text-xs transition-colors hover:border-primary hover:bg-secondary"
          >
            <span className="text-lg">🔭</span>
            <span className="font-semibold text-foreground mt-1">Scout</span>
            <span className="text-[10px] text-muted-foreground">Radar</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickDemo("SUPER_ADMIN")}
            className="flex flex-col items-center justify-center rounded-lg border border-border bg-kheleo-surface p-2 text-center text-xs transition-colors hover:border-primary hover:bg-secondary"
          >
            <span className="text-lg">🛡️</span>
            <span className="font-semibold text-foreground mt-1">Admin</span>
            <span className="text-[10px] text-muted-foreground">Audit</span>
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
        <span>Need a sports account?</span>
        <Link href="/signup" className="font-semibold text-primary underline underline-offset-4">
          Register new account
        </Link>
      </div>
    </div>
  );
}
