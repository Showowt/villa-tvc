import twilio from "twilio";

// Initialize Twilio client
export function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("Missing Twilio credentials");
  }

  return twilio(accountSid, authToken);
}

// Send WhatsApp message
export async function sendWhatsAppMessage(
  to: string,
  body: string,
): Promise<string> {
  const client = getTwilioClient();
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!from) {
    throw new Error("Missing TWILIO_WHATSAPP_FROM environment variable");
  }

  // Ensure 'to' is in WhatsApp format
  const toNumber = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  try {
    const message = await client.messages.create({
      body,
      from,
      to: toNumber,
    });

    console.log(`[Twilio] Message sent: ${message.sid}`);
    return message.sid;
  } catch (error) {
    console.error("[Twilio] Error sending message:", error);
    throw error;
  }
}

// Notify staff of escalation
export async function notifyStaffEscalation(
  guestPhone: string,
  guestName: string | null,
  reason: string,
  lastMessage: string,
): Promise<void> {
  const staffPhone = process.env.TVC_STAFF_WHATSAPP;

  if (!staffPhone) {
    console.error("[Twilio] TVC_STAFF_WHATSAPP not configured");
    return;
  }

  const notification = `🚨 ESCALATION ALERT

Guest: ${guestName || "Unknown"}
Phone: ${guestPhone}
Reason: ${reason}

Last message:
"${lastMessage}"

Please respond to this guest as soon as possible.`;

  try {
    await sendWhatsAppMessage(staffPhone, notification);
    console.log("[Twilio] Staff notified of escalation");
  } catch (error) {
    console.error("[Twilio] Failed to notify staff:", error);
  }
}

// Verify Twilio webhook signature
export function verifyTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!authToken) {
    console.error("[Twilio] Missing auth token for signature verification");
    return false;
  }

  return twilio.validateRequest(authToken, signature, url, params);
}

// Parse incoming WhatsApp number to standard format
export function normalizePhoneNumber(twilioFrom: string): string {
  // Remove 'whatsapp:' prefix if present
  return twilioFrom.replace("whatsapp:", "");
}
