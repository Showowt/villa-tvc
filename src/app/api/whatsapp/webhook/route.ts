// ═══════════════════════════════════════════════════════════════
// TVC WHATSAPP WEBHOOK
// Receives incoming WhatsApp messages from Twilio
// Routes staff messages to /api/ops/staff-bot
// Issue #58 — WHATSAPP STAFF BOT NOT CONNECTED
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import {
  sendWhatsAppMessage,
  normalizePhoneNumber,
  verifyTwilioSignature,
  formatTwiML,
  parseTwilioFormData,
  notifyStaffEscalation,
} from "@/lib/twilio/client";
import { createServerClient } from "@/lib/supabase/client";
import { isConfigured } from "@/lib/env";

interface TwilioWebhookBody {
  Body: string;
  From: string;
  To: string;
  MessageSid: string;
  AccountSid: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
  ProfileName?: string;
}

// Staff phone numbers (registered in users table)
async function isStaffMember(phone: string): Promise<{
  isStaff: boolean;
  userId?: string;
  name?: string;
  department?: string;
  role?: string;
}> {
  try {
    const supabase = createServerClient();
    const normalizedPhone = normalizePhoneNumber(phone);

    // Try multiple phone formats
    const { data: user } = await supabase
      .from("users")
      .select("id, name, department, role, phone")
      .eq("is_active", true)
      .or(
        `phone.eq.${normalizedPhone},phone.eq.${phone},phone.eq.+${normalizedPhone.replace("+", "")}`,
      )
      .single();

    if (
      user &&
      (user.role === "staff" ||
        user.role === "manager" ||
        user.role === "owner")
    ) {
      return {
        isStaff: true,
        userId: user.id,
        name: user.name,
        department: user.department || undefined,
        role: user.role,
      };
    }

    return { isStaff: false };
  } catch {
    return { isStaff: false };
  }
}

// Get conversation history for context
async function getConversationHistory(
  phone: string,
  limit: number = 10,
): Promise<Array<{ role: "user" | "assistant"; text: string }>> {
  try {
    const supabase = createServerClient();
    const normalizedPhone = normalizePhoneNumber(phone);

    // Get recent conversation messages
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id")
      .eq("contact_phone", normalizedPhone)
      .eq("channel", "whatsapp")
      .order("created_at", { ascending: false })
      .limit(1);

    if (!conversations || conversations.length === 0) {
      return [];
    }

    // For now, return empty history - messages are in a separate messages table
    // This is a placeholder for future implementation
    return [];
  } catch {
    return [];
  }
}

// Twilio webhook verification (GET for validation)
export async function GET(request: NextRequest) {
  // Check if Twilio is configured
  if (
    !isConfigured("TWILIO_ACCOUNT_SID") ||
    !isConfigured("TWILIO_AUTH_TOKEN")
  ) {
    return NextResponse.json({
      status: "inactive",
      message: "WhatsApp integration pending configuration",
      required: [
        "TWILIO_ACCOUNT_SID",
        "TWILIO_AUTH_TOKEN",
        "TWILIO_WHATSAPP_FROM",
      ],
      docs: "https://www.twilio.com/docs/messaging/guides/webhook-request-validation",
    });
  }

  return NextResponse.json({
    status: "active",
    message: "TVC WhatsApp webhook ready",
    endpoint: "/api/whatsapp/webhook",
    features: [
      "Staff bot integration",
      "Conversation logging",
      "Escalation to manager",
      "Signature verification",
    ],
  });
}

