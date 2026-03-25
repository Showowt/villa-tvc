// ═══════════════════════════════════════════════════════════════
// TVC TWILIO CLIENT - P0 Day 1 Fix
// Issue #82 — Clear errors when env vars missing
// WhatsApp messaging, signature verification, and message queuing
// ═══════════════════════════════════════════════════════════════

import twilio from "twilio";
import { isConfigured } from "@/lib/env";

// ─────────────────────────────────────────────────────────────────
// AVAILABILITY CHECKS
// ─────────────────────────────────────────────────────────────────

/**
 * Check if Twilio is fully configured
 */
export function isTwilioAvailable(): boolean {
  return (
    isConfigured("TWILIO_ACCOUNT_SID") &&
    isConfigured("TWILIO_AUTH_TOKEN") &&
    isConfigured("TWILIO_WHATSAPP_FROM")
  );
}

/**
 * Check if WhatsApp staff notifications are configured
 */
export function isStaffNotificationAvailable(): boolean {
  return isTwilioAvailable() && isConfigured("TVC_STAFF_WHATSAPP");
}

// ─────────────────────────────────────────────────────────────────
// MESSAGE QUEUE FOR RETRY LOGIC
// ─────────────────────────────────────────────────────────────────

interface QueuedMessage {
  to: string;
  body: string;
  retryCount: number;
  maxRetries: number;
  lastAttempt: Date;
}

const messageQueue: QueuedMessage[] = [];
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

// ─────────────────────────────────────────────────────────────────
// CLIENT CREATION
// ─────────────────────────────────────────────────────────────────

/**
 * Get Twilio client with clear error messages
 */
export function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid) {
    throw new Error(
      "Missing TWILIO_ACCOUNT_SID\n\n" +
        "Fix: Add to .env.local or Vercel environment variables.\n" +
        "Get from: twilio.com/console (Account SID on dashboard)\n" +
        "Format: Starts with 'AC'\n\n" +
        "See /error-config for full diagnostic.",
    );
  }

  if (!authToken) {
    throw new Error(
      "Missing TWILIO_AUTH_TOKEN\n\n" +
        "Fix: Add to .env.local or Vercel environment variables.\n" +
        "Get from: twilio.com/console (Auth Token on dashboard)\n\n" +
        "See /error-config for full diagnostic.",
    );
  }

  return twilio(accountSid, authToken);
}

// ─────────────────────────────────────────────────────────────────
// PHONE NUMBER UTILITIES
// ─────────────────────────────────────────────────────────────────

/**
 * Parse incoming WhatsApp number to standard format
 */
export function normalizePhoneNumber(twilioFrom: string): string {
  // Remove 'whatsapp:' prefix if present
  return twilioFrom.replace("whatsapp:", "");
}

/**
 * Format phone number for WhatsApp
 */
export function formatWhatsAppNumber(phone: string): string {
  // Ensure 'whatsapp:' prefix
  if (phone.startsWith("whatsapp:")) {
    return phone;
  }
  // Ensure + prefix for international format
  const cleanPhone = phone.startsWith("+") ? phone : `+${phone}`;
  return `whatsapp:${cleanPhone}`;
}

// ─────────────────────────────────────────────────────────────────
// WHATSAPP MESSAGING
// ─────────────────────────────────────────────────────────────────

/**
 * Send WhatsApp message with retry logic
 */
