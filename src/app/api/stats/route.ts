import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { CampaignStats } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("product_id");
    const timeRange = searchParams.get("time_range") || "last_30_days";

    // 1. Determine date filter condition
    let dateFilterClicks = "";
    let dateFilterConversions = "";

    const now = new Date();
    if (timeRange === "today") {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      dateFilterClicks = `created_at >= '${todayStart}'`;
      dateFilterConversions = `created_at >= '${todayStart}'`;
    } else if (timeRange === "yesterday") {
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      dateFilterClicks = `created_at >= '${yesterdayStart}' AND created_at < '${todayStart}'`;
      dateFilterConversions = `created_at >= '${yesterdayStart}' AND created_at < '${todayStart}'`;
    } else if (timeRange === "last_7_days") {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      dateFilterClicks = `created_at >= '${past7}'`;
      dateFilterConversions = `created_at >= '${past7}'`;
    } else if (timeRange === "last_30_days") {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      dateFilterClicks = `created_at >= '${past30}'`;
      dateFilterConversions = `created_at >= '${past30}'`;
    }

    // Build WHERE clauses
    const clickWhereParts: string[] = [];
    const convWhereParts: string[] = [];
    const paramsClicks: any[] = [];
    const paramsConv: any[] = [];

    if (productId && productId !== "all") {
      clickWhereParts.push(`product_id = $${paramsClicks.length + 1}`);
      paramsClicks.push(productId);

      convWhereParts.push(`product_id = $${paramsConv.length + 1}`);
      paramsConv.push(productId);
    }

    if (dateFilterClicks) {
      clickWhereParts.push(dateFilterClicks);
    }
    if (dateFilterConversions) {
      convWhereParts.push(dateFilterConversions);
    }

    const clickWhere = clickWhereParts.length > 0 ? `WHERE ${clickWhereParts.join(" AND ")}` : "";
    const convWhere = convWhereParts.length > 0 ? `WHERE ${convWhereParts.join(" AND ")}` : "";

    // 2. Fetch Totals
    const totalClicksRows = await query(`SELECT COUNT(*) as count FROM clicks ${clickWhere}`, paramsClicks);
    const totalClicks = Number(totalClicksRows[0]?.count || 0);

    const convRows = await query(
      `SELECT
        COUNT(*) as total_events,
        SUM(CASE WHEN event_name = 'InitiateCheckout' THEN 1 ELSE 0 END) as checkouts,
        SUM(CASE WHEN event_name = 'Purchase' AND (order_status IN ('paid', 'approved', 'order_approved', 'complete') OR order_status LIKE '%approv%') THEN 1 ELSE 0 END) as sales,
        SUM(CASE WHEN event_name = 'Purchase' AND (order_status IN ('paid', 'approved', 'order_approved', 'complete') OR order_status LIKE '%approv%') THEN order_amount ELSE 0 END) as revenue,
        SUM(CASE WHEN capi_status = 'sent' THEN 1 ELSE 0 END) as capi_sent,
        SUM(CASE WHEN capi_status = 'failed' THEN 1 ELSE 0 END) as capi_failed
      FROM conversions ${convWhere}`,
      paramsConv
    );

    const convData = convRows[0] || {};
    const totalCheckouts = Number(convData.checkouts || 0);
    const totalSales = Number(convData.sales || 0);
    const totalRevenue = Number(convData.revenue || 0);
    const capiSent = Number(convData.capi_sent || 0);
    const capiFailed = Number(convData.capi_failed || 0);
    const conversionRate = totalClicks > 0 ? Number(((totalSales / totalClicks) * 100).toFixed(2)) : 0;
    const capiDeliveryRate = (capiSent + capiFailed) > 0 ? Number(((capiSent / (capiSent + capiFailed)) * 100).toFixed(1)) : 100;

    // 3. Campaign Breakdown (Join clicks and conversions)
    // Query clicks grouped by utm_campaign, utm_content, utm_source
    const clicksGrouped = await query(
      `SELECT
        COALESCE(utm_campaign, '(sem campanha)') as campaign,
        COALESCE(utm_content, '(sem anúncio)') as content,
        COALESCE(utm_source, '(direto/orgânico)') as source,
        COUNT(*) as clicks
      FROM clicks
      ${clickWhere}
      GROUP BY utm_campaign, utm_content, utm_source
      ORDER BY clicks DESC
      LIMIT 100`,
      paramsClicks
    );

    // Group conversions by matched click's campaign
    const convGrouped = await query(
      `SELECT
        COALESCE(cl.utm_campaign, '(sem campanha)') as campaign,
        COALESCE(cl.utm_content, '(sem anúncio)') as content,
        COALESCE(cl.utm_source, '(direto/orgânico)') as source,
        SUM(CASE WHEN co.event_name = 'InitiateCheckout' THEN 1 ELSE 0 END) as checkouts,
        SUM(CASE WHEN co.event_name = 'Purchase' AND (co.order_status IN ('paid', 'approved', 'order_approved', 'complete') OR co.order_status LIKE '%approv%') THEN 1 ELSE 0 END) as sales,
        SUM(CASE WHEN co.event_name = 'Purchase' AND (co.order_status IN ('paid', 'approved', 'order_approved', 'complete') OR co.order_status LIKE '%approv%') THEN co.order_amount ELSE 0 END) as revenue
      FROM conversions co
      LEFT JOIN clicks cl ON co.click_id = cl.id
      ${convWhere ? convWhere.replace(/created_at/g, "co.created_at").replace(/product_id/g, "co.product_id") : ""}
      GROUP BY cl.utm_campaign, cl.utm_content, cl.utm_source`,
      paramsConv
    );

    // Merge into CampaignStats map
    const statsMap: Record<string, CampaignStats> = {};

    clicksGrouped.forEach((r: any) => {
      const key = `${r.campaign}:::${r.content}:::${r.source}`;
      statsMap[key] = {
        campaign: r.campaign,
        content: r.content,
        source: r.source,
        clicks: Number(r.clicks),
        checkouts: 0,
        purchases: 0,
        revenue: 0,
        cvr: 0,
      };
    });

    convGrouped.forEach((r: any) => {
      const key = `${r.campaign}:::${r.content}:::${r.source}`;
      if (!statsMap[key]) {
        statsMap[key] = {
          campaign: r.campaign,
          content: r.content,
          source: r.source,
          clicks: 0,
          checkouts: 0,
          purchases: 0,
          revenue: 0,
          cvr: 0,
        };
      }
      statsMap[key].checkouts = Number(r.checkouts || 0);
      statsMap[key].purchases = Number(r.sales || 0);
      statsMap[key].revenue = Number(r.revenue || 0);
    });

    const campaignsList: CampaignStats[] = Object.values(statsMap).map((item) => ({
      ...item,
      cvr: item.clicks > 0 ? Number(((item.purchases / item.clicks) * 100).toFixed(2)) : 0,
    }));

    // Sort by revenue descending, then purchases, then clicks
    campaignsList.sort((a, b) => b.revenue - a.revenue || b.purchases - a.purchases || b.clicks - a.clicks);

    // 4. Fetch Last 20 Conversions for audit log
    const recentConversions = await query(
      `SELECT
        co.id,
        co.event_name,
        co.platform,
        co.platform_order_id,
        co.order_amount,
        co.currency,
        co.order_status,
        co.customer_name,
        co.capi_status,
        co.capi_response_code,
        co.capi_error_message,
        co.created_at,
        co.click_id,
        cl.utm_campaign,
        cl.utm_content,
        cl.utm_source,
        p.name as product_name
      FROM conversions co
      LEFT JOIN clicks cl ON co.click_id = cl.id
      LEFT JOIN products p ON co.product_id = p.id
      ${convWhere ? convWhere.replace(/created_at/g, "co.created_at").replace(/product_id/g, "co.product_id") : ""}
      ORDER BY co.created_at DESC
      LIMIT 20`,
      paramsConv
    );

    return NextResponse.json({
      success: true,
      summary: {
        total_clicks: totalClicks,
        total_checkouts: totalCheckouts,
        total_sales: totalSales,
        total_revenue: totalRevenue,
        conversion_rate: conversionRate,
        capi_sent: capiSent,
        capi_failed: capiFailed,
        capi_delivery_rate: capiDeliveryRate,
      },
      campaigns: campaignsList,
      recent_conversions: recentConversions,
    });
  } catch (error: any) {
    console.error("[Stats API Error]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
