const API_BASE = "https://api.octopush.com/v1/public";

interface SendSMSResult {
  success: boolean;
  ticket?: string;
  error?: string;
}

export async function sendSMS(
  phone: string,
  text: string,
): Promise<SendSMSResult> {
  const apiLogin = process.env.OCTOPUSH_API_LOGIN;
  const apiKey = process.env.OCTOPUSH_API_KEY;
  const smsMode = process.env.OCTOPUSH_SMS_MODE;
  const sender = process.env.OCTOPUSH_SENDER || "OuiClient";

  if (!apiLogin || !apiKey) {
    return { success: false, error: "Octopush credentials not configured" };
  }

  try {
    const body: Record<string, unknown> = {
      recipients: [{ phone_number: phone }],
      text,
      sender,
      type: "sms_low_cost",
      purpose: "transactional",
      with_replies: true,
    };

    if (smsMode === "simu") {
      body.mode = "simu";
    }

    const response = await fetch(`${API_BASE}/sms-campaign/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-login": apiLogin,
        "api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        success: false,
        error: `Octopush API error: ${response.status} - ${errorBody}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      ticket: data.sms_ticket || data.ticket_number || data.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
