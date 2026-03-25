// ═══════════════════════════════════════════════════════════════
// TVC MIDDLEWARE - Issue #10: Role-Based Redirects
// Staff abre la app → va directo a su trabajo
// ═══════════════════════════════════════════════════════════════

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas que requieren autenticacion
const PROTECTED_ROUTES = ["/staff", "/ops", "/dashboard"];

// Rutas publicas (no requieren auth)
const PUBLIC_ROUTES = ["/staff/login", "/menu", "/chat", "/feedback"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rutas publicas sin verificacion
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Verificar si es ruta protegida
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Crear cliente de Supabase con cookies
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Verificar sesion
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Sin sesion → redirigir a login
  if (!session) {
    const redirectUrl = new URL("/staff/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Para rutas /staff y /ops, verificar perfil del usuario
  if (pathname === "/staff" || pathname === "/ops") {
    // Obtener perfil del usuario
    const { data: profile } = await supabase
      .from("users")
      .select("role, department, default_landing_page")
      .eq("auth_id", session.user.id)
      .single();

    if (profile) {
      // Si el usuario tiene pagina de inicio personalizada, usarla
      if (profile.default_landing_page) {
        return NextResponse.redirect(
          new URL(profile.default_landing_page, request.url),
        );
      }

      // Redireccion basada en rol/departamento
      const redirectUrl = getRedirectUrl(profile.role, profile.department);
      if (redirectUrl !== pathname) {
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      }
    }
  }

  return response;
}

/**
 * Determina la URL de redireccion basada en rol y departamento
 */
function getRedirectUrl(role: string, department: string | null): string {
  // Owner → dashboard principal
  if (role === "owner") {
    return "/dashboard";
  }

  // Manager → dashboard de operaciones
  if (role === "manager") {
    return "/ops";
  }

  // Staff → redireccion por departamento
  switch (department) {
    case "kitchen":
      // Cocina → POS + Inventario
      return "/staff/kitchen";

    case "housekeeping":
      // Limpieza → Checklists directamente
      return "/staff/checklist";

    case "maintenance":
      // Mantenimiento → Pagina de mantenimiento
      return "/staff/maintenance";

    case "pool":
      // Piscina → Checklists de piscina
      return "/staff/checklist?type=pool";

    case "front_desk":
      // Recepcion → Tareas generales
      return "/staff/tasks";

    default:
      // Default: tareas
      return "/staff/tasks";
  }
}

export const config = {
  matcher: [
    // Rutas que necesitan middleware
    "/staff/:path*",
    "/ops/:path*",
    "/dashboard/:path*",
    // Excluir archivos estaticos y API
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};
