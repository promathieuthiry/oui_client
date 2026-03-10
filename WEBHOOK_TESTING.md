# Webhook Testing Guide

This guide explains how to test the Octopush webhook implementation.

## Overview

The webhook at `/api/webhooks/octopush/delivery` receives delivery status updates from Octopush and updates both `sms_sends` and `bookings` tables accordingly.

## Prerequisites

1. ✅ Database index created (migration 012)
2. ✅ Webhook route has comprehensive logging
3. ✅ Webhook properly exempted from auth middleware
4. ✅ Environment variables configured

## Webhook URL Configuration

**CRITICAL**: The webhook URL is NOT passed when sending SMS. You must configure it manually in the Octopush Dashboard:

1. Log into [Octopush Dashboard](https://www.octopush.com/)
2. Go to: **Settings > Callbacks** (or similar section)
3. Set **Delivery Receipt URL**: `https://your-domain.vercel.app/api/webhooks/octopush/delivery`
4. Set **Inbound SMS URL**: `https://your-domain.vercel.app/api/sms/reply`
5. Save the configuration

**Note**: This is a **one-time manual configuration** per environment (staging/production).

The webhook URLs for your deployment will be:
- Delivery: `https://your-domain.vercel.app/api/webhooks/octopush/delivery`
- Reply: `https://your-domain.vercel.app/api/sms/reply`

## Local Testing Options

### Option A: ngrok Tunnel (Recommended for Quick Testing)

Expose your local server to the internet:

```bash
# 1. Install ngrok (if not already installed)
npm install -g ngrok

# 2. Start your Next.js dev server
npm run dev

# 3. In another terminal, create tunnel
ngrok http 3000

# 4. Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# 5. Configure in Octopush Dashboard:
#    https://abc123.ngrok.io/api/webhooks/octopush/delivery

# 6. Send a test SMS from your app
# 7. Watch your terminal for [Webhook] logs
```

**Pros**:
- Quick setup
- Real-time local debugging
- See logs immediately

**Cons**:
- URL changes on each restart (free tier)
- Requires keeping tunnel open

### Option B: Vercel Preview Deployment

Use a stable preview URL:

```bash
# 1. Push your branch to GitHub
git push origin your-branch-name

# 2. Vercel auto-deploys to:
#    https://your-app-git-branch-name.vercel.app

# 3. Configure webhook URL in Octopush Dashboard

# 4. Check Vercel logs for webhook activity
```

**Pros**:
- Stable URL
- Matches production environment
- Easy to share with team

**Cons**:
- Slower iteration (need to push changes)
- Check logs in Vercel dashboard

### Option C: Mock Webhook Locally

Simulate webhook calls without exposing server:

```bash
# 1. Get a real octopush_ticket from your database:
#    SELECT octopush_ticket FROM sms_sends ORDER BY created_at DESC LIMIT 1;

# 2. Edit scripts/test-webhook.ts and update message_id

# 3. Start your dev server
npm run dev

# 4. Run the test script
npx tsx scripts/test-webhook.ts

# 5. Test all status codes
npx tsx scripts/test-webhook.ts --all
```

**Pros**:
- No external services needed
- Fast iteration
- Test all status codes easily

**Cons**:
- Requires real octopush_ticket from DB
- Doesn't test actual Octopush integration

## Production Testing

### Step 1: Apply Database Migration

```bash
# Push migration to Supabase
npm run db:push

# Or apply manually in Supabase Studio SQL editor:
# Copy contents of supabase/migrations/012_add_octopush_ticket_index.sql
```

### Step 2: Deploy to Production

```bash
git push origin main
# Vercel auto-deploys
```

### Step 3: Configure Webhook URLs

1. Log into Octopush Dashboard
2. Configure delivery webhook: `https://your-production-domain.com/api/webhooks/octopush/delivery`
3. Configure reply webhook: `https://your-production-domain.com/api/sms/reply`
4. Save configuration

### Step 4: Send Test SMS

1. Create a test booking with **your own phone number**
2. Go to `/bookings` page
3. Select the booking
4. Click "Envoyer les SMS"
5. Wait for SMS delivery

### Step 5: Monitor Logs

**Vercel Dashboard**:
1. Go to your project
2. Click "Logs" tab
3. Filter by `/api/webhooks/octopush/delivery`
4. Look for `[Webhook]` entries

**Expected Log Sequence**:
```
[Webhook] Octopush delivery webhook received
[Webhook] Parsed body: {...}
[Webhook] messageId: xxx status: DELIVERED
[Webhook] Found sms_send: xxx booking: xxx attempts: 1
[Webhook] Processing DELIVERED status
[Webhook] Successfully updated sms_send to delivered
[Webhook] Successfully updated booking to sms_delivered
[Webhook] Webhook processing complete
```

### Step 6: Verify Database

Query your database to verify updates:

```sql
-- Check SMS send status
SELECT id, octopush_ticket, status, delivery_status, created_at
FROM sms_sends
ORDER BY created_at DESC
LIMIT 5;

-- Check booking status
SELECT id, guest_name, status, updated_at
FROM bookings
WHERE status IN ('sms_sent', 'sms_delivered')
ORDER BY updated_at DESC
LIMIT 5;
```

**Expected States**:
- `sms_sends.status`: `delivered`
- `sms_sends.delivery_status`: `DELIVERED`
- `bookings.status`: `sms_delivered`

### Step 7: Test Reply Flow

1. Reply to the SMS with "OUI" from your phone
2. Check booking status updates to `confirmed`
3. Monitor `/api/sms/reply` logs

## Status Flow

```
┌─────────────────────────────────────────────────────┐
│ SMS Send Lifecycle                                   │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. pending → Send SMS API call                      │
│  2. sms_sent → SMS accepted by Octopush             │
│  3. sms_delivered → Delivery confirmed (webhook)     │
│  4. confirmed → Guest replied "OUI" (webhook)        │
│                                                      │
│  Alternative paths:                                  │
│  - send_failed → Permanent delivery failure          │
│  - cancelled → Guest replied "NON"                   │
│  - to_verify → Guest reply needs manual review       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Expected Timings

- **SMS Send → sms_sent**: Immediate (< 1 second)
- **sms_sent → sms_delivered**: 5-30 seconds (carrier dependent)
- **sms_delivered → confirmed**: Variable (guest response time)

**Note**: Octopush "simu" mode may have instant delivery receipts for testing.

## Webhook Status Codes

| Octopush Status | Our Action |
|----------------|-----------|
| `DELIVERED` | Update to `delivered`, booking to `sms_delivered` |
| `NOT_DELIVERED` (attempts < 3) | Mark for retry |
| `NOT_DELIVERED` (attempts ≥ 3) | Permanent failure |
| `BAD_DESTINATION` | Permanent failure |
| `BLACKLISTED_NUMBER` | Permanent failure |
| `UNKNOWN_DELIVERY` | Log only, no status change |

## Troubleshooting

### Webhook Not Receiving Calls

1. **Check Octopush Dashboard**: Verify webhook URL is configured correctly
2. **Check URL**: Ensure it's HTTPS (required by Octopush)
3. **Check Logs**: Look for any webhook calls in Vercel logs
4. **Test Endpoint**: Visit `/api/webhooks/octopush/status` to verify it's accessible

### Webhook Receiving Calls But Not Updating

1. **Check Logs**: Look for error messages in `[Webhook]` logs
2. **Verify octopush_ticket**: Ensure the ticket in webhook matches DB
3. **Check RLS**: Service client should bypass RLS (it does)
4. **Check Database**: Query `sms_sends` table to verify record exists

### No Logs Appearing

1. **Check Middleware**: Webhook route should be exempted (it is - line 40)
2. **Check Vercel Logs**: Ensure you're looking at the right project/deployment
3. **Test Locally**: Use mock script to verify logging works

### Database Not Updating

1. **Check Migration**: Ensure migration 012 is applied
2. **Check Service Client**: Should use service role key (it does)
3. **Check Booking Status**: Webhook only updates bookings in `pending` or `sms_sent` status

## Success Criteria

✅ **Webhook Configuration**
- Webhook URL configured in Octopush Dashboard
- Status endpoint returns correct URLs

✅ **Database Updates**
- Index created on `octopush_ticket`
- SMS status updates to `delivered`
- Booking status updates to `sms_delivered`

✅ **Logging**
- Webhook logs appear in Vercel dashboard
- All status codes logged correctly
- Errors logged with context

✅ **End-to-End Flow**
- Send SMS → status `sms_sent`
- Receive webhook → status `sms_delivered`
- Reply "OUI" → status `confirmed`

## Next Steps After Testing

Once webhook is confirmed working:

1. **Reduce Logging Verbosity**: Keep error logs, remove verbose debug logs
2. **Monitor Production**: Watch for any failed deliveries
3. **Implement Retry Logic**: Add automatic retry for `NOT_DELIVERED` status
4. **Add Alerting**: Set up alerts for high failure rates
5. **Document**: Update team wiki with webhook configuration

## Support

- Octopush API Docs: https://dev.octopush.com/en/sms-gateway-api-documentation/
- Octopush Dashboard: https://www.octopush.com/
- Vercel Logs: https://vercel.com/dashboard
