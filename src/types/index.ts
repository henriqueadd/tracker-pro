export interface Product {
  id: string;
  name: string;
  slug: string;
  meta_pixel_id: string;
  meta_access_token: string;
  meta_test_event_code?: string | null;
  webhook_secret?: string | null;
  destination_url?: string | null;
  created_at?: string;
}

export interface Click {
  id: string;
  product_id?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  fbclid?: string | null;
  fbc?: string | null;
  fbp?: string | null;
  client_ip?: string | null;
  client_user_agent?: string | null;
  page_url?: string | null;
  referrer?: string | null;
  created_at?: string;
}

export interface Conversion {
  id: string;
  click_id?: string | null;
  product_id?: string | null;
  event_name: "InitiateCheckout" | "Purchase" | "Lead" | "Refund";
  event_id: string;
  platform: "kiwify" | "hotmart" | "cakto" | "custom";
  platform_order_id: string;
  order_amount: number;
  currency: string;
  order_status: string;
  customer_email_hash?: string | null;
  customer_phone_hash?: string | null;
  customer_name?: string | null;
  capi_status: "pending" | "sent" | "failed" | "skipped";
  capi_response_code?: number | null;
  capi_error_message?: string | null;
  raw_payload?: string | null;
  created_at?: string;
}

export interface CampaignStats {
  campaign: string;
  content: string;
  source: string;
  clicks: number;
  checkouts: number;
  purchases: number;
  revenue: number;
  cvr: number; // Conversion rate %
}
