import { hashEmail, hashPhone, hashName } from "./hash";

export interface SendCapiEventParams {
  pixelId: string;
  accessToken: string;
  testEventCode?: string | null;
  eventName: "InitiateCheckout" | "Purchase" | "Lead" | "AddToCart";
  eventId: string; // Unique deduplication ID
  eventTime?: number; // Unix timestamp in seconds
  eventSourceUrl?: string | null;
  
  // Buyer data
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerName?: string | null;
  
  // Attribution / Click data
  clientIp?: string | null;
  clientUserAgent?: string | null;
  fbc?: string | null;
  fbp?: string | null;
  
  // Value data
  value?: number;
  currency?: string;
  orderId?: string;
  productName?: string;
}

export interface CapiResult {
  success: boolean;
  statusCode: number;
  fbtraceId?: string;
  eventsReceived?: number;
  errorMessage?: string;
  rawResponse?: any;
}

/**
 * Sends a server-side conversion event to Meta Graph API v19.0
 */
export async function sendMetaCapiEvent(params: SendCapiEventParams): Promise<CapiResult> {
  const {
    pixelId,
    accessToken,
    testEventCode,
    eventName,
    eventId,
    eventTime = Math.floor(Date.now() / 1000),
    eventSourceUrl,
    customerEmail,
    customerPhone,
    customerName,
    clientIp,
    clientUserAgent,
    fbc,
    fbp,
    value,
    currency = "BRL",
    orderId,
    productName,
  } = params;

  if (!pixelId || !accessToken) {
    return {
      success: false,
      statusCode: 400,
      errorMessage: "Missing Meta Pixel ID or Access Token",
    };
  }

  // Construct user_data with valid fields only
  const userData: Record<string, any> = {};

  const emHash = hashEmail(customerEmail);
  if (emHash) userData.em = [emHash];

  const phHash = hashPhone(customerPhone);
  if (phHash) userData.ph = [phHash];

  if (customerName) {
    const parts = customerName.trim().split(/\s+/);
    const fn = parts[0];
    const ln = parts.slice(1).join(" ");
    const fnHash = hashName(fn);
    const lnHash = ln ? hashName(ln) : null;
    if (fnHash) userData.fn = [fnHash];
    if (lnHash) userData.ln = [lnHash];
  }

  if (clientIp) userData.client_ip_address = clientIp;
  if (clientUserAgent) userData.client_user_agent = clientUserAgent;
  if (fbc) userData.fbc = fbc;
  if (fbp) userData.fbp = fbp;

  // Construct custom_data
  const customData: Record<string, any> = {
    currency: currency.toUpperCase(),
  };
  if (typeof value === "number") customData.value = value;
  if (orderId) customData.order_id = orderId;
  if (productName) customData.content_name = productName;

  const eventPayload: Record<string, any> = {
    event_name: eventName,
    event_time: eventTime,
    event_id: eventId,
    action_source: "website",
    user_data: userData,
    custom_data: customData,
  };

  if (eventSourceUrl) {
    eventPayload.event_source_url = eventSourceUrl;
  }

  const requestBody: Record<string, any> = {
    data: [eventPayload],
  };

  if (testEventCode && testEventCode.trim() !== "") {
    requestBody.test_event_code = testEventCode.trim();
  }

  const endpoint = `https://graph.facebook.com/v19.0/${pixelId.trim()}/events?access_token=${accessToken.trim()}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const resultJson = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = resultJson?.error?.message || `Meta API Error (${response.status})`;
      console.error("[Meta CAPI Error]", resultJson);
      return {
        success: false,
        statusCode: response.status,
        fbtraceId: resultJson?.error?.fbtrace_id,
        errorMessage: errorMsg,
        rawResponse: resultJson,
      };
    }

    return {
      success: true,
      statusCode: response.status,
      fbtraceId: resultJson?.fbtrace_id,
      eventsReceived: resultJson?.events_received,
      rawResponse: resultJson,
    };
  } catch (error: any) {
    console.error("[Meta CAPI Network Error]", error);
    return {
      success: false,
      statusCode: 500,
      errorMessage: error.message || "Network error connecting to Meta Graph API",
    };
  }
}
