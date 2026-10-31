import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserRole } from "@/contracts/enums.generated";

export interface AuthUserProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  isGovIdVerified: boolean;
  athleteProfileId: string | null;
  gtiScore?: number | undefined;
  district?: string | undefined;
  state?: string | undefined;
}

export interface DemoProfile {
  user: AuthUserProfile;
  token: string;
}

export const DEMO_PROFILES: Record<"ATHLETE" | "ORGANIZER" | "SCOUT" | "SUPER_ADMIN", DemoProfile> = {
  ATHLETE: {
    user: {
      id: "a1111111-1111-4111-8111-111111111111",
      name: "Arjun Sharma",
      email: "arjun.sharma@kheleo.in",
      phone: "+919876543210",
      role: "ATHLETE",
      isGovIdVerified: true,
      athleteProfileId: "ap111111-1111-4111-8111-111111111111",
      gtiScore: 785,
      district: "Rohtak",
      state: "Haryana",
    },
    token: "demo-jwt-athlete-token-kheleo-verified",
  },
  ORGANIZER: {
    user: {
      id: "b2222222-2222-4222-8222-222222222222",
      name: "Vikramaditya Rathore",
      email: "vikram.rathore@rajasthan-athletics.org",
      phone: "+919811122233",
      role: "ORGANIZER",
      isGovIdVerified: true,
      athleteProfileId: null,
      district: "Jaipur",
      state: "Rajasthan",
    },
    token: "demo-jwt-organizer-token-kheleo-verified",
  },
  SCOUT: {
    user: {
      id: "c3333333-3333-4333-8333-333333333333",
      name: "Pooja Deshmukh (NIS)",
      email: "p.deshmukh@olympic-scouting.in",
      phone: "+919822233344",
      role: "SCOUT",
      isGovIdVerified: true,
      athleteProfileId: null,
      district: "Pune",
      state: "Maharashtra",
    },
    token: "demo-jwt-scout-token-kheleo-verified",
  },
  SUPER_ADMIN: {
    user: {
      id: "d4444444-4444-4444-8444-444444444444",
      name: "KheLEO Integrity Lead",
      email: "admin@kheleo.com",
      phone: "+919800000000",
      role: "SUPER_ADMIN",
      isGovIdVerified: true,
      athleteProfileId: null,
    },
    token: "demo-jwt-superadmin-token-kheleo-verified",
  },
};

interface AuthState {
  user: AuthUserProfile | null;
  token: string | null;
  role: UserRole;
  isGovIdVerified: boolean;
  isAuthenticated: boolean;
  isDemoMode: boolean;

  setSession: (user: AuthUserProfile, token: string) => void;
  setGovIdVerified: (verified: boolean) => void;
  setRole: (role: UserRole) => void;
  logout: () => void;
  switchDemoRole: (role: "ATHLETE" | "ORGANIZER" | "SCOUT" | "SUPER_ADMIN") => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: "ATHLETE",
      isGovIdVerified: false,
      isAuthenticated: false,
      isDemoMode: false,

      setSession: (user, token) => {
        set({
          user,
          token,
          role: user.role,
          isGovIdVerified: user.isGovIdVerified,
          isAuthenticated: true,
          isDemoMode: false,
        });
      },

      setGovIdVerified: (verified: boolean) => {
        set((state) => ({
          isGovIdVerified: verified,
          user: state.user ? { ...state.user, isGovIdVerified: verified } : null,
        }));
      },

      setRole: (role: UserRole) => {
        set((state) => ({
          role,
          user: state.user ? { ...state.user, role } : null,
        }));
      },

      logout: () => {
        if (typeof document !== "undefined") {
          document.cookie = "kheleo_demo_role=; path=/; max-age=0";
        }
        set({
          user: null,
          token: null,
          role: "ATHLETE",
          isGovIdVerified: false,
          isAuthenticated: false,
          isDemoMode: false,
        });
      },

      switchDemoRole: (roleKey) => {
        const demo = DEMO_PROFILES[roleKey];
        if (typeof document !== "undefined") {
          document.cookie = `kheleo_demo_role=${demo.user.role}; path=/; max-age=86400; SameSite=Lax`;
        }
        set({
          user: demo.user,
          token: demo.token,
          role: demo.user.role,
          isGovIdVerified: demo.user.isGovIdVerified,
          isAuthenticated: true,
          isDemoMode: true,
        });
      },
    }),
    {
      name: "kheleo-auth-store",
    },
  ),
);
