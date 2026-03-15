import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  upsertGuest,
  getOrCreateConversation,
  addMessage,
  getConversationHistory,
  escalateConversation,
  updateGuestLanguage,
  updateGuestJourneyStage,
} from "@/lib/supabase/queries";
import { generateVillaResponse } from "@/lib/villa/brain";
import {
  sendWhatsAppMessage,
  notifyStaffEscalation,
  normalizePhoneNumber,
} from "@/lib/twilio/client";
import type { Language } from "@/types";

// Twilio webhook payload schema
const TwilioWebhookSchema = z.object({
  From: z.string(),
  Body: z.string(),
  MessageSid: z.string(),
  NumMedia: z.string().optional(),
  ProfileName: z.string().optional(),
  MediaUrl0: z.string().optional(),
  MediaContentType0: z.string().optional(),
});

// GET - Webhook verification (for Twilio setup)
export async function GET() {
  return NextResponse.json({ status: "Villa TVC webhook is active" });
}

// POST - Handle incoming WhatsApp messages
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse form data from Twilio
    const formData = await request.formData();
    const body: Record<string, string> = {};
    formData.forEach((value, key) => {
      body[key] = value.toString();
    });

    // Validate payload
    const parseResult = TwilioWebhookSchema.safeParse(body);
    if (!parseResult.success) {
      console.error("[Webhook] Invalid payload:", parseResult.error);
      return new NextResponse("Invalid payload", { status: 400 });
    }

    const payload = parseResult.data;
    const phone = normalizePhoneNumber(payload.From);
    const messageBody = payload.Body.trim();
    const guestName = payload.ProfileName || null;

    console.log(`[Webhook] Incoming message from ${phone}: "${messageBody}"`);

    // Handle media messages (images, voice notes)
    if (payload.NumMedia && parseInt(payload.NumMedia) > 0) {
      const mediaType = payload.MediaContentType0 || "unknown";

      // For images, acknowledge and continue
      if (mediaType.startsWith("image/")) {
        await handleMediaMessage(phone, "image", guestName);
        return createTwiMLResponse();
      }

      // For voice notes, politely redirect to text
      if (mediaType.startsWith("audio/")) {
        await handleMediaMessage(phone, "audio", guestName);
        return createTwiMLResponse();
      }
    }

    // Upsert guest in database
    const guest = await upsertGuest(phone, guestName || undefined);

    // Get or create conversation
    const conversation = await getOrCreateConversation(guest.id);

    // Store incoming message
    await addMessage(conversation.id, "guest", messageBody, {
      twilio_sid: payload.MessageSid,
    });

    // Get conversation history for context
    const history = await getConversationHistory(conversation.id, 10);

    // Generate Villa's response
    const villaResponse = await generateVillaResponse({
      guest,
      conversation_history: history,
      current_message: messageBody,
      journey_stage: guest.journey_stage,
    });

    // Update guest language if detected differently
    if (villaResponse.language_detected !== guest.language) {
      await updateGuestLanguage(
        guest.id,
        villaResponse.language_detected as Language,
      );
    }

    // Update journey stage if suggested
    if (villaResponse.suggested_journey_stage) {
      await updateGuestJourneyStage(
        guest.id,
        villaResponse.suggested_journey_stage,
      );
    }

    // Handle escalation if needed
    if (villaResponse.should_escalate) {
      await escalateConversation(
        conversation.id,
        villaResponse.escalation_reason || "Unknown reason",
      );

      // Notify staff
      await notifyStaffEscalation(
        phone,
        guest.name,
        villaResponse.escalation_reason || "Unknown reason",
        messageBody,
      );
    }

    // Store Villa's response
    const responseTimeMs = Date.now() - startTime;
    await addMessage(conversation.id, "villa", villaResponse.response, {
      language_detected: villaResponse.language_detected,
      blind_spots_triggered: villaResponse.blind_spots_to_surface,
      escalation_check: villaResponse.should_escalate,
      response_time_ms: responseTimeMs,
    });

    // Send response via Twilio
    await sendWhatsAppMessage(payload.From, villaResponse.response);

    console.log(
      `[Webhook] Response sent in ${responseTimeMs}ms, escalated: ${villaResponse.should_escalate}`,
    );

    return createTwiMLResponse();
  } catch (error) {
    console.error("[Webhook] Error processing message:", error);

    // Try to send error message to guest
    try {
      const formData = await request.clone().formData();
      const from = formData.get("From")?.toString();
      if (from) {
        await sendWhatsAppMessage(
          from,
          "I apologize, but I'm having a technical moment! Please reach out to our team directly at (+57) 316 055 1387 and they'll help you right away. 🌴",
        );
      }
    } catch {
      // Ignore secondary error
    }

    return createTwiMLResponse();
  }
}

// Handle media messages (images, voice notes)
async function handleMediaMessage(
  phone: string,
  mediaType: "image" | "audio",
  guestName: string | null,
) {
  const guest = await upsertGuest(phone, guestName || undefined);
  const conversation = await getOrCreateConversation(guest.id);

  if (mediaType === "image") {
    const response =
      "Thanks for sharing that image! 📸 I can see you sent a photo. How can I help you today? Feel free to ask me anything about Tiny Village Cartagena or your trip!";

    await addMessage(conversation.id, "guest", "[Image received]", {});
    await addMessage(conversation.id, "villa", response, {});
    await sendWhatsAppMessage(`whatsapp:${phone}`, response);
  } else if (mediaType === "audio") {
    const response =
      "I received your voice message! 🎙️ I work best with text messages so I can help you most accurately. Could you type out your question? I'm here to help with anything about TVC or Cartagena!";

    await addMessage(conversation.id, "guest", "[Voice note received]", {});
    await addMessage(conversation.id, "villa", response, {});
    await sendWhatsAppMessage(`whatsapp:${phone}`, response);
  }
}

// Create empty TwiML response (we send messages via API, not TwiML)
function createTwiMLResponse() {
  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    {
      headers: {
        "Content-Type": "text/xml",
      },
    },
  );
}
