"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";
import Link from "next/link";

type ChecklistTemplate = Tables<"checklist_templates">;

export default function StaffChecklistPage() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const supabase = createBrowserClient();

    const { data } = await supabase
      .from("checklist_templates")
      .select("*")
      .eq("is_active", true)
      .order("department")
      .order("name_es");

    if (data) {
      setTemplates(data);
    }

    setLoading(false);
  };

  const getCategoryIcon = (type: string) => {
    if (type.includes("villa")) return "🏠";
    if (type.includes("pool")) return "🏊";
    if (type.includes("maintenance")) return "🔧";
    if (type.includes("breakfast")) return "🍳";
    if (type.includes("common")) return "🏢";
    return "📋";
  };

  const getDepartmentLabel = (dept: string) => {
    switch (dept) {
      case "housekeeping":
        return "Limpieza";
      case "maintenance":
        return "Mantenimiento";
      case "pool":
        return "Piscina";
      case "kitchen":
        return "Cocina";
      default:
        return dept;
    }
  };

  const groupedTemplates = templates.reduce(
    (acc, template) => {
      const dept = template.department;
      if (!acc[dept]) {
        acc[dept] = [];
      }
      acc[dept].push(template);
      return acc;
    },
    {} as Record<string, ChecklistTemplate[]>,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Checklists</h1>
        <p className="text-xs text-slate-400">
          Selecciona el tipo de checklist para comenzar
        </p>
      </div>

      {Object.entries(groupedTemplates).map(([department, templates]) => (
        <div key={department}>
          <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wide">
            {getDepartmentLabel(department)}
          </h2>
          <div className="space-y-2">
            {templates.map((template) => (
              <Link
                key={template.id}
                href={`/staff/checklist/${template.type}`}
                className="block bg-slate-800 rounded-xl p-4 hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {getCategoryIcon(template.type)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{template.name_es}</div>
                    {template.description && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        {template.description}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    ~{template.estimated_minutes} min
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
