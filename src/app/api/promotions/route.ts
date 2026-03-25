// ============================================
// PROMOTIONS API (Issue 68)
// Manage happy hour and promotional discounts
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { z } from "zod";

// Validation schema for promotions
const promotionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  name_es: z.string().min(1, "Spanish name is required"),
  description: z.string().optional(),
  description_es: z.string().optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format"),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format"),
  days_of_week: z
    .array(z.number().min(0).max(6))
    .default([0, 1, 2, 3, 4, 5, 6]),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
  discount_type: z.enum(["percentage", "fixed", "bogo", "free_item"]),
  discount_value: z.number().min(0),
  applies_to: z.enum(["all", "category", "items"]).default("all"),
  category_filter: z.array(z.string()).optional(),
  item_ids: z.array(z.string().uuid()).optional(),
  min_purchase: z.number().min(0).default(0),
  banner_text: z.string().optional(),
  banner_text_es: z.string().optional(),
  is_active: z.boolean().default(true),
});

// GET /api/promotions - Get all promotions or active only
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";
    const includeExpired = searchParams.get("include_expired") === "true";

    const supabase = createServerClient();
    const today = new Date().toISOString().split("T")[0];

    let query = supabase.from("promotions").select("*").order("start_time");

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    if (!includeExpired) {
      query = query.or(`valid_until.is.null,valid_until.gte.${today}`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[Promotions API] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch promotions" },
      { status: 500 },
    );
  }
}

// POST /api/promotions - Create new promotion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = promotionSchema.parse(body);

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("promotions")
      .insert(validated)
      .select()
      .single();

    if (error) {
      console.error("[Promotions API] Insert error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: "Promotion created successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid input", details: error.errors },
        { status: 400 },
      );
    }
    console.error("[Promotions API] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create promotion" },
      { status: 500 },
    );
  }
}

// PATCH /api/promotions - Update promotion
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Promotion ID is required" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("promotions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: "Promotion updated successfully",
    });
  } catch (error) {
    console.error("[Promotions API] PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update promotion" },
      { status: 500 },
    );
  }
}

// DELETE /api/promotions - Delete promotion
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Promotion ID is required" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    const { error } = await supabase.from("promotions").delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Promotion deleted successfully",
    });
  } catch (error) {
    console.error("[Promotions API] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete promotion" },
      { status: 500 },
    );
  }
}
