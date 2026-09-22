import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { Click, Product } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { product_id, platform = "kiwify", event_type = "purchase" } = body;

    // Pick product
    let product: Product | null = null;
    if (product_id) {
      const pRows = await query<Product>("SELECT * FROM products WHERE id = $1 LIMIT 1", [product_id]);
      if (pRows.length > 0) product = pRows[0];
    }
    if (!product) {
      const allP = await query<Product>("SELECT * FROM products ORDER BY created_at ASC LIMIT 1");
      if (allP.length > 0) product = allP[0];
    }

    if (!product) {
      return NextResponse.json({ success: false, error: "Nenhum produto cadastrado para testar." }, { status: 400 });
    }

    // Pick latest click for this product if available
    const clicks = await query<Click>(
      "SELECT * FROM clicks WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1",
      [product.id]
    );
    const testClick = clicks[0] || null;

    const testOrderId = `test_ord_${Date.now().toString(36)}`;
    const origin = new URL(request.url).origin;

    if (platform === "kiwify") {
      const kiwifyPayload = {
        order_id: testOrderId,
        order_status: event_type === "checkout" ? "waiting_payment" : "paid",
        Customer: {
          full_name: "Cliente Teste",
          email: "teste@exemplo.com.br",
          mobile: "11999998888",
        },
        Product: {
          product_id: product.id,
          product_name: product.name,
        },
        Commissions: {
          charge_amount: 19700,
        },
        TrackingParameters: {
          sck: testClick ? testClick.id : `clk_simulado_${Date.now().toString(36)}`,
          src: testClick ? testClick.id : `clk_simulado_${Date.now().toString(36)}`,
          utm_source: testClick?.utm_source || "facebook",
          utm_campaign: testClick?.utm_campaign || "Campanha Teste",
          utm_content: testClick?.utm_content || "Anuncio 01",
        },
      };

      const res = await fetch(`${origin}/api/webhooks/kiwify?product=${product.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kiwifyPayload),
      });
      const data = await res.json();
      return NextResponse.json({ success: true, result: data, simulated_payload: kiwifyPayload });
    } else {
      // Hotmart simulation
      const hotmartPayload = {
        event: event_type === "checkout" ? "PURCHASE_OUT_OF_SHOPPING_CART" : "PURCHASE_APPROVED",
        data: {
          purchase: {
            transaction: testOrderId,
            status: event_type === "checkout" ? "STARTED" : "APPROVED",
            price: { value: 197.0, currency_value: "BRL" },
            tracking: {
              source_sck: testClick ? testClick.id : `clk_simulado_${Date.now().toString(36)}`,
            },
          },
          buyer: {
            name: "Cliente Teste",
            email: "teste@exemplo.com.br",
            checkout_phone: "11999998888",
          },
          product: {
            id: 12345,
            name: product.name,
          },
        },
      };

      const res = await fetch(`${origin}/api/webhooks/hotmart?product=${product.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hotmartPayload),
      });
      const data = await res.json();
      return NextResponse.json({ success: true, result: data, simulated_payload: hotmartPayload });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
