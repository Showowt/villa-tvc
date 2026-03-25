"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import OnboardingFlow from "@/components/staff/OnboardingFlow";

// ═══════════════════════════════════════════════════════════════
// ONBOARDING PAGE — Issue #11
// Routes new staff through department-specific tutorial
// ═══════════════════════════════════════════════════════════════

type Department =
  | "kitchen"
  | "housekeeping"
  | "maintenance"
  | "pool"
  | "bar"
  | "front_desk"
  | null;

interface UserProfile {
  id: string;
  name: string | null;
  onboarding_completed: boolean | null;
  role: string;
  department: Department;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const supabase = createBrowserClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/staff/login");
      return;
    }

    // Get user profile with department
    const { data: userProfile } = await supabase
      .from("users")
      .select("id, name, onboarding_completed, role, department")
      .eq("auth_id", user.id)
      .single();

    if (!userProfile) {
      router.push("/staff/login");
      return;
    }

    // If already completed, redirect to appropriate dashboard
    if (userProfile.onboarding_completed) {
      setAlreadyCompleted(true);
      const redirectUrl = getRedirectUrl(
        userProfile.role,
        userProfile.department,
      );
      router.push(redirectUrl);
      return;
    }

    setProfile(userProfile as UserProfile);
    setLoading(false);
  };

  const handleComplete = () => {
    if (profile) {
      const redirectUrl = getRedirectUrl(profile.role, profile.department);
      router.push(redirectUrl);
    } else {
      router.push("/staff/tasks");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-400">
            {alreadyCompleted ? "Redirigiendo..." : "Cargando..."}
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <OnboardingFlow
      userId={profile.id}
      userName={profile.name || ""}
      department={profile.department}
      onComplete={handleComplete}
    />
  );
}

/**
 * Issue #10 & #11: Role-based landing page after onboarding
 * Kitchen staff -> POS
 * Cleaning staff (housekeeping) -> Checklist
 * Bar staff -> POS
 * Maintenance -> Tasks filtered by maintenance
 * Pool -> Checklist
 * Manager/Owner -> Tasks overview
 */
function getRedirectUrl(role: string, department: Department): string {
  if (role === "manager" || role === "owner") {
    return "/staff/tasks";
  }

  switch (department) {
    case "kitchen":
      return "/staff/pos";
    case "bar":
      return "/staff/pos";
    case "housekeeping":
      return "/staff/checklist";
    case "pool":
      return "/staff/checklist";
    case "maintenance":
      return "/staff/tasks?department=maintenance";
    case "front_desk":
      return "/staff/tasks";
    default:
      return "/staff/tasks";
  }
}