export async function sendWhatsAppMessage(
  to: string,
  body: string,
  mediaUrl?: string,
): Promise<{ success: boolean; sid?: string; error?: string }> {
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!from) {
    const errorMsg =
      "Missing TWILIO_WHATSAPP_FROM\n\n" +
      "Fix: Add to .env.local or Vercel environment variables.\n" +
      "Format: 'whatsapp:+1234567890'\n" +
      "Get from: Twilio WhatsApp Sandbox or Business number\n\n" +
      "See /error-config for full diagnostic.";
    console.error(`[Twilio] ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  let client;
  try {
    client = getTwilioClient();
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Failed to create Twilio client";
    console.error(`[Twilio] ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  // Format the destination number
  const toNumber = formatWhatsAppNumber(to);

  try {
    const messageOptions: {
      body: string;
      from: string;
      to: string;
      mediaUrl?: string[];
    } = {
      body,
      from,
      to: toNumber,
    };

    if (mediaUrl) {
      messageOptions.mediaUrl = [mediaUrl];
    }

    const message = await client.messages.create(messageOptions);

    console.log(`[Twilio] Message sent: ${message.sid} to ${toNumber}`);
    return { success: true, sid: message.sid };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[Twilio] Error sending message to ${toNumber}:`,
      errorMessage,
    );

    // Add to retry queue
    addToRetryQueue(to, body);

    return { success: false, error: errorMessage };
  }
}

/**
 * Send WhatsApp message safely - returns null instead of throwing
 */
export async function sendWhatsAppMessageSafe(
  to: string,
  body: string,
): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!isTwilioAvailable()) {
    console.warn(
      "[Twilio] Not configured - message not sent. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM",
    );
    return { success: false, error: "Twilio not configured" };
  }

  return sendWhatsAppMessage(to, body);
}

// ─────────────────────────────────────────────────────────────────
// RETRY QUEUE
// ─────────────────────────────────────────────────────────────────

/**
 * Add message to retry queue
 */
function addToRetryQueue(to: string, body: string): void {
  messageQueue.push({
    to,
    body,
    retryCount: 0,
    maxRetries: MAX_RETRIES,
    lastAttempt: new Date(),
  });
}

/**
 * Process retry queue (call this from a cron job)
 */
export async function processRetryQueue(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const results = { processed: 0, succeeded: 0, failed: 0 };

  const now = new Date();
  const messagesToRetry = messageQueue.filter(
    (msg) => now.getTime() - msg.lastAttempt.getTime() > RETRY_DELAY_MS,
  );

  for (const msg of messagesToRetry) {
    results.processed++;

    const result = await sendWhatsAppMessageDirect(msg.to, msg.body);

    if (result.success) {
      results.succeeded++;
      // Remove from queue
      const index = messageQueue.indexOf(msg);
      if (index > -1) {
        messageQueue.splice(index, 1);
      }
    } else {
      msg.retryCount++;
      msg.lastAttempt = new Date();

      if (msg.retryCount >= msg.maxRetries) {
        results.failed++;
        // Remove from queue after max retries
        const index = messageQueue.indexOf(msg);
        if (index > -1) {
          messageQueue.splice(index, 1);
        }
        console.error(
          `[Twilio] Message to ${msg.to} failed after ${msg.maxRetries} retries`,
        );
      }
    }
  }

  return results;
}

/**
 * Direct send without retry queue (used by retry logic)
 */
async function sendWhatsAppMessageDirect(
  to: string,
  body: string,
): Promise<{ success: boolean; sid?: string; error?: string }> {
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!from) {
    return { success: false, error: "Missing TWILIO_WHATSAPP_FROM" };
  }

  let client;
  try {
    client = getTwilioClient();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create client",
    };
  }

  const toNumber = formatWhatsAppNumber(to);

  try {
    const message = await client.messages.create({
      body,
      from,
      to: toNumber,
    });

    return { success: true, sid: message.sid };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

// ─────────────────────────────────────────────────────────────────
// TWIML RESPONSES
// ─────────────────────────────────────────────────────────────────

/**
 * Format TwiML response for webhooks
 */
export function formatTwiML(message?: string): string {
  if (!message) {
    // Empty response - Twilio expects this when we've already sent via API
    return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
  }

  // Escape XML special characters
  const escapedMessage = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapedMessage}</Message></Response>`;
}

// ─────────────────────────────────────────────────────────────────
// STAFF NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────

/**
 * Notify staff of escalation
 */
export async function notifyStaffEscalation(
  staffPhone: string | undefined,
  context: {
    senderPhone: string;
    senderName: string | null;
    reason: string;
    lastMessage: string;
    isStaff: boolean;
  },
): Promise<{ success: boolean; error?: string }> {
  const targetPhone = staffPhone || process.env.TVC_STAFF_WHATSAPP;

  if (!targetPhone) {
    console.warn(
      "[Twilio] TVC_STAFF_WHATSAPP not configured - escalation notification skipped\n" +
        "Fix: Add TVC_STAFF_WHATSAPP to environment variables\n" +
        "Format: 'whatsapp:+1234567890'",
    );
    return { success: false, error: "No staff phone configured" };
  }

  if (!isTwilioAvailable()) {
    console.warn(
      "[Twilio] Twilio not configured - escalation notification skipped\n" +
        "Fix: Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM",
    );
    return { success: false, error: "Twilio not configured" };
  }

  const notification = context.isStaff
    ? `*ESCALACION - PREGUNTA DE STAFF*

De: ${context.senderName || "Staff"}
Tel: ${context.senderPhone}

*Razon:* ${context.reason}

*Mensaje:*
"${context.lastMessage.substring(0, 500)}"

Por favor responde a esta consulta lo antes posible.`
    : `*ESCALATION ALERT - GUEST*

Guest: ${context.senderName || "Unknown"}
Phone: ${context.senderPhone}
Reason: ${context.reason}

Last message:
"${context.lastMessage.substring(0, 500)}"

Please respond to this guest ASAP.`;

  return await sendWhatsAppMessage(targetPhone, notification);
}

// ─────────────────────────────────────────────────────────────────
// WEBHOOK VERIFICATION
// ─────────────────────────────────────────────────────────────────

/**
 * Verify Twilio webhook signature
 */
export function verifyTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!authToken) {
    console.error(
      "[Twilio] Missing TWILIO_AUTH_TOKEN for signature verification\n" +
        "Fix: Add TWILIO_AUTH_TOKEN to environment variables",
    );
    return false;
  }

  try {
    return twilio.validateRequest(authToken, signature, url, params);
  } catch (error) {
    console.error("[Twilio] Signature verification error:", error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────

/**
 * Calculate typing delay based on message length
 */
export function getTypingDelay(messageLength: number): number {
  // Simulate typing time based on message length
  // Average typing speed: 40 wpm = ~200 chars/min = ~3.3 chars/sec
  const baseDelay = 1000; // 1 second minimum
  const charsPerSecond = 30; // Faster than human for bot responses
  const calculatedDelay = Math.ceil(messageLength / charsPerSecond) * 1000;
  return Math.min(Math.max(calculatedDelay, baseDelay), 5000); // Cap at 5 seconds
}

/**
 * Parse form data from Twilio webhook
 */
export function parseTwilioFormData(
  formData: FormData,
): Record<string, string> {
  const params: Record<string, string> = {};

  formData.forEach((value, key) => {
    if (typeof value === "string") {
      params[key] = value;
    }
  });

  return params;
}

/**
 * Get message status (for debugging/logging)
 */
export async function getMessageStatus(messageSid: string): Promise<{
  status: string;
  errorCode?: number;
  errorMessage?: string;
} | null> {
  if (!isTwilioAvailable()) {
    console.warn("[Twilio] Not configured - cannot fetch message status");
    return null;
  }

  try {
    const client = getTwilioClient();
    const message = await client.messages(messageSid).fetch();

    return {
      status: message.status,
      errorCode: message.errorCode || undefined,
      errorMessage: message.errorMessage || undefined,
    };
  } catch (error) {
    console.error("[Twilio] Error fetching message status:", error);
    return null;
  }
}
