import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

// GET - Obtener rendimiento de proveedores
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get("sort") || "reliability_score";
    const sortOrder = searchParams.get("order") || "desc";

    const supabase = createServerClient();

    const { data: suppliers, error } = await supabase
      .from("supplier_performance")
      .select("*")
      .order(sortBy, { ascending: sortOrder === "asc" });

    if (error) {
      throw error;
    }

    // Calcular estadisticas globales
    const totalOrders = suppliers?.reduce(
      (sum, s) => sum + (s.total_orders || 0),
      0,
    );
    const totalWithDiscrepancies = suppliers?.reduce(
      (sum, s) => sum + (s.orders_with_discrepancies || 0),
      0,
    );
    const avgReliability =
      suppliers && suppliers.length > 0
        ? suppliers.reduce((sum, s) => sum + (s.reliability_score || 0), 0) /
          suppliers.length
        : 0;

    // Identificar proveedores problematicos (reliability < 90%)
    const problematicSuppliers =
      suppliers?.filter((s) => (s.reliability_score || 100) < 90) || [];

    return NextResponse.json({
      success: true,
      suppliers: suppliers || [],
      stats: {
        total_suppliers: suppliers?.length || 0,
        total_orders: totalOrders,
        total_with_discrepancies: totalWithDiscrepancies,
        avg_reliability_score: Math.round(avgReliability * 10) / 10,
        problematic_count: problematicSuppliers.length,
      },
      problematic_suppliers: problematicSuppliers,
    });
  } catch (error) {
    console.error("[GET supplier-performance]", error);
    return NextResponse.json(
      { error: "Error al obtener rendimiento de proveedores" },
      { status: 500 },
    );
  }
}

// PUT - Actualizar notas de proveedor
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { supplier_id, notes } = body as {
      supplier_id: string;
      notes: string;
    };

    if (!supplier_id) {
      return NextResponse.json(
        { error: "supplier_id es requerido" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from("supplier_performance")
      .update({
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", supplier_id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Notas de proveedor actualizadas",
    });
  } catch (error) {
    console.error("[PUT supplier-performance]", error);
    return NextResponse.json(
      { error: "Error al actualizar notas de proveedor" },
      { status: 500 },
    );
  }
}
