// ═══════════════════════════════════════════════════════════════
// EXPORT API - Issue #35
// Exportar datos a CSV/Excel con filtros de fecha
// Tablas: orders, inventory, checklists, bookings, transport
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";

// Tipos de tablas exportables
type ExportableTable =
  | "orders"
  | "inventory"
  | "checklists"
  | "bookings"
  | "transport"
  | "metrics"
  | "ingredients"
  | "purchase_orders";

// Validar que la tabla sea exportable
function isValidTable(table: string): table is ExportableTable {
  return [
    "orders",
    "inventory",
    "checklists",
    "bookings",
    "transport",
    "metrics",
    "ingredients",
    "purchase_orders",
  ].includes(table);
}

// Formatear fecha para nombres de archivo
function formatDateForFilename(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Generar Excel desde datos
function generateExcel(
  data: Record<string, unknown>[],
  sheetName: string,
): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Auto-size columns
  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch:
      Math.max(
        key.length,
        ...data.map((row) => String(row[key] ?? "").length),
      ) + 2,
  }));
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

// Generar CSV desde datos
function generateCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (value === null || value === undefined) return "";
          const stringValue = String(value);
          // Escapar comillas y envolver en comillas si tiene comas
          if (stringValue.includes(",") || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(","),
    ),
  ];
  return csvRows.join("\n");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> },
) {
  try {
    const { table } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Validar tabla
    if (!isValidTable(table)) {
      return NextResponse.json(
        { error: `Tabla "${table}" no soportada para exportacion` },
        { status: 400 },
      );
    }

    // Parametros de filtro
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");
    const format = (searchParams.get("format") || "xlsx") as "xlsx" | "csv";

    const supabase = createServerClient();

    // Obtener fecha por defecto (ultimos 30 dias)
    const today = new Date();
    const defaultStart = new Date(today);
    defaultStart.setDate(today.getDate() - 30);

    const start = startDate || formatDateForFilename(defaultStart);
    const end = endDate || formatDateForFilename(today);

    let data: Record<string, unknown>[] = [];
    let filename = "";

    switch (table) {
      case "orders": {
        const { data: orders, error } = await supabase
          .from("order_logs")
          .select(
            `
            id,
            order_date,
            quantity,
            unit_price,
            total_price,
            guest_name,
            menu_items(name, name_es, category),
            users(name)
          `,
          )
          .gte("order_date", start)
          .lte("order_date", end)
          .order("order_date", { ascending: false });

        if (error) throw error;

        data = (orders || []).map((order) => ({
          ID: order.id,
          Fecha: order.order_date,
          Plato:
            (order.menu_items as { name_es: string } | null)?.name_es || "N/A",
          Categoria:
            (order.menu_items as { category: string } | null)?.category ||
            "N/A",
          Cantidad: order.quantity,
          "Precio Unitario": order.unit_price,
          Total: order.total_price,
          Huesped: order.guest_name || "N/A",
          "Servido Por":
            (order.users as { name: string } | null)?.name || "N/A",
        }));
        filename = `pedidos_${start}_a_${end}`;
        break;
      }

      case "inventory": {
        const { data: logs, error } = await supabase
          .from("inventory_logs")
          .select(
            `
            id,
            counted_at,
            quantity_counted,
            previous_quantity,
            variance,
            notes,
            ingredients(name, name_es, unit, category),
            users(name)
          `,
          )
          .gte("counted_at", `${start}T00:00:00`)
          .lte("counted_at", `${end}T23:59:59`)
          .order("counted_at", { ascending: false });

        if (error) throw error;

        data = (logs || []).map((log) => ({
          ID: log.id,
          Fecha: new Date(log.counted_at || "").toLocaleDateString("es-CO"),
          Ingrediente:
            (log.ingredients as { name_es: string } | null)?.name_es || "N/A",
          Categoria:
            (log.ingredients as { category: string } | null)?.category || "N/A",
          Unidad: (log.ingredients as { unit: string } | null)?.unit || "N/A",
          "Cantidad Anterior": log.previous_quantity,
          "Cantidad Contada": log.quantity_counted,
          Variacion: log.variance,
          "Contado Por": (log.users as { name: string } | null)?.name || "N/A",
          Notas: log.notes || "",
        }));
        filename = `inventario_${start}_a_${end}`;
        break;
      }

      case "ingredients": {
        const { data: ingredients, error } = await supabase
          .from("ingredients")
          .select("*")
          .eq("is_active", true)
          .order("category")
          .order("name_es");

        if (error) throw error;

        data = (ingredients || []).map((ing) => ({
          ID: ing.id,
          Nombre: ing.name_es,
          "Nombre EN": ing.name,
          Categoria: ing.category,
          Unidad: ing.unit,
          "Stock Actual": ing.current_stock,
          "Stock Minimo": ing.min_stock,
          "Precio Unitario": ing.unit_cost,
          Proveedor: ing.supplier || "N/A",
          Estado:
            (ing.current_stock ?? 0) < (ing.min_stock ?? 0)
              ? "BAJO STOCK"
              : "OK",
        }));
        filename = `ingredientes_${formatDateForFilename(today)}`;
        break;
      }

      case "checklists": {
        const { data: checklists, error } = await supabase
          .from("checklists")
          .select(
            `
            id,
            date,
            status,
            created_at,
            completed_at,
            qc_score,
            qc_notes,
            checklist_templates(name_es, department, type),
            users!checklists_assigned_to_fkey(name),
            villas(name)
          `,
          )
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: false });

        if (error) throw error;

        data = (checklists || []).map((check) => ({
          ID: check.id,
          Fecha: check.date,
          Tipo:
            (check.checklist_templates as { name_es: string } | null)
              ?.name_es || "N/A",
          Departamento:
            (check.checklist_templates as { department: string } | null)
              ?.department || "N/A",
          Villa: (check.villas as { name: string } | null)?.name || "N/A",
          "Asignado A": (check.users as { name: string } | null)?.name || "N/A",
          Estado: check.status,
          "Calificacion QC": check.qc_score || "N/A",
          "Notas QC": check.qc_notes || "",
          Creado: new Date(check.created_at || "").toLocaleString("es-CO"),
          Completado: check.completed_at
            ? new Date(check.completed_at).toLocaleString("es-CO")
            : "N/A",
        }));
        filename = `checklists_${start}_a_${end}`;
        break;
      }

      case "bookings": {
        const { data: bookings, error } = await supabase
          .from("villa_bookings")
          .select(
            `
            id,
            guest_name,
            guest_phone,
            guest_email,
            check_in,
            check_out,
            total_guests,
            booking_source,
            status,
            total_amount,
            deposit_amount,
            special_requests,
            allergies,
            is_vip,
            villas(name)
          `,
          )
          .gte("check_in", start)
          .lte("check_in", end)
          .order("check_in", { ascending: false });

        if (error) throw error;

        data = (bookings || []).map((booking) => ({
          ID: booking.id,
          Huesped: booking.guest_name,
          Telefono: booking.guest_phone || "N/A",
          Email: booking.guest_email || "N/A",
          Villa: (booking.villas as { name: string } | null)?.name || "N/A",
          "Check-in": booking.check_in,
          "Check-out": booking.check_out,
          Huespedes: booking.total_guests,
          Fuente: booking.booking_source || "N/A",
          Estado: booking.status,
          "Monto Total": booking.total_amount,
          Deposito: booking.deposit_amount,
          VIP: booking.is_vip ? "SI" : "NO",
          Alergias: booking.allergies || "N/A",
          "Solicitudes Especiales": booking.special_requests || "",
        }));
        filename = `reservas_${start}_a_${end}`;
        break;
      }

      case "transport": {
        const { data: transport, error } = await supabase
          .from("purchase_orders")
          .select("*")
          .gte("order_date", start)
          .lte("order_date", end)
          .order("order_date", { ascending: false });

        if (error) throw error;

        data = (transport || []).map((po) => ({
          "Orden #": po.order_number,
          Fecha: po.order_date,
          Estado: po.status,
          Subtotal: po.subtotal,
          "Costo Transporte": po.transport_cost,
          "Total Estimado": po.total_cost,
          "Total Real": po.actual_total_cost || "N/A",
          Variacion: po.cost_variance || "N/A",
          Proveedor: po.supplier || "N/A",
          Notas: po.notes || "",
        }));
        filename = `ordenes_compra_${start}_a_${end}`;
        break;
      }

      case "purchase_orders": {
        const { data: orders, error } = await supabase
          .from("purchase_orders")
          .select("*")
          .gte("order_date", start)
          .lte("order_date", end)
          .order("order_date", { ascending: false });

        if (error) throw error;

        data = (orders || []).map((po) => ({
          "Orden #": po.order_number,
          Fecha: po.order_date,
          Estado: po.status,
          Subtotal: po.subtotal,
          "Costo Transporte": po.transport_cost,
          "Total Estimado": po.total_cost,
          "Total Real": po.actual_total_cost || "N/A",
          Variacion: po.cost_variance || "N/A",
          Proveedor: po.supplier || "N/A",
          Notas: po.notes || "",
        }));
        filename = `ordenes_compra_${start}_a_${end}`;
        break;
      }

      case "metrics": {
        const { data: metrics, error } = await supabase
          .from("daily_metrics")
          .select("*")
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: false });

        if (error) throw error;

        data = (metrics || []).map((m) => ({
          Fecha: m.date,
          "Total Villas": m.total_villas,
          "Villas Ocupadas": m.occupied_villas,
          "Ocupacion %": m.occupancy_pct,
          "Total Huespedes": m.total_guests,
          "Ingreso Habitaciones": m.room_revenue,
          "Ingreso F&B": m.fb_revenue,
          "Ingreso Servicios": m.service_revenue,
          "Ingreso Total": m.total_revenue,
          RevPAR: m.revpar,
          ADR: m.adr,
          "Costo Comida": m.food_cost,
          "Costo Transporte": m.transport_cost,
          "Costo Laboral": m.labor_cost,
          "Costo Total": m.total_cost,
          "Margen Bruto": m.gross_margin,
          "Margen Bruto %": m.gross_margin_pct,
          "# Pedidos": m.orders_count,
          "# Mantenimientos": m.maintenance_issues,
          "# Checklists": m.checklists_completed,
        }));
        filename = `metricas_diarias_${start}_a_${end}`;
        break;
      }
    }

    // Si no hay datos
    if (data.length === 0) {
      return NextResponse.json(
        {
          error: "No hay datos para el rango de fechas seleccionado",
          table,
          start,
          end,
        },
        { status: 404 },
      );
    }

    // Generar archivo
    if (format === "csv") {
      const csv = generateCSV(data);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    } else {
      const excel = generateExcel(data, table);
      return new NextResponse(excel, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        },
      });
    }
  } catch (error) {
    console.error("[Export API] Error:", error);
    return NextResponse.json(
      { error: "Error al exportar datos" },
      { status: 500 },
    );
  }
}