// Handle incoming WhatsApp messages
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log("[WhatsApp Webhook] Received message");

  try {
    // Parse form-urlencoded body from Twilio
    const formData = await request.formData();
    const params = parseTwilioFormData(formData);

    // Verify Twilio signature in production
    if (process.env.NODE_ENV === "production") {
      const signature = request.headers.get("x-twilio-signature");
      const webhookUrl =
        process.env.NEXT_PUBLIC_APP_URL + "/api/whatsapp/webhook";

      if (signature && !verifyTwilioSignature(signature, webhookUrl, params)) {
        console.error("[WhatsApp Webhook] Invalid Twilio signature");
        return new Response("Invalid signature", { status: 403 });
      }
    }

    const body: TwilioWebhookBody = {
      Body: params.Body || "",
      From: params.From || "",
      To: params.To || "",
      MessageSid: params.MessageSid || "",
      AccountSid: params.AccountSid || "",
      NumMedia: params.NumMedia || "0",
      MediaUrl0: params.MediaUrl0 || undefined,
      MediaContentType0: params.MediaContentType0 || undefined,
      ProfileName: params.ProfileName || undefined,
    };

    const {
      Body: messageText,
      From: fromNumber,
      MessageSid,
      ProfileName,
    } = body;

    if (!messageText || !fromNumber) {
      console.log("[WhatsApp Webhook] Missing required fields");
      return new Response(formatTwiML(), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    console.log(
      `[WhatsApp Webhook] From: ${fromNumber}, Profile: ${ProfileName || "Unknown"}, Message: ${messageText.substring(0, 50)}...`,
    );

    // Check if sender is staff
    const staffCheck = await isStaffMember(fromNumber);

    if (staffCheck.isStaff) {
      // ═══════════════════════════════════════════════════════════════
      // STAFF MESSAGE -> Route to Staff Bot
      // ═══════════════════════════════════════════════════════════════
      console.log(
        `[WhatsApp Webhook] Staff member: ${staffCheck.name} (${staffCheck.department || "no dept"})`,
      );

      try {
        // Get conversation history for context
        const history = await getConversationHistory(fromNumber);

        // Call the staff bot API
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || "https://villa-tvc.vercel.app";

        const staffBotResponse = await fetch(`${baseUrl}/api/ops/staff-bot`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: messageText,
            staffId: staffCheck.userId,
            staffName: staffCheck.name,
            department: staffCheck.department,
            channel: "whatsapp",
            history,
          }),
        });

        const botResult = await staffBotResponse.json();

        if (botResult.success && botResult.response) {
          // Send response via WhatsApp
          const sendResult = await sendWhatsAppMessage(
            fromNumber,
            botResult.response,
          );

          if (sendResult.success) {
            console.log(
              `[WhatsApp Webhook] Staff bot response sent to ${staffCheck.name}`,
            );
          } else {
            console.error(
              `[WhatsApp Webhook] Failed to send response: ${sendResult.error}`,
            );
          }

          // Check if escalation is needed
          if (botResult.needsEscalation) {
            await notifyStaffEscalation(undefined, {
              senderPhone: normalizePhoneNumber(fromNumber),
              senderName: staffCheck.name || null,
              reason: botResult.escalationReason || "Bot unsure about answer",
              lastMessage: messageText,
              isStaff: true,
            });
          }
        } else {
          // Send error fallback
          await sendWhatsAppMessage(
            fromNumber,
            "Lo siento, tuve un problema procesando tu mensaje. Por favor contacta a Akil directamente: +57 316 055 1387",
          );
        }

        // Log the conversation
        const supabase = createServerClient();
        await logConversation(supabase, {
          channel: "whatsapp",
          contactType: "staff",
          contactPhone: normalizePhoneNumber(fromNumber),
          contactName: staffCheck.name || ProfileName || null,
          message: messageText,
          response: botResult.response || null,
          status: botResult.needsEscalation ? "escalated" : "resolved",
          responseTimeMs: Date.now() - startTime,
          twilioSid: MessageSid,
        });
      } catch (error) {
        console.error("[WhatsApp Webhook] Staff bot error:", error);
        await sendWhatsAppMessage(
          fromNumber,
          "Error de conexion. Por favor intenta de nuevo o contacta a Akil: +57 316 055 1387",
        );
      }
    } else {
      // ═══════════════════════════════════════════════════════════════
      // GUEST/UNKNOWN MESSAGE -> Log and auto-reply
      // ═══════════════════════════════════════════════════════════════
      console.log(`[WhatsApp Webhook] Guest/Unknown: ${fromNumber}`);

      // Log the conversation
      const supabase = createServerClient();
      await logConversation(supabase, {
        channel: "whatsapp",
        contactType: "guest",
        contactPhone: normalizePhoneNumber(fromNumber),
        contactName: ProfileName || null,
        message: messageText,
        response: null,
        status: "active",
        responseTimeMs: Date.now() - startTime,
        twilioSid: MessageSid,
      });

      // Send auto-reply for guests
      await sendWhatsAppMessage(
        fromNumber,
        `Hola! Gracias por contactar a TVC - Tiny Village Cartagena.

Un miembro de nuestro equipo te respondera pronto.

Para emergencias, contacta a Akil: +57 316 055 1387

---

Hi! Thanks for contacting TVC - Tiny Village Cartagena.

A team member will respond shortly.

For emergencies, contact Akil: +57 316 055 1387`,
      );
    }

    // Return TwiML response (empty since we already sent via API)
    return new Response(formatTwiML(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("[WhatsApp Webhook] Error:", error);
    // Still return 200 to prevent Twilio retries
    return new Response(formatTwiML(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}

// Helper to log conversations
async function logConversation(
  supabase: ReturnType<typeof createServerClient>,
  data: {
    channel: "whatsapp" | "web";
    contactType: "staff" | "guest";
    contactPhone: string;
    contactName: string | null;
    message: string;
    response: string | null;
    status: "active" | "resolved" | "escalated";
    responseTimeMs: number;
    twilioSid?: string;
  },
): Promise<void> {
  try {
    // Insert conversation record
    const { error } = await supabase.from("conversations").insert({
      channel: data.channel,
      contact_type: data.contactType,
      contact_phone: data.contactPhone,
      contact_name: data.contactName,
      language: "es",
      status: data.status,
      summary: data.message.substring(0, 200),
      topics: data.response ? ["staff_bot_query"] : ["incoming_message"],
    });

    if (error) {
      console.error("[WhatsApp Webhook] Failed to log conversation:", error);
    }
  } catch (error) {
    console.error("[WhatsApp Webhook] Error logging conversation:", error);
  }
}
