import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const context = formData.get("context") as string | null; // e.g., "housekeeping", "maintenance", "pool"
    const taskId = formData.get("taskId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only JPEG, PNG, WebP, and HEIC are allowed.",
        },
        { status: 400 },
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // Generate unique filename
    const timestamp = Date.now();
    const dateFolder = new Date().toISOString().split("T")[0];
    const ext = file.name.split(".").pop() || "jpg";
    const contextFolder = context || "general";
    const fileName = `${contextFolder}/${dateFolder}/${taskId || "task"}_${timestamp}.${ext}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("checklist-photos")
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("[upload] Storage error:", error);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 },
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("checklist-photos")
      .getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: data.path,
      fileName: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error("[upload] Error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

// DELETE - Remove uploaded photo
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error } = await supabase.storage
      .from("checklist-photos")
      .remove([path]);

    if (error) {
      console.error("[upload DELETE] Storage error:", error);
      return NextResponse.json(
        { error: "Failed to delete file" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[upload DELETE] Error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
