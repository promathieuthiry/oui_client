/**
 * Local webhook testing script
 *
 * Usage:
 * 1. Find a real octopush_ticket from your database:
 *    SELECT octopush_ticket FROM sms_sends ORDER BY created_at DESC LIMIT 1;
 * 2. Update the message_id below with that ticket
 * 3. Run: npx tsx scripts/test-webhook.ts
 *
 * This simulates Octopush sending a delivery receipt webhook to your local server.
 */

async function testWebhook() {
  const webhookUrl = 'http://localhost:3000/api/webhooks/octopush/delivery'

  // Test data - replace with real octopush_ticket from your database
  const testPayload = {
    message_id: 'test-ticket-123', // ⚠️ Replace with real octopush_ticket
    status: 'DELIVERED',
    number: '+33612345678',
    delivery_date: new Date().toISOString()
  }

  console.log('🔄 Sending test webhook to:', webhookUrl)
  console.log('📦 Payload:', JSON.stringify(testPayload, null, 2))

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    })

    console.log('✅ Response status:', response.status)
    console.log('📊 Response ok:', response.ok)

    if (response.status !== 200) {
      console.error('❌ Unexpected status code')
    } else {
      console.log('✅ Webhook processed successfully')
      console.log('\n💡 Check your terminal logs for [Webhook] entries')
      console.log('💡 Check your database to verify status updates')
    }
  } catch (error) {
    console.error('❌ Failed to send webhook:', error)
    console.log('\n💡 Make sure your Next.js dev server is running: npm run dev')
  }
}

// Test different status codes
async function testAllStatuses() {
  const statuses = ['DELIVERED', 'NOT_DELIVERED', 'BAD_DESTINATION', 'BLACKLISTED_NUMBER', 'UNKNOWN_DELIVERY']

  console.log('🧪 Testing all status codes...\n')

  for (const status of statuses) {
    console.log(`\n--- Testing status: ${status} ---`)
    const payload = {
      message_id: 'test-ticket-123', // ⚠️ Replace with real octopush_ticket
      status,
      number: '+33612345678',
      delivery_date: new Date().toISOString()
    }

    try {
      const response = await fetch('http://localhost:3000/api/webhooks/octopush/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      console.log(`✅ ${status}: ${response.status}`)
    } catch (error) {
      console.error(`❌ ${status}: Failed`)
    }

    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

// Run the test
const args = process.argv.slice(2)
if (args.includes('--all')) {
  testAllStatuses()
} else {
  testWebhook()
}
