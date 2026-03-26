"use client";

// ═══════════════════════════════════════════════════════════════
// ESCALATIONS DASHBOARD - STUBBED
// The 'escalations' table doesn't exist in the current schema
// TODO: Create escalations table with:
//   - id, priority, status, reason, escalated_at, escalated_by
//   - acknowledged_by, acknowledged_at, resolved_by, resolved_at
//   - related_entity, related_entity_type
// ═══════════════════════════════════════════════════════════════

import Link from "next/link";

export default function EscalationsPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              🚨 Centro de Escalaciones
            </h1>
            <p className="mt-1 text-slate-400">
              Sistema de escalamiento de operaciones
            </p>
          </div>
          <Link
            href="/ops"
            className="rounded-lg bg-slate-800 px-4 py-2 text-slate-300 transition hover:bg-slate-700"
          >
            ← Volver a Ops
          </Link>
        </div>

        {/* Coming Soon Card */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/10">
            <span className="text-4xl">🔧</span>
          </div>
          <h2 className="mb-3 text-xl font-semibold text-white">
            Sistema en Construcción
          </h2>
          <p className="mx-auto mb-6 max-w-md text-slate-400">
            El sistema de escalaciones está siendo implementado. Pronto podrás
            gestionar alertas críticas, asignar responsables, y monitorear
            tiempos de resolución.
          </p>

          {/* Feature Preview */}
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <div className="mb-2 text-2xl">⚡</div>
              <h3 className="mb-1 font-medium text-white">
                Alertas en Tiempo Real
              </h3>
              <p className="text-sm text-slate-400">
                Notificaciones instantáneas para problemas críticos
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <div className="mb-2 text-2xl">👥</div>
              <h3 className="mb-1 font-medium text-white">
                Asignación Automática
              </h3>
              <p className="text-sm text-slate-400">
                Escalamiento inteligente según disponibilidad
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <div className="mb-2 text-2xl">📊</div>
              <h3 className="mb-1 font-medium text-white">
                Métricas de Respuesta
              </h3>
              <p className="text-sm text-slate-400">
                KPIs de tiempo de resolución por equipo
              </p>
            </div>
          </div>

          {/* Schema Requirements */}
          <div className="rounded-lg border border-slate-600 bg-slate-800/30 p-4 text-left">
            <h4 className="mb-2 text-sm font-medium text-slate-300">
              Requisitos de Base de Datos:
            </h4>
            <code className="block text-xs text-slate-400">
              CREATE TABLE escalations (
              <br />
              &nbsp;&nbsp;id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              <br />
              &nbsp;&nbsp;priority TEXT CHECK (priority IN
              (&apos;critical&apos;, &apos;high&apos;, &apos;normal&apos;,
              &apos;low&apos;)),
              <br />
              &nbsp;&nbsp;status TEXT CHECK (status IN (&apos;pending&apos;,
              &apos;acknowledged&apos;, &apos;resolved&apos;)),
              <br />
              &nbsp;&nbsp;reason TEXT NOT NULL,
              <br />
              &nbsp;&nbsp;escalated_at TIMESTAMPTZ DEFAULT now(),
              <br />
              &nbsp;&nbsp;escalated_by UUID REFERENCES users(id),
              <br />
              &nbsp;&nbsp;acknowledged_by UUID REFERENCES users(id),
              <br />
              &nbsp;&nbsp;resolved_by UUID REFERENCES users(id),
              <br />
              &nbsp;&nbsp;resolved_at TIMESTAMPTZ
              <br />
              );
            </code>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 flex justify-center gap-4">
          <Link
            href="/ops/tasks"
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700"
          >
            Ver Tareas Activas
          </Link>
          <Link
            href="/ops/inbox"
            className="rounded-lg bg-slate-700 px-6 py-3 font-medium text-white transition hover:bg-slate-600"
          >
            Ver Mensajes
          </Link>
        </div>
      </div>
    </div>
  );
}
