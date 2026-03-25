"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

// ═══════════════════════════════════════════════════════════════
// TVC ONBOARDING FLOW — Issue #11
// Department-specific 5-step walkthrough with spotlights
// ═══════════════════════════════════════════════════════════════

type Department =
  | "kitchen"
  | "housekeeping"
  | "maintenance"
  | "pool"
  | "bar"
  | "front_desk"
  | null;

interface OnboardingFlowProps {
  userId: string;
  userName: string;
  department: Department;
  onComplete: () => void;
}

interface OnboardingScreen {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  highlight?: string; // Feature to highlight
}

// Base screens that apply to all departments
const BASE_SCREENS: OnboardingScreen[] = [
  {
    id: "tasks",
    title: "Aqui estan tus Tareas",
    description:
      "Cada dia veras tus tareas asignadas en la pantalla principal. Aqui aparecen los checklists pendientes, check-ins, check-outs y responsabilidades del dia.",
    icon: "clipboard-list",
    color: "cyan",
    highlight: "tasks",
  },
  {
    id: "checklists",
    title: "Como Completar un Checklist",
    description:
      "Sigue cada paso del checklist en orden. Algunas tareas requieren foto de verificacion. Cuando termines, el checklist se envia automaticamente para aprobacion de calidad.",
    icon: "check-circle",
    color: "emerald",
    highlight: "checklist",
  },
  {
    id: "bot",
    title: "Como Usar el Bot",
    description:
      "Preguntale al asistente IA sobre recetas, procedimientos (SOPs), horarios de lancha, o cualquier duda operativa. Esta disponible 24/7 y responde en segundos.",
    icon: "robot",
    color: "purple",
    highlight: "bot",
  },
  {
    id: "inventory",
    title: "Como Registrar Inventario",
    description:
      "Ingresa el conteo diario de ingredientes y suministros. El sistema alertara automaticamente cuando algo este bajo. Es importante mantener los numeros actualizados.",
    icon: "package",
    color: "amber",
    highlight: "inventory",
  },
  {
    id: "ready",
    title: "Listo!",
    description:
      "Ya conoces las herramientas principales. Si tienes dudas, el bot siempre esta disponible para ayudarte. Bienvenido al equipo TVC!",
    icon: "rocket",
    color: "gold",
  },
];

