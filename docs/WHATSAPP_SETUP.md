# TVC WhatsApp Staff Bot Setup Guide

## Overview

The TVC WhatsApp Staff Bot allows staff members to ask operational questions via WhatsApp and receive AI-powered responses from the knowledge base.

## Features

- **Recipe Queries**: "Como preparo un Moscow Mule?"
- **Inventory Checks**: "Hay pollo disponible?"
- **Occupancy Info**: "Cuantos huespedes hoy?"
- **Boat Schedules**: "A que hora llega el bote?"
- **Allergy Info**: "Opciones sin gluten?"
- **Automatic Escalation**: When bot is unsure or emergency detected

---

## Prerequisites

1. **Twilio Account** with WhatsApp Business API
2. **Supabase Project** with schema deployed
3. **Anthropic API Key** for Claude
4. **Domain** (or ngrok for local testing)

---

## Environment Variables

Add these to your `.env.local` and Vercel environment:

```bash
# Twilio WhatsApp
TWILIO_ACCOUNT_SID=AC...           # From Twilio Console
TWILIO_AUTH_TOKEN=...               # From Twilio Console
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886  # Your Twilio WhatsApp number

# Notifications
TVC_STAFF_WHATSAPP=whatsapp:+573160551387   # Akil's number for escalations

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# App URL (for webhook self-calls)
NEXT_PUBLIC_APP_URL=https://villa-tvc.vercel.app
```

---

## Twilio Console Configuration

### 1. WhatsApp Sandbox (Development)

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Messaging > Try it out > Send a WhatsApp message**
3. Follow sandbox setup instructions
4. Note your sandbox number (e.g., `+14155238886`)

### 2. Configure Webhook

1. In Twilio Console, go to **Messaging > Settings > WhatsApp sandbox settings**
2. Set webhook URL:
   - **When a message comes in**: `https://your-domain.com/api/whatsapp/webhook`
   - **HTTP POST**
3. Save configuration

---

## Local Development with ngrok

### 1. Install ngrok

```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

### 2. Start Your Local Server

```bash
cd villa-tvc
npm run dev
# Server runs on http://localhost:3000
```

### 3. Start ngrok Tunnel

```bash
ngrok http 3000
```

You'll see output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

### 4. Update Twilio Webhook

Set the webhook URL to:
```
https://abc123.ngrok.io/api/whatsapp/webhook
```

### 5. Test the Bot

1. Send a WhatsApp message to the Twilio sandbox number
2. Use the magic phrase if required (sandbox only)
3. Send: "Como preparo un mojito?"
4. You should receive a response with the recipe

---

## Staff Registration

For the bot to recognize staff members, they must be in the `users` table:

```sql
INSERT INTO users (name, email, phone, role, department, is_active)
VALUES (
    'Maria Chef',
    'maria@tvc.co',
    '+573001234567',
    'staff',
    'kitchen',
    true
);
```

Phone formats supported:
- `+573001234567` (with country code)
- `573001234567` (without +)
- `3001234567` (local format)

---

## Production Deployment

### 1. Verify Environment Variables in Vercel

1. Go to Vercel Dashboard > Project > Settings > Environment Variables
2. Ensure all Twilio and Anthropic variables are set
3. Redeploy if needed

### 2. Update Twilio Webhook

Point to production URL:
```
https://villa-tvc.vercel.app/api/whatsapp/webhook
```

### 3. Enable Signature Verification

The webhook automatically verifies Twilio signatures in production mode.

---

## Testing Queries

Send these test messages to verify functionality:

| Query | Expected Behavior |
|-------|-------------------|
| "Como preparo un Moscow Mule?" | Recipe from SOP library |
| "Hay pollo disponible?" | Inventory status |
| "Cuantos huespedes hoy?" | Today's occupancy |
| "A que hora llega el bote?" | Boat schedule |
| "Alguien tiene alergia al gluten" | GF menu options |
| "EMERGENCIA" | Escalation triggered |
| "Necesito hablar con Akil" | Escalation triggered |

---

## Monitoring & Logs

### Vercel Logs
```bash
vercel logs villa-tvc --follow
```

### Filter WhatsApp logs:
Look for entries starting with `[WhatsApp Webhook]` or `[StaffBot]`

### Database Logs

Check `conversations` table:
```sql
SELECT * FROM conversations
WHERE channel = 'whatsapp'
ORDER BY created_at DESC
LIMIT 20;
```

Check `staff_bot_logs` table (after migration):
```sql
SELECT * FROM staff_bot_logs
ORDER BY created_at DESC
LIMIT 20;
```

---

## Troubleshooting

### Message Not Received

1. Check Twilio Console > Monitor > Logs
2. Verify webhook URL is correct
3. Check ngrok is running (for local dev)
4. Verify Twilio credentials in env vars

### Bot Not Responding

1. Check Vercel/local logs for errors
2. Verify ANTHROPIC_API_KEY is valid
3. Check Supabase connection
4. Ensure staff phone is in users table

### Wrong Response Language

The bot defaults to Spanish. If receiving English responses, check the system prompt in `/api/ops/staff-bot/route.ts`.

### Escalation Not Working

1. Verify TVC_STAFF_WHATSAPP is set correctly
2. Format must be: `whatsapp:+573160551387`
3. Check Twilio sending logs

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/whatsapp/webhook` | GET | Health check |
| `/api/whatsapp/webhook` | POST | Receive Twilio messages |
| `/api/ops/staff-bot` | POST | Staff bot AI response |
| `/api/staff-bot` | POST | Alias (redirects to ops) |

---

## Security Notes

1. **Signature Verification**: Enabled in production
2. **Staff Validation**: Only registered staff get AI responses
3. **Rate Limiting**: Consider adding if high volume
4. **Secrets**: Never commit API keys to git

---

## Contact

For issues with the WhatsApp integration, contact:
- **Technical**: Check logs and this documentation
- **Twilio Issues**: Review Twilio Console > Monitor
- **Escalations**: Akil +57 316 055 1387
