"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ops/Badge";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Tables, Json } from "@/types/database";

type Checklist = Tables<"checklists">;

interface ChecklistItem {
  task: string;
  task_es: string;
  photo_required: boolean;
  completed?: boolean;
  photo_url?: string;
}

interface ChecklistWithDetails extends Checklist {
  assigned_user?: { name: string } | null;
  template?: {
    name_es: string;
    department: string;
    items: Json;
  } | null;
}

const VILLAS = [
  { id: "villa_1", name: "Villa 1", type: "Garden View" },
  { id: "villa_2", name: "Villa 2", type: "Garden View" },
  { id: "villa_3", name: "Villa 3", type: "Garden View" },
  { id: "main_house", name: "Casa Principal", type: "Main House" },
];

export default function HousekeepingPage() {
  const [checklists, setChecklists] = useState<ChecklistWithDetails[]>([]);
  const [selected, setSelected] = useState<ChecklistWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    loadChecklists();
  }, []);

  const loadChecklists = async () => {
    const supabase = createBrowserClient();

    // Get checklists pending approval (completed but not approved)
    const { data: checklistData, error } = await supabase
      .from("checklists")
      .select("*")
      .eq("status", "complete")
      .is("approved_at", null)
      .order("completed_at", { ascending: false });

    if (error) {
      console.error("[loadChecklists]", error);
      setLoading(false);
      return;
    }

    if (!checklistData || checklistData.length === 0) {
      setChecklists([]);
      setLoading(false);
      return;
    }

    // Get unique user IDs and template IDs
    const userIds = [
      ...new Set(checklistData.map((c) => c.assigned_to).filter(Boolean)),
    ] as string[];
    const templateIds = [
      ...new Set(checklistData.map((c) => c.template_id).filter(Boolean)),
    ] as string[];

    // Fetch users
    const { data: usersData } =
      userIds.length > 0
        ? await supabase.from("users").select("id, name").in("id", userIds)
        : { data: [] };

    // Fetch templates
    const { data: templatesData } =
      templateIds.length > 0
        ? await supabase
            .from("checklist_templates")
            .select("id, name_es, department, items")
            .in("id", templateIds)
        : { data: [] };

    // Create lookup maps
    const usersMap = new Map((usersData || []).map((u) => [u.id, u]));
    const templatesMap = new Map((templatesData || []).map((t) => [t.id, t]));

    // Combine data
    const enrichedChecklists: ChecklistWithDetails[] = checklistData.map(
      (checklist) => ({
        ...checklist,
        assigned_user: checklist.assigned_to
          ? usersMap.get(checklist.assigned_to) || null
          : null,
        template: checklist.template_id
          ? templatesMap.get(checklist.template_id) || null
          : null,
      }),
    );

    setChecklists(enrichedChecklists);
    if (enrichedChecklists.length > 0) {
      setSelected(enrichedChecklists[0]);
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!selected) return;
    setProcessing(true);

    const supabase = createBrowserClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Por favor inicia sesión");
      setProcessing(false);
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    const { error } = await supabase
      .from("checklists")
      .update({
        status: "approved" as const,
        approved_by: profile?.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", selected.id);

    if (error) {
      console.error("[handleApprove]", error);
      alert("Error al aprobar");
    } else {
      // Remove from list and select next
      const remaining = checklists.filter((c) => c.id !== selected.id);
      setChecklists(remaining);
      setSelected(remaining[0] || null);
    }

    setProcessing(false);
  };

  const handleReject = async () => {
    if (!selected || !rejectReason) return;
    setProcessing(true);

    const supabase = createBrowserClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Por favor inicia sesión");
      setProcessing(false);
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    const { error } = await supabase
      .from("checklists")
      .update({
        status: "rejected" as const,
        approved_by: profile?.id,
        rejection_reason: rejectReason,
      })
      .eq("id", selected.id);

    if (error) {
      console.error("[handleReject]", error);
      alert("Error al rechazar");
    } else {
      const remaining = checklists.filter((c) => c.id !== selected.id);
      setChecklists(remaining);
      setSelected(remaining[0] || null);
      setShowRejectModal(false);
      setRejectReason("");
    }

    setProcessing(false);
  };

  const getVillaName = (villaId: string | null) => {
    if (!villaId) return "N/A";
    const villa = VILLAS.find((v) => v.id === villaId);
    return villa ? villa.name : villaId.replace("_", " ");
  };

  const parseItems = (items: Json): ChecklistItem[] => {
    if (!items || !Array.isArray(items)) return [];
    return items as unknown as ChecklistItem[];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#00B4FF] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-extrabold">
          🧹 Housekeeping Quality Control
        </h1>
        <p className="text-slate-500 text-xs mt-1">
          Review and approve completed checklists. Photo-verified quality
          control.
        </p>
      </div>

      {checklists.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-slate-500 font-medium">
            No hay checklists pendientes de aprobación
          </p>
          <p className="text-xs text-slate-400 mt-1">Todo está al día</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pending List */}
          <div className="lg:col-span-1 space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Pendientes ({checklists.length})
            </div>
            {checklists.map((checklist) => (
              <button
                key={checklist.id}
                onClick={() => setSelected(checklist)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selected?.id === checklist.id
                    ? "bg-[#00B4FF]/10 border-[#00B4FF]"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-slate-900">
                    {checklist.template?.name_es || checklist.type}
                  </div>
                  <Badge
                    color={
                      checklist.type.includes("villa") ? "#0066CC" : "#10B981"
                    }
                  >
                    {checklist.type.includes("villa")
                      ? getVillaName(checklist.villa_id)
                      : checklist.template?.department}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {checklist.assigned_user?.name || "Staff"} •{" "}
                  {checklist.completed_at
                    ? new Date(checklist.completed_at).toLocaleString("es-CO", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "numeric",
                        month: "short",
                      })
                    : ""}
                </div>
              </button>
            ))}
          </div>

          {/* Detail View */}
          <div className="lg:col-span-2">
            {selected ? (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-lg font-extrabold text-slate-900">
                      {selected.template?.name_es || selected.type}
                    </div>
                    <div className="text-xs text-slate-500">
                      {selected.type.includes("villa") &&
                        getVillaName(selected.villa_id)}{" "}
                      • Completado por {selected.assigned_user?.name || "Staff"}
                    </div>
                  </div>
                  <Badge color="#F59E0B">Pendiente Aprobación</Badge>
                </div>

                {/* Items Review */}
                <div className="space-y-2 mb-4 max-h-[400px] overflow-y-auto">
                  {parseItems(selected.items).map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-2 rounded-lg ${
                        item.completed ? "bg-emerald-50" : "bg-rose-50"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          item.completed
                            ? "bg-emerald-500 text-white"
                            : "bg-rose-500 text-white"
                        }`}
                      >
                        {item.completed ? "✓" : "✗"}
                      </div>
                      <div className="flex-1">
                        <div
                          className={`text-sm ${item.completed ? "text-slate-700" : "text-rose-700 font-medium"}`}
                        >
                          {item.task_es || item.task}
                        </div>
                      </div>
                      {item.photo_required && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            item.photo_url
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-amber-100 text-amber-600"
                          }`}
                        >
                          📸 {item.photo_url ? "OK" : "FALTA"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Duration & Notes */}
                {(selected.duration_minutes || selected.notes) && (
                  <div className="bg-slate-50 rounded-lg p-3 mb-4">
                    {selected.duration_minutes && (
                      <div className="text-xs text-slate-600">
                        <strong>Duración:</strong> {selected.duration_minutes}{" "}
                        minutos
                      </div>
                    )}
                    {selected.notes && (
                      <div className="text-xs text-slate-600 mt-1">
                        <strong>Notas:</strong> {selected.notes}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={processing}
                    className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  >
                    {processing ? "Procesando..." : "✅ Aprobar"}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={processing}
                    className="px-6 py-3 bg-rose-100 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-200 transition-colors disabled:opacity-50"
                  >
                    ❌ Rechazar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-400">
                Selecciona un checklist
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 max-w-md w-full">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Rechazar Checklist
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Indica el motivo del rechazo. El staff recibirá esta notificación.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo del rechazo..."
              className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none h-24 focus:outline-none focus:border-[#00B4FF]"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason || processing}
                className="flex-1 py-2 bg-rose-500 text-white rounded-lg font-medium text-sm disabled:opacity-50"
              >
                {processing ? "..." : "Confirmar Rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
