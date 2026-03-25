"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createBrowserClient();

      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email,
          password,
        },
      );

      if (authError) {
        setError("Credenciales incorrectas. Intenta de nuevo.");
        return;
      }

      if (data.user) {
        // Check if user has staff role and get department + onboarding status
        const { data: profile } = await supabase
          .from("users")
          .select("role, department, onboarding_completed")
          .eq("auth_id", data.user.id)
          .single();

        if (!profile || !["owner", "manager", "staff"].includes(profile.role)) {
          await supabase.auth.signOut();
          setError("No tienes acceso al portal del personal.");
          return;
        }

        // Check if onboarding is needed
        if (!profile.onboarding_completed) {
          router.push("/staff/onboarding");
          return;
        }

        // Role-based redirect (Issue #10)
        const redirectUrl = getRedirectUrl(profile.role, profile.department);
        router.push(redirectUrl);
      }
    } catch {
      setError("Error de conexion. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-2xl font-black text-slate-900 mb-4">
            TVC
          </div>
          <h1 className="text-xl font-bold text-white">Portal del Personal</h1>
          <p className="text-sm text-slate-400 mt-1">Tiny Village Cartagena</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Correo electronico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Contrasena
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="********"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-8">
          MachineMind AI Infrastructure
        </p>
      </div>
    </div>
  );
}

/**
 * Issue #10: Role-based landing page after login
 * Kitchen staff -> /staff/pos (if exists, otherwise /staff/inventory)
 * Cleaning staff (housekeeping) -> /staff/checklist
 * Maintenance -> /staff/tasks?department=maintenance
 * Manager/Owner -> /staff/tasks
 */
function getRedirectUrl(role: string, department: string | null): string {
  // Managers and owners go to the main tasks page
  if (role === "manager" || role === "owner") {
    return "/staff/tasks";
  }

  // Staff redirects based on department
  switch (department) {
    case "kitchen":
      // Kitchen staff goes to inventory (POS not implemented yet)
      return "/staff/inventory";

    case "housekeeping":
      // Cleaning staff goes directly to checklists
      return "/staff/checklist";

    case "maintenance":
      // Maintenance staff sees tasks filtered by their department
      return "/staff/tasks?department=maintenance";

    case "pool":
      // Pool staff goes to checklists (pool checklists)
      return "/staff/checklist";

    case "front_desk":
      // Front desk goes to tasks
      return "/staff/tasks";

    default:
      // Default: go to tasks page
      return "/staff/tasks";
  }
}
