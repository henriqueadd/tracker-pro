import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { Product } from "@/types";
import crypto from "crypto";

// Common CORS headers for cross-domain tracking
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      product_slug,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      fbclid,
      fbc,
      fbp,
      page_url,
      referrer,
    } = body;

    // Generate clean, compact click ID (e.g. clk_1727000000_a1b2c3)
    const timestamp = Date.now().toString(36);
    const randomSuffix = crypto.randomBytes(4).toString("hex");
    const clickId = `clk_${timestamp}_${randomSuffix}`;

    // Resolve product_id if slug was provided
    let productId: string | null = null;
    if (product_slug) {
      const products = await query<Product>("SELECT id FROM products WHERE slug = $1 LIMIT 1", [
        product_slug,
      ]);
      if (products.length > 0) {
        productId = products[0].id;
      }
    }

    // Extract client IP (handle Cloudflare / Netlify / Vercel proxy headers)
    const clientIp =
      request.headers.get("x-nf-client-connection-ip") || // Netlify
      request.headers.get("cf-connecting-ip") || // Cloudflare
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;

    const clientUserAgent = request.headers.get("user-agent") || null;

    // Insert click record
    await execute(
      `INSERT INTO clicks (
        id, product_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        fbclid, fbc, fbp, client_ip, client_user_agent, page_url, referrer
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        clickId,
        productId,
        utm_source || null,
        utm_medium || null,
        utm_campaign || null,
        utm_content || null,
        utm_term || null,
        fbclid || null,
        fbc || null,
        fbp || null,
        clientIp,
        clientUserAgent,
        page_url || null,
        referrer || null,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        click_id: clickId,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[Track Click Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record click" },
      { status: 500, headers: corsHeaders }
    );
  }
}
