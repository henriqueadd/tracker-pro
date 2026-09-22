const BASE_URL = "http://localhost:3005";

async function runTest() {
  console.log("=== INICIANDO TESTE COMPLETO DE INTEGRAÇÃO ===");

  // 1. Test Tracker.js download
  console.log("\n1. Testando download do script /tracker.js...");
  const scriptRes = await fetch(`${BASE_URL}/tracker.js`);
  if (!scriptRes.ok) throw new Error(`Falha ao obter /tracker.js: ${scriptRes.status}`);
  const scriptText = await scriptRes.text();
  console.log(`✓ tracker.js obtido com sucesso (${scriptText.length} bytes)`);

  // 2. Create a Product
  console.log("\n2. Cadastrando produto de teste via /api/products...");
  const productPayload = {
    name: "Curso de Teste Pro",
    slug: `teste-${Date.now()}`,
    meta_pixel_id: "999888777666",
    meta_access_token: "EAABtesttoken12345fake",
    meta_test_event_code: "TEST12345",
    destination_url: "https://minhaloja.com.br/oferta",
  };
  const prodRes = await fetch(`${BASE_URL}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productPayload),
  });
  const prodData = await prodRes.json();
  if (!prodData.success) throw new Error(`Erro ao cadastrar produto: ${prodData.error}`);
  const product = prodData.product;
  console.log(`✓ Produto cadastrado com sucesso: ID=${product.id}, Slug=${product.slug}`);

  // 3. Register a Click (Simulating ad click on Landing Page)
  console.log("\n3. Registrando clique vindo de anúncio via /api/track/click...");
  const clickPayload = {
    product_slug: product.slug,
    utm_source: "facebook",
    utm_medium: "cpc",
    utm_campaign: "Campanha_Black_Friday",
    utm_content: "Video_Depoimento_01",
    utm_term: "Publico_Interesse_Marketing",
    fbclid: "IwAR123456789fakeclickid",
    fbc: "fb.1.1727000000.IwAR123456789fakeclickid",
    fbp: "fb.1.1727000000.987654321",
    page_url: "https://minhaloja.com.br/oferta?utm_source=facebook&utm_campaign=Campanha_Black_Friday",
    referrer: "https://facebook.com",
  };
  const clickRes = await fetch(`${BASE_URL}/api/track/click`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 TestBrowser" },
    body: JSON.stringify(clickPayload),
  });
  const clickData = await clickRes.json();
  if (!clickData.success) throw new Error(`Erro ao registrar clique: ${clickData.error}`);
  const clickId = clickData.click_id;
  console.log(`✓ Clique registrado com sucesso! ID Único=${clickId}`);

  // 4. Simulate Kiwify Purchase Webhook with the matching SCK (clickId)
  console.log(`\n4. Disparando webhook da Kiwify com sck=${clickId}...`);
  const kiwifyWebhookPayload = {
    order_id: `kiwify_ord_${Date.now()}`,
    order_status: "paid",
    created_at: new Date().toISOString(),
    Customer: {
      full_name: "Carlos Ferreira",
      email: "carlos.ferreira@gmail.com",
      mobile: "11987654321",
    },
    Product: {
      product_id: product.id,
      product_name: product.name,
    },
    Commissions: {
      charge_amount: 19700, // R$ 197.00
    },
    TrackingParameters: {
      sck: clickId,
      src: clickId,
      utm_source: "facebook",
      utm_campaign: "Campanha_Black_Friday",
      utm_content: "Video_Depoimento_01",
    },
  };
  const webhookRes = await fetch(`${BASE_URL}/api/webhooks/kiwify?product=${product.slug}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(kiwifyWebhookPayload),
  });
  const webhookData = await webhookRes.json();
  if (!webhookData.success) throw new Error(`Erro ao processar webhook: ${webhookData.error}`);
  console.log("✓ Webhook Kiwify processado com sucesso!");
  console.log(`  - ID Conversão: ${webhookData.conversion_id}`);
  console.log(`  - Clique Original Casado com Sucesso: ${webhookData.matched_click}`);
  console.log(`  - Status CAPI: ${webhookData.capi_status}`);

  // 5. Query Dashboard Stats and verify Attribution
  console.log("\n5. Consultando métricas de atribuição via /api/stats...");
  const statsRes = await fetch(`${BASE_URL}/api/stats?product_id=${product.id}&time_range=all`);
  const statsData = await statsRes.json();
  if (!statsData.success) throw new Error(`Erro ao obter stats: ${statsData.error}`);

  console.log("\n=== RESULTADO DAS MÉTRICAS ===");
  console.log(`Total Cliques: ${statsData.summary.total_clicks}`);
  console.log(`Total Vendas: ${statsData.summary.total_sales}`);
  console.log(`Faturamento Total: R$ ${statsData.summary.total_revenue}`);
  console.log(`Taxa de Conversão: ${statsData.summary.conversion_rate}%`);
  console.log("\nCampanhas Atribuídas:");
  console.table(statsData.campaigns);

  if (statsData.summary.total_sales >= 1 && statsData.summary.total_revenue >= 197) {
    console.log("\n🎉 TESTE PASSOU COM 100% DE SUCESSO! ATRIBUIÇÃO PFEITAMENTE CASADA!");
  } else {
    throw new Error("Métricas não bateram com a conversão simulada.");
  }
}

runTest().catch((err) => {
  console.error("❌ Teste falhou:", err);
  process.exit(1);
});
