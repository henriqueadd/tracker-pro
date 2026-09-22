import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { Product } from "@/types";
import crypto from "crypto";

export async function GET() {
  try {
    const products = await query<Product>("SELECT * FROM products ORDER BY created_at DESC");
    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      slug,
      meta_pixel_id,
      meta_access_token,
      meta_test_event_code,
      destination_url,
    } = body;

    if (!name || !slug) {
      return NextResponse.json({ success: false, error: "Nome e Slug são obrigatórios" }, { status: 400 });
    }

    // Clean slug
    const cleanSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]/g, "-");

    // Check slug uniqueness
    const existing = await query<Product>("SELECT id FROM products WHERE slug = $1 LIMIT 1", [cleanSlug]);
    if (existing.length > 0) {
      return NextResponse.json({ success: false, error: "Já existe um produto com este slug" }, { status: 400 });
    }

    const id = `prod_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`;
    const webhookSecret = crypto.randomBytes(16).toString("hex");

    await execute(
      `INSERT INTO products (
        id, name, slug, meta_pixel_id, meta_access_token, meta_test_event_code, webhook_secret, destination_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        name.trim(),
        cleanSlug,
        (meta_pixel_id || "").trim(),
        (meta_access_token || "").trim(),
        meta_test_event_code ? meta_test_event_code.trim() : null,
        webhookSecret,
        destination_url ? destination_url.trim() : null,
      ]
    );

    const created = await query<Product>("SELECT * FROM products WHERE id = $1 LIMIT 1", [id]);
    return NextResponse.json({ success: true, product: created[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      slug,
      meta_pixel_id,
      meta_access_token,
      meta_test_event_code,
      destination_url,
    } = body;

    if (!id || !name || !slug) {
      return NextResponse.json({ success: false, error: "ID, Nome e Slug são obrigatórios" }, { status: 400 });
    }

    const cleanSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]/g, "-");

    await execute(
      `UPDATE products SET
        name = $1,
        slug = $2,
        meta_pixel_id = $3,
        meta_access_token = $4,
        meta_test_event_code = $5,
        destination_url = $6
      WHERE id = $7`,
      [
        name.trim(),
        cleanSlug,
        (meta_pixel_id || "").trim(),
        (meta_access_token || "").trim(),
        meta_test_event_code ? meta_test_event_code.trim() : null,
        destination_url ? destination_url.trim() : null,
        id,
      ]
    );

    const updated = await query<Product>("SELECT * FROM products WHERE id = $1 LIMIT 1", [id]);
    return NextResponse.json({ success: true, product: updated[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "ID do produto é obrigatório" }, { status: 400 });
    }

    await execute("DELETE FROM products WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