// Department-specific modifications
const DEPARTMENT_SCREENS: Record<string, OnboardingScreen[]> = {
  kitchen: [
    {
      id: "tasks",
      title: "Aqui estan tus Tareas",
      description:
        "Cada dia veras tus tareas de cocina: desayunos, almuerzos, preparacion de ingredientes, y limpieza de areas.",
      icon: "clipboard-list",
      color: "cyan",
      highlight: "tasks",
    },
    {
      id: "pos",
      title: "Sistema de Pedidos (POS)",
      description:
        "Registra cada pedido de comida o bebida en el POS. Selecciona el plato, la cantidad, y la villa del huesped. El sistema calcula costos automaticamente.",
      icon: "receipt",
      color: "emerald",
      highlight: "pos",
    },
    {
      id: "bot",
      title: "Recetas y Procedimientos",
      description:
        "Preguntale al bot las recetas exactas de cada plato, tiempos de coccion, y presentacion. Tambien conoce alergias de huespedes y restricciones dieteticas.",
      icon: "robot",
      color: "purple",
      highlight: "bot",
    },
    {
      id: "inventory",
      title: "Inventario de Cocina",
      description:
        "Cuenta los ingredientes cada dia: proteinas, vegetales, lacteos, secos. El sistema genera ordenes de compra automaticas cuando algo esta bajo.",
      icon: "package",
      color: "amber",
      highlight: "inventory",
    },
    {
      id: "ready",
      title: "Listo para Cocinar!",
      description:
        "Ya conoces el sistema. Recuerda: el bot sabe todas las recetas, el POS registra todo, y el inventario te avisa que falta. Bienvenido a la cocina TVC!",
      icon: "rocket",
      color: "gold",
    },
  ],
  housekeeping: [
    {
      id: "tasks",
      title: "Aqui estan tus Tareas",
      description:
        "Cada dia veras las villas que necesitan limpieza: salidas, retoques, areas comunes. El orden esta optimizado para eficiencia.",
      icon: "clipboard-list",
      color: "cyan",
      highlight: "tasks",
    },
    {
      id: "checklists",
      title: "Checklists de Limpieza",
      description:
        "Sigue cada paso en orden exacto. Las fotos son obligatorias para bano, cama, y areas principales. El supervisor las revisara para aprobar.",
      icon: "check-circle",
      color: "emerald",
      highlight: "checklist",
    },
    {
      id: "bot",
      title: "Procedimientos de Limpieza",
      description:
        "Preguntale al bot sobre manchas dificiles, productos correctos, o protocolos especiales. Tambien sabe cuando hay huespedes VIP que requieren atencion extra.",
      icon: "robot",
      color: "purple",
      highlight: "bot",
    },
    {
      id: "inventory",
      title: "Suministros de Limpieza",
      description:
        "Reporta cuando necesites mas suministros: papel, amenidades, productos de limpieza. El sistema asegura que siempre haya stock.",
      icon: "package",
      color: "amber",
      highlight: "inventory",
    },
    {
      id: "ready",
      title: "Lista para Brillar!",
      description:
        "Ya conoces el sistema. Recuerda: los checklists son tu guia, las fotos son la prueba, y el bot responde cualquier duda. Bienvenida al equipo de limpieza TVC!",
      icon: "rocket",
      color: "gold",
    },
  ],
  bar: [
    {
      id: "tasks",
      title: "Aqui estan tus Tareas",
      description:
        "Cada dia veras tus tareas del bar: preparacion, limpieza, inventario de licores, y horarios especiales como happy hour.",
      icon: "clipboard-list",
      color: "cyan",
      highlight: "tasks",
    },
    {
      id: "pos",
      title: "Registrar Bebidas (POS)",
      description:
        "Registra cada bebida en el POS antes de prepararla. Selecciona el coctel o licor, cantidad, y villa. Todo queda en la cuenta del huesped.",
      icon: "receipt",
      color: "emerald",
      highlight: "pos",
    },
    {
      id: "bot",
      title: "Recetas de Cocteles",
      description:
        "Preguntale al bot como hacer cualquier coctel: ingredientes exactos, proporciones, y presentacion. Tambien sabe los cocteles especiales de TVC.",
      icon: "robot",
      color: "purple",
      highlight: "bot",
    },
    {
      id: "inventory",
      title: "Inventario del Bar",
      description:
        "Cuenta las botellas y suministros cada dia. El sistema alerta cuando un licor esta bajo y genera ordenes de compra.",
      icon: "package",
      color: "amber",
      highlight: "inventory",
    },
    {
      id: "ready",
      title: "Listo para Servir!",
      description:
        "Ya conoces el sistema. El POS registra todo, el bot tiene las recetas, y el inventario te avisa que ordenar. Bienvenido al bar TVC!",
      icon: "rocket",
      color: "gold",
    },
  ],
  maintenance: [
    {
      id: "tasks",
      title: "Aqui estan tus Tareas",
      description:
        "Cada dia veras las ordenes de mantenimiento: urgentes primero, luego preventivas. Las tareas criticas que afectan huespedes aparecen resaltadas.",
      icon: "clipboard-list",
      color: "cyan",
      highlight: "tasks",
    },
    {
      id: "checklists",
      title: "Reportar Trabajos",
      description:
        "Cuando completes una tarea, marca el estado y agrega foto si es necesario. El supervisor ve el progreso en tiempo real.",
      icon: "check-circle",
      color: "emerald",
      highlight: "checklist",
    },
    {
      id: "bot",
      title: "Procedimientos Tecnicos",
      description:
        "Preguntale al bot sobre procedimientos de aire acondicionado, piscina, electricidad. Tambien sabe donde estan las herramientas y repuestos.",
      icon: "robot",
      color: "purple",
      highlight: "bot",
    },
    {
      id: "inventory",
      title: "Inventario de Repuestos",
      description:
        "Reporta cuando uses repuestos: filtros, focos, herramientas. El sistema asegura que siempre haya stock de piezas criticas.",
      icon: "package",
      color: "amber",
      highlight: "inventory",
    },
    {
      id: "ready",
      title: "Listo para Mantener!",
      description:
        "Ya conoces el sistema. Las tareas urgentes siempre primero, el bot sabe los procedimientos, y el inventario avisa que falta. Bienvenido al equipo de mantenimiento TVC!",
      icon: "rocket",
      color: "gold",
    },
  ],
  pool: [
    {
      id: "tasks",
      title: "Aqui estan tus Tareas",
      description:
        "Cada dia veras las tareas de piscina: limpieza, quimicos, revision de areas, toallas. El horario esta optimizado para que la piscina este lista antes de los huespedes.",
      icon: "clipboard-list",
      color: "cyan",
      highlight: "tasks",
    },
    {
      id: "checklists",
      title: "Checklist de Piscina",
      description:
        "Completa el checklist diario: niveles de cloro y pH, limpieza de bordes, toallas limpias, sombrillas. Las fotos verifican el estado.",
      icon: "check-circle",
      color: "emerald",
      highlight: "checklist",
    },
    {
      id: "bot",
      title: "Quimicos y Procedimientos",
      description:
        "Preguntale al bot sobre niveles correctos de cloro, como ajustar pH, o procedimientos de emergencia. Responde en segundos.",
      icon: "robot",
      color: "purple",
      highlight: "bot",
    },
    {
      id: "inventory",
      title: "Suministros de Piscina",
      description:
        "Reporta el inventario de quimicos, toallas, y suministros. El sistema alerta cuando algo esta bajo.",
      icon: "package",
      color: "amber",
      highlight: "inventory",
    },
    {
      id: "ready",
      title: "Listo para la Piscina!",
      description:
        "Ya conoces el sistema. Los checklists son tu guia, el bot sabe de quimicos, y el inventario asegura que nunca falte nada. Bienvenido al equipo de piscina TVC!",
      icon: "rocket",
      color: "gold",
    },
  ],
};

