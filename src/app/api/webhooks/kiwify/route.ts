import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { Click, Product } from "@/types";
import { hashEmail, hashPhone } from "@/lib/hash";
import { sendMetaCapiEvent } from "@/lib/capi";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const productSlug = searchParams.get("product") || searchParams.get("product_slug");
    const productIdParam = searchParams.get("product_id");

    // 1. Resolve product
    let product: Product | null = null;
    if (productSlug) {
      const rows = await query<Product>("SELECT * FROM products WHERE slug = $1 LIMIT 1", [productSlug]);
      if (rows.length > 0) product = rows[0];
    } else if (productIdParam) {
      const rows = await query<Product>("SELECT * FROM products WHERE id = $1 LIMIT 1", [productIdParam]);
      if (rows.length > 0) product = rows[0];
    }

    // If no query param, try to find any product matching webhook or fallback to first product
    if (!product) {
      const allProducts = await query<Product>("SELECT * FROM products ORDER BY created_at ASC LIMIT 1");
      if (allProducts.length > 0) {
        product = allProducts[0];
      }
    }

    // 2. Extract Kiwify order and status
    const orderId = body.order_id || body.id || `kiwify_${Date.now()}`;
    const orderStatus = (body.order_status || body.status || "unknown").toLowerCase();

    // Map order status to Meta event
    let eventName: "Purchase" | "InitiateCheckout" | "Refund" = "Purchase";
    if (orderStatus.includes("abandoned") || orderStatus.includes("abandon")) {
      eventName = "InitiateCheckout";
    } else if (orderStatus.includes("refund") || orderStatus.includes("chargeback")) {
      eventName = "Refund";
    } else if (orderStatus === "paid" || orderStatus === "approved" || orderStatus === "order_approved") {
      eventName = "Purchase";
    }

    // Extract Tracking Parameters (sck / src)
    const trackingParams =
      body.TrackingParameters ||
      body.tracking_parameters ||
      body.trackingParameters ||
      {};
    const clickId =
      trackingParams.sck ||
      trackingParams.src ||
      body.sck ||
      body.src ||
      searchParams.get("sck") ||
      null;

    // 3. Look up original click record if clickId exists
    let matchedClick: Click | null = null;
    if (clickId) {
      const clickRows = await query<Click>("SELECT * FROM clicks WHERE id = $1 LIMIT 1", [clickId]);
      if (clickRows.length > 0) {
        matchedClick = clickRows[0];
        // If product was not bound yet, associate it with this click's product
        if (!product && matchedClick.product_id) {
          const pRows = await query<Product>("SELECT * FROM products WHERE id = $1 LIMIT 1", [matchedClick.product_id]);
          if (pRows.length > 0) product = pRows[0];
        }
      }
    }

    // 4. Extract Amount
    let orderAmount = 0;
    const commissions = body.Commissions || body.commissions || {};
    if (commissions.charge_amount) {
      orderAmount = commissions.charge_amount > 1000 ? commissions.charge_amount / 100 : commissions.charge_amount;
    } else if (body.order_amount) {
      orderAmount = body.order_amount > 1000 ? body.order_amount / 100 : body.order_amount;
    }

    // 5. Extract Customer data
    const customer = body.Customer || body.customer || {};
    const customerEmail = customer.email || body.email || null;
    const customerPhone = customer.mobile || customer.phone || body.phone || null;
    const customerName = customer.full_name || customer.name || body.name || null;

    const emailHash = hashEmail(customerEmail);
    const phoneHash = hashPhone(customerPhone);

    // Deduplication key: identical between browser pixel & server
    const eventId = `kiwify_${orderId}_${eventName.toLowerCase()}`;

    // 6. Send to Meta CAPI if Product is configured with Meta Pixel & Token
    let capiStatus: "pending" | "sent" | "failed" | "skipped" = "skipped";
    let capiResponseCode: number | null = null;
    let capiErrorMessage: string | null = null;

    if (product && product.meta_pixel_id && product.meta_access_token && eventName !== "Refund") {
      const capiResult = await sendMetaCapiEvent({
        pixelId: product.meta_pixel_id,
        accessToken: product.meta_access_token,
        testEventCode: product.meta_test_event_code,
        eventName: eventName,
        eventId: eventId,
        eventSourceUrl: matchedClick?.page_url || product.destination_url || null,
        customerEmail: customerEmail,
        customerPhone: customerPhone,
        customerName: customerName,
        clientIp: matchedClick?.client_ip || null,
        clientUserAgent: matchedClick?.client_user_agent || null,
        fbc: matchedClick?.fbc || null,
        fbp: matchedClick?.fbp || null,
        value: orderAmount,
        currency: "BRL",
        orderId: orderId,
        productName: product.name,
      });

      capiResponseCode = capiResult.statusCode;
      if (capiResult.success) {
        capiStatus = "sent";
      } else {
        capiStatus = "failed";
        capiErrorMessage = capiResult.errorMessage || null;
      }
    }

    // 7. Record Conversion in Database
    const conversionId = `conv_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`;
    await execute(
      `INSERT INTO conversions (
        id, click_id, product_id, event_name, event_id, platform, platform_order_id,
        order_amount, currency, order_status, customer_email_hash, customer_phone_hash,
        customer_name, capi_status, capi_response_code, capi_error_message, raw_payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        conversionId,
        matchedClick?.id || clickId || null,
        product?.id || matchedClick?.product_id || null,
        eventName,
        eventId,
        "kiwify",
        orderId,
        orderAmount,
        "BRL",
        orderStatus,
        emailHash,
        phoneHash,
        customerName,
        capiStatus,
        capiResponseCode,
        capiErrorMessage,
        rawBody,
      ]
    );

    return NextResponse.json({
      success: true,
      conversion_id: conversionId,
      matched_click: Boolean(matchedClick),
      capi_status: capiStatus,
    });
  } catch (error: any) {
    console.error("[Kiwify Webhook Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process webhook" },
      { status: 500 }
    );
  }
}
