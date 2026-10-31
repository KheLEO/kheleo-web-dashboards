"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  User,
  Trophy,
  Search,
  ShieldAlert,
  Mail,
  Phone,
  Lock,
  ArrowRight,
  CheckCircle2,
  Key,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { homeForRole } from "@/server/auth/permissions";
import type { UserRole } from "@/contracts/enums.generated";

export default function SignupPage() {
  const router = useRouter();
  const { setSession } = useAuthStore();

  const [role, setRole] = useState<UserRole>("ATHLETE");
  const [adminCode, setAdminCode] = useState("");
  const [method, setMethod] = useState<"email" | "phone">("email");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const roleCards = [
    {
      id: "ATHLETE" as UserRole,
      title: "Player / Athlete",
      desc: "Permanent Sports Passport, GTI tracking, and AI-verified drills.",
      icon: User,
    },
    {
      id: "ORGANIZER" as UserRole,
      title: "Tournament Organizer",
      desc: "Fair-play bracket hosting, roster verification, and safety radar.",
      icon: Trophy,
    },
    {
      id: "SCOUT" as UserRole,
      title: "Scout / Academy",
      desc: "Discover uncorrupted grassroots talent and filter verified metrics.",
      icon: Search,
    },
    {
      id: "SUPER_ADMIN" as UserRole,
      title: "Admin / Federation",
      desc: "Platform governance, anti-sandbagging audits, and identity security.",
      icon: ShieldAlert,
    },
  ];

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!fullName) {
        toast.error("Please enter your full legal name");
        setIsLoading(false);
        return;
      }

      if (role === "SUPER_ADMIN") {
        if (adminCode.trim().toUpperCase() !== "KHELEO-ADMIN-2026") {
          toast.error("Invalid Admin Secret Code. Access restricted to authorized personnel.");
          setIsLoading(false);
          return;
        }
      }

      if (method === "email" && (!email || !password)) {
        toast.error("Please provide a valid email and secure password");
        setIsLoading(false);
        return;
      }

      if (method === "phone" && (!phone || phone.length < 10)) {
        toast.error("Please provide a valid 10-digit mobile number");
        setIsLoading(false);
        return;
      }

      const newUserId = "usr-" + Math.random().toString(36).substring(2, 9);
      const isAthlete = role === "ATHLETE";

      const newUser = {
        id: newUserId,
        name: fullName,
        email: method === "email" ? email : null,
        phone: method === "phone" ? phone : null,
        role,
        isGovIdVerified: false,
        athleteProfileId: isAthlete ? "ath-" + newUserId : null,
        gtiScore: isAthlete ? 500 : undefined,
      };

      const newToken = "kheleo-auth-token-" + btoa(fullName);
      setSession(newUser, newToken);

      if (isAthlete) {
        toast.success("Account created! Forwarding to Government ID Verification...");
        router.push("/verify-identity");
      } else {
        toast.success(`Account created as ${role}! Redirecting to workspace...`);
        router.push(homeForRole(role));
      }
    } catch {
      toast.error("Failed to complete registration");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Create your <span className="text-primary font-black">KheLEO</span> account
        </h2>
        <p className="mt-1 text-sm text-kheleo-silver-muted">
          Select your platform role to configure your verified identity and dashboard.
        </p>
      </div>

      {/* Role Selector Grid */}
      <div className="mb-6">
        <label className="block text-xs font-semibold uppercase tracking-wider text-primary mb-2.5">
          Select Account Role
        </label>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {roleCards.map((rc) => {
            const isSelected = role === rc.id;
            const Icon = rc.icon;
            return (
              <button
                key={rc.id}
                type="button"
                onClick={() => setRole(rc.id)}
                className={`relative flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                    : "border-border bg-kheleo-surface/60 hover:border-primary/50 hover:bg-secondary/40"
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground truncate">{rc.title}</span>
                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{rc.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Admin Secret Code if Super Admin */}
      {role === "SUPER_ADMIN" && (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-bold text-destructive mb-1.5">
            <Key className="h-4 w-4" />
            Secret Administrator Invite Key Required
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Super Admin accounts require platform authorization. (Campus preview code:{" "}
            <span className="font-mono text-primary font-bold">KHELEO-ADMIN-2026</span>)
          </p>
          <input
            type="password"
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
            placeholder="Enter invitation or claim code..."
            className="w-full rounded-lg border border-destructive/50 bg-kheleo-canvas px-3 py-2 text-xs font-mono text-foreground focus:border-destructive focus:outline-none"
          />
        </div>
      )}

      {/* Auth Method Selector */}
      <div className="flex rounded-lg border border-border bg-kheleo-surface p-1 mb-5">
        <button
          type="button"
          onClick={() => setMethod("email")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-semibold transition-all ${
            method === "email"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          Email Signup
        </button>
        <button
          type="button"
          onClick={() => setMethod("phone")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-semibold transition-all ${
            method === "phone"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Phone className="h-3.5 w-3.5" />
          Phone & OTP
        </button>
      </div>

      {/* Form Fields */}
      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-kheleo-silver-chrome mb-1.5">
            Full Legal Name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Arjun Sharma"
            required
            className="w-full rounded-lg border border-input bg-kheleo-canvas px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {method === "email" ? (
          <>
            <div>
              <label className="block text-xs font-semibold text-kheleo-silver-chrome mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="athlete@domain.com"
                required
                className="w-full rounded-lg border border-input bg-kheleo-canvas px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-kheleo-silver-chrome mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full rounded-lg border border-input bg-kheleo-canvas px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-kheleo-silver-chrome mb-1.5">
              Mobile Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              required
              className="w-full rounded-lg border border-input bg-kheleo-canvas px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:opacity-95 disabled:opacity-50"
        >
          {isLoading
            ? "Creating Account..."
            : role === "ATHLETE"
              ? "Continue to ID Verification"
              : "Complete Registration"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
        <span>Already have an account?</span>
        <Link href="/login" className="font-semibold text-primary underline underline-offset-4">
          Sign in
        </Link>
      </div>
    </div>
  );
}