// Get screens based on department
function getScreensForDepartment(department: Department): OnboardingScreen[] {
  if (department && DEPARTMENT_SCREENS[department]) {
    return DEPARTMENT_SCREENS[department];
  }
  return BASE_SCREENS;
}

export default function OnboardingFlow({
  userId,
  userName,
  department,
  onComplete,
}: OnboardingFlowProps) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);

  const screens = getScreensForDepartment(department);
  const screen = screens[currentScreen];
  const isLastScreen = currentScreen === screens.length - 1;
  const progress = ((currentScreen + 1) / screens.length) * 100;

  // Prefetch navigation when component mounts
  useEffect(() => {
    // Preload the routes the user will navigate to after onboarding
    const prefetchRoutes = [
      "/staff/tasks",
      "/staff/checklist",
      "/staff/bot",
      "/staff/inventory",
    ];
    prefetchRoutes.forEach((route) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = route;
      document.head.appendChild(link);
    });
  }, []);

  const handleNext = () => {
    if (isLastScreen) {
      completeOnboarding();
    } else {
      setAnimatingOut(true);
      setTimeout(() => {
        setCurrentScreen((prev) => prev + 1);
        setAnimatingOut(false);
      }, 150);
    }
  };

  const handleBack = () => {
    if (currentScreen > 0) {
      setAnimatingOut(true);
      setTimeout(() => {
        setCurrentScreen((prev) => prev - 1);
        setAnimatingOut(false);
      }, 150);
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const handleDotClick = (index: number) => {
    if (index !== currentScreen) {
      setAnimatingOut(true);
      setTimeout(() => {
        setCurrentScreen(index);
        setAnimatingOut(false);
      }, 150);
    }
  };

  const completeOnboarding = async () => {
    setCompleting(true);
    try {
      const supabase = createBrowserClient();

      await supabase
        .from("users")
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("id", userId);

      onComplete();
    } catch (error) {
      console.error("[Onboarding] Error completing:", error);
      onComplete();
    }
  };

  const getIcon = (iconName: string, color: string) => {
    const colorClasses: Record<string, string> = {
      cyan: "text-cyan-400",
      emerald: "text-emerald-400",
      purple: "text-purple-400",
      amber: "text-amber-400",
      gold: "text-yellow-400",
    };

    const bgClasses: Record<string, string> = {
      cyan: "bg-cyan-500/20 border-cyan-500/30",
      emerald: "bg-emerald-500/20 border-emerald-500/30",
      purple: "bg-purple-500/20 border-purple-500/30",
      amber: "bg-amber-500/20 border-amber-500/30",
      gold: "bg-yellow-500/20 border-yellow-500/30",
    };

    const icons: Record<string, React.ReactNode> = {
      "clipboard-list": (
        <svg
          className="w-14 h-14"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
      "check-circle": (
        <svg
          className="w-14 h-14"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      robot: (
        <svg
          className="w-14 h-14"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
      package: (
        <svg
          className="w-14 h-14"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
      rocket: (
        <svg
          className="w-14 h-14"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
          />
        </svg>
      ),
      receipt: (
        <svg
          className="w-14 h-14"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
          />
        </svg>
      ),
    };

    return (
      <div
        className={`w-28 h-28 rounded-3xl ${bgClasses[color]} border flex items-center justify-center ${colorClasses[color]} shadow-lg`}
      >
        {icons[iconName]}
      </div>
    );
  };

  // Get feature highlight preview
  const getFeaturePreview = (highlight: string | undefined) => {
    if (!highlight) return null;

    const previews: Record<string, React.ReactNode> = {
      tasks: (
        <div className="bg-slate-800/80 rounded-xl p-3 mt-6 w-full max-w-xs border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <span className="text-lg">✅</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">Limpieza Villa Teresa</div>
              <div className="text-xs text-slate-400">Pendiente</div>
            </div>
          </div>
        </div>
      ),
      checklist: (
        <div className="bg-slate-800/80 rounded-xl p-3 mt-6 w-full max-w-xs border border-slate-700">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <span className="text-sm">Tender cama</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full border-2 border-slate-600" />
              <span className="text-sm text-slate-400">
                Limpiar bano (foto)
              </span>
            </div>
          </div>
        </div>
      ),
      bot: (
        <div className="bg-slate-800/80 rounded-xl p-3 mt-6 w-full max-w-xs border border-slate-700">
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-sm">
              🤖
            </div>
            <div className="flex-1">
              <div className="bg-slate-700/50 rounded-lg px-3 py-2 text-xs">
                &quot;Como hago un mojito?&quot;
              </div>
            </div>
          </div>
        </div>
      ),
      inventory: (
        <div className="bg-slate-800/80 rounded-xl p-3 mt-6 w-full max-w-xs border border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧀</span>
              <span className="text-sm">Queso crema</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-7 h-7 rounded-lg bg-slate-700 text-lg">
                -
              </button>
              <span className="text-lg font-bold w-8 text-center">5</span>
              <button className="w-7 h-7 rounded-lg bg-cyan-500 text-lg">
                +
              </button>
            </div>
          </div>
        </div>
      ),
      pos: (
        <div className="bg-slate-800/80 rounded-xl p-3 mt-6 w-full max-w-xs border border-slate-700">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-700/50 rounded-lg p-2 text-center">
              <span className="text-xl">🍳</span>
              <div className="text-[10px] mt-1">Desayuno</div>
            </div>
            <div className="bg-cyan-500/20 border border-cyan-500/50 rounded-lg p-2 text-center">
              <span className="text-xl">🍹</span>
              <div className="text-[10px] mt-1">Cocteles</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-2 text-center">
              <span className="text-xl">🍺</span>
              <div className="text-[10px] mt-1">Cerveza</div>
            </div>
          </div>
        </div>
      ),
    };

    return previews[highlight] || null;
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col">
      {/* Progress bar */}
      <div className="h-1.5 bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header with skip and step counter */}
      <div className="flex justify-between items-center p-4">
        <div className="text-sm text-slate-400">
          {currentScreen + 1} / {screens.length}
        </div>
        <button
          onClick={handleSkip}
          className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1 rounded-lg active:bg-slate-800"
        >
          Saltar tutorial
        </button>
      </div>

      {/* Content */}
      <div
        className={`flex-1 flex flex-col items-center justify-center px-6 text-center transition-all duration-150 ${
          animatingOut ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
        }`}
      >
        {/* Welcome message on first screen */}
        {currentScreen === 0 && (
          <p className="text-cyan-400 text-sm mb-6 font-medium">
            Bienvenido, {userName || "Equipo TVC"}!
          </p>
        )}

        {/* Icon */}
        {getIcon(screen.icon, screen.color)}

        {/* Title */}
        <h1 className="text-2xl font-bold mt-6 mb-4">{screen.title}</h1>

        {/* Description */}
        <p className="text-slate-400 max-w-sm leading-relaxed text-base">
          {screen.description}
        </p>

        {/* Feature preview */}
        {getFeaturePreview(screen.highlight)}
      </div>

      {/* Navigation dots */}
      <div className="flex justify-center gap-2 pb-4">
        {screens.map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
              index === currentScreen
                ? "bg-cyan-500 w-6"
                : index < currentScreen
                  ? "bg-cyan-500/50"
                  : "bg-slate-700"
            }`}
            aria-label={`Ir al paso ${index + 1}`}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="p-6 pb-8 flex gap-3">
        {/* Back button */}
        {currentScreen > 0 && (
          <button
            onClick={handleBack}
            className="px-6 py-4 rounded-xl font-medium text-base bg-slate-800 text-white hover:bg-slate-700 transition-colors border border-slate-700"
          >
            Atras
          </button>
        )}

        {/* Next/Complete button */}
        <button
          onClick={handleNext}
          disabled={completing}
          className={`flex-1 py-4 rounded-xl font-medium text-lg transition-all ${
            isLastScreen
              ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25"
              : "bg-cyan-500 text-white hover:bg-cyan-600"
          } disabled:opacity-50 active:scale-[0.98]`}
        >
          {completing
            ? "Cargando..."
            : isLastScreen
              ? "Comenzar a trabajar"
              : "Siguiente"}
        </button>
      </div>
    </div>
  );
}
