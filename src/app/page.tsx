"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  MousePointerClick,
  Link as LinkIcon,
  Layers,
  Code2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Product, CampaignStats } from "@/types";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "generator" | "snippet" | "logs" | "test">("overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("last_30_days");
  const [loading, setLoading] = useState(false);

  // Stats
  const [summary, setSummary] = useState({
    total_clicks: 0,
    total_checkouts: 0,
    total_sales: 0,
    total_revenue: 0,
    conversion_rate: 0,
    capi_sent: 0,
    capi_failed: 0,
    capi_delivery_rate: 100,
  });
  const [campaigns, setCampaigns] = useState<CampaignStats[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  // Product Form State
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState({
    name: "",
    slug: "",
    meta_pixel_id: "",
    meta_access_token: "",
    meta_test_event_code: "",
    destination_url: "",
  });

  // Link Generator State
  const [linkForm, setLinkForm] = useState({
    destination_url: "https://seusite.com.br/oferta",
    utm_source: "facebook",
    utm_medium: "cpc",
    utm_campaign: "{{campaign.name}}",
    utm_content: "{{ad.name}}",
    utm_term: "{{adset.name}}",
  });
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Test simulation state
  const [testStatus, setTestStatus] = useState<string | null>(null);

  // Load products & stats
  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [selectedProductId, timeRange]);

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error("Failed to load products", err);
    }
  }

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch(`/api/stats?product_id=${selectedProductId}&time_range=${timeRange}`);
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
        setCampaigns(data.campaigns || []);
        setRecentLogs(data.recent_conversions || []);
      }
    } catch (err) {
      console.error("Failed to load stats", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowProductModal(false);
        setProductForm({
          name: "",
          slug: "",
          meta_pixel_id: "",
          meta_access_token: "",
          meta_test_event_code: "",
          destination_url: "",
        });
        fetchProducts();
      } else {
        alert(data.error || "Erro ao salvar produto");
      }
    } catch (err: any) {
      alert("Erro ao conectar com servidor");
    }
  }

  async function handleDeleteProduct(id: string) {
    if (!confirm("Tem certeza que deseja remover este produto?")) return;
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchProducts();
        if (selectedProductId === id) setSelectedProductId("all");
      }
    } catch (err) {
      alert("Erro ao excluir produto");
    }
  }

  async function handleRunSimulation(platform: "kiwify" | "hotmart", eventType: "checkout" | "purchase") {
    setTestStatus("Disparando webhook simulado...");
    try {
      const res = await fetch("/api/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selectedProductId !== "all" ? selectedProductId : undefined,
          platform,
          event_type: eventType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestStatus(`✅ Sucesso! Webhook processado. Status CAPI: ${data.result.capi_status}`);
        fetchStats();
      } else {
        setTestStatus(`❌ Erro: ${data.error}`);
      }
    } catch (err: any) {
      setTestStatus(`❌ Falha na simulação: ${err.message}`);
    }
  }

  // Generated Link calculation
  const generatedTrackingUrl = (() => {
    try {
      const base = linkForm.destination_url.trim() || "https://seusite.com.br";
      const u = new URL(base);
      if (linkForm.utm_source) u.searchParams.set("utm_source", linkForm.utm_source);
      if (linkForm.utm_medium) u.searchParams.set("utm_medium", linkForm.utm_medium);
      if (linkForm.utm_campaign) u.searchParams.set("utm_campaign", linkForm.utm_campaign);
      if (linkForm.utm_content) u.searchParams.set("utm_content", linkForm.utm_content);
      if (linkForm.utm_term) u.searchParams.set("utm_term", linkForm.utm_term);
      const selProduct = products.find((p) => p.id === selectedProductId);
      if (selProduct) {
        u.searchParams.set("product", selProduct.slug);
      }
      return u.toString();
    } catch {
      return linkForm.destination_url;
    }
  })();

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const currentHost = typeof window !== "undefined" ? window.location.origin : "https://seutracker.netlify.app";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col md:flex-row">
      {/* ========================================================== */}
      {/* ABA LATERAL ESQUERDA (SIDEBAR) */}
      {/* ========================================================== */}
      <aside className="w-full md:w-64 lg:w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 md:sticky md:top-0 md:h-screen z-20">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 font-black text-xl">
            U
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white tracking-tight">UtmTracker Pro</span>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Self-Hosted
            </span>
          </div>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="p-3 flex-1 overflow-y-auto space-y-1.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2">
            Etapas do Rastreador
          </div>

          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition text-left ${
              activeTab === "overview"
                ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <div>
              <div className="leading-tight">1. Visão Geral & ROI</div>
              <div className={`text-[11px] leading-tight mt-0.5 ${activeTab === "overview" ? "text-emerald-950/80" : "text-slate-400"}`}>
                Métricas e Atribuição
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("generator")}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition text-left ${
              activeTab === "generator"
                ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <LinkIcon className="w-4 h-4 shrink-0" />
            <div>
              <div className="leading-tight">2. Gerador de Links UTM</div>
              <div className={`text-[11px] leading-tight mt-0.5 ${activeTab === "generator" ? "text-emerald-950/80" : "text-slate-400"}`}>
                Links para Meta Ads
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("products")}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition text-left ${
              activeTab === "products"
                ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <div className="flex items-center gap-3">
              <Layers className="w-4 h-4 shrink-0" />
              <div>
                <div className="leading-tight">3. Produtos & Pixels</div>
                <div className={`text-[11px] leading-tight mt-0.5 ${activeTab === "products" ? "text-emerald-950/80" : "text-slate-400"}`}>
                  Tokens CAPI e Webhooks
                </div>
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
              activeTab === "products" ? "bg-slate-950 text-emerald-400" : "bg-slate-800 text-slate-300"
            }`}>
              {products.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("snippet")}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition text-left ${
              activeTab === "snippet"
                ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <Code2 className="w-4 h-4 shrink-0" />
            <div>
              <div className="leading-tight">4. Script de Rastreamento</div>
              <div className={`text-[11px] leading-tight mt-0.5 ${activeTab === "snippet" ? "text-emerald-950/80" : "text-slate-400"}`}>
                Tag para Landing Page
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition text-left ${
              activeTab === "logs"
                ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <div>
              <div className="leading-tight">5. Logs de Conversão</div>
              <div className={`text-[11px] leading-tight mt-0.5 ${activeTab === "logs" ? "text-emerald-950/80" : "text-slate-400"}`}>
                Auditoria e Status CAPI
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("test")}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition text-left ${
              activeTab === "test"
                ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <Zap className="w-4 h-4 shrink-0" />
            <div>
              <div className="leading-tight">6. Simulador de Testes</div>
              <div className={`text-[11px] leading-tight mt-0.5 ${activeTab === "test" ? "text-emerald-950/80" : "text-slate-400"}`}>
                Validar Kiwify / Hotmart
              </div>
            </div>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 text-xs text-slate-400 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-200 font-semibold text-xs">24/7 Online</span>
          </div>
          <p className="text-[11px] text-slate-400">Netlify + Supabase PostgreSQL</p>
        </div>
      </aside>

      {/* ========================================================== */}
      {/* ÁREA DE CONTEÚDO PRINCIPAL (DIREITA) */}
      {/* ========================================================== */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header Superior com Filtros */}
        <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10 px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-white">
              {activeTab === "overview" && "Visão Geral & Atribuição de ROI"}
              {activeTab === "generator" && "Gerador de Links UTM para Anúncios"}
              {activeTab === "products" && "Gerenciamento Multi-Produto"}
              {activeTab === "snippet" && "Script de Rastreamento (Landing Page)"}
              {activeTab === "logs" && "Histórico & Logs de Entrega CAPI"}
              {activeTab === "test" && "Simulador de Testes & Validação"}
            </h1>
            <p className="text-xs text-slate-400">
              {activeTab === "overview" && "Descubra com exatidão matemática quais campanhas e anúncios geram vendas"}
              {activeTab === "generator" && "Construa URLs com parâmetros dinâmicos oficiais do Facebook Ads"}
              {activeTab === "products" && "Configure cada produto com seu próprio Pixel da Meta e URLs de webhook"}
              {activeTab === "snippet" && "Substituto ultraleve do Utmify para colocar no <head> da sua página"}
              {activeTab === "logs" && "Auditoria de cada webhook recebido e resposta oficial da Meta Graph API"}
              {activeTab === "test" && "Simule eventos da Kiwify e Hotmart sem precisar gastar dinheiro real"}
            </p>
          </div>

          {/* Filtros: Produto & Período */}
          <div className="flex items-center gap-2.5">
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              aria-label="Filtrar por Produto"
              className="bg-slate-950 border border-slate-700 text-xs font-medium rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">📦 Todos os Produtos ({products.length})</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              aria-label="Filtrar por Período"
              className="bg-slate-950 border border-slate-700 text-xs font-medium rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="last_7_days">Últimos 7 dias</option>
              <option value="last_30_days">Últimos 30 dias</option>
              <option value="all">Todo o Período</option>
            </select>

            <button
              onClick={() => fetchStats()}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            </button>
          </div>
        </header>

        {/* Corpo do Conteúdo da Aba Selecionada */}
        <div className="p-4 sm:p-8 flex-1 space-y-6">

          {/* ETAPA 1: VISÃO GERAL & ROI */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Revenue */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Faturamento</span>
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-bold text-white">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(summary.total_revenue)}
                    </div>
                    <span className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Vendas Aprovadas
                    </span>
                  </div>
                </div>

                {/* Sales */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Vendas Feitas</span>
                    <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-bold text-white">{summary.total_sales}</div>
                    <span className="text-xs text-slate-400 mt-1 block">Pedidos pagos</span>
                  </div>
                </div>

                {/* Checkouts */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Checkouts</span>
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-bold text-white">{summary.total_checkouts}</div>
                    <span className="text-xs text-slate-400 mt-1 block">InitiateCheckout</span>
                  </div>
                </div>

                {/* Clicks */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Cliques Rastreados</span>
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                      <MousePointerClick className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-bold text-white">{summary.total_clicks}</div>
                    <span className="text-xs text-slate-400 mt-1 block">Com ID único e UTMs</span>
                  </div>
                </div>

                {/* CVR & CAPI Delivery */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Conversão & CAPI</span>
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-bold text-emerald-400">{summary.conversion_rate}% CVR</div>
                    <span className="text-xs text-slate-400 mt-1 block">
                      Entrega CAPI: <strong className="text-white">{summary.capi_delivery_rate}%</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Campaign Attribution Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-white">Atribuição de Vendas por Campanha & Anúncio</h2>
                    <p className="text-xs text-slate-400">Descubra com exatidão matemática quais criativos e públicos geram o seu ROI</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950/50 text-xs uppercase text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Campanha (`utm_campaign`)</th>
                        <th className="px-4 py-3">Anúncio (`utm_content`)</th>
                        <th className="px-4 py-3">Origem</th>
                        <th className="px-4 py-3 text-right">Cliques</th>
                        <th className="px-4 py-3 text-right">Checkouts</th>
                        <th className="px-4 py-3 text-right">Vendas</th>
                        <th className="px-4 py-3 text-right">Taxa Conv.</th>
                        <th className="px-4 py-3 text-right">Faturamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {campaigns.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                            Nenhum dado registrado para o filtro selecionado. Experimente simular um clique ou webhook!
                          </td>
                        </tr>
                      ) : (
                        campaigns.map((c, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40 transition">
                            <td className="px-4 py-3 font-medium text-white max-w-xs truncate" title={c.campaign}>
                              {c.campaign}
                            </td>
                            <td className="px-4 py-3 text-slate-300 max-w-xs truncate" title={c.content}>
                              {c.content}
                            </td>
                            <td className="px-4 py-3">
                              <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-xs">
                                {c.source}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">{c.clicks}</td>
                            <td className="px-4 py-3 text-right">{c.checkouts}</td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-400">{c.purchases}</td>
                            <td className="px-4 py-3 text-right font-medium">{c.cvr}%</td>
                            <td className="px-4 py-3 text-right font-bold text-white">
                              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c.revenue)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 2: GERADOR DE LINKS UTM */}
          {activeTab === "generator" && (
            <div className="max-w-4xl space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">URL da sua Página de Vendas</label>
                  <input
                    type="text"
                    value={linkForm.destination_url}
                    onChange={(e) => setLinkForm({ ...linkForm, destination_url: e.target.value })}
                    placeholder="https://seusite.com.br/oferta"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Origem (`utm_source`)</label>
                    <input
                      type="text"
                      value={linkForm.utm_source}
                      onChange={(e) => setLinkForm({ ...linkForm, utm_source: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Mídia (`utm_medium`)</label>
                    <input
                      type="text"
                      value={linkForm.utm_medium}
                      onChange={(e) => setLinkForm({ ...linkForm, utm_medium: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Campanha (`utm_campaign`)</label>
                    <input
                      type="text"
                      value={linkForm.utm_campaign}
                      onChange={(e) => setLinkForm({ ...linkForm, utm_campaign: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Conteúdo / Anúncio (`utm_content`)</label>
                    <input
                      type="text"
                      value={linkForm.utm_content}
                      onChange={(e) => setLinkForm({ ...linkForm, utm_content: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">Público / Conjunto (`utm_term`)</label>
                    <input
                      type="text"
                      value={linkForm.utm_term}
                      onChange={(e) => setLinkForm({ ...linkForm, utm_term: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Result Preview Box */}
                <div className="mt-6 pt-4 border-t border-slate-800">
                  <label className="block text-xs font-semibold text-emerald-400 mb-2">Link Gerado para usar no Anúncio:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedTrackingUrl}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 select-all"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedTrackingUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm transition shrink-0"
                    >
                      {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedLink ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 3: PRODUTOS & PIXELS */}
          {activeTab === "products" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">Produtos Cadastrados ({products.length})</h2>
                  <p className="text-xs text-slate-400">
                    Cada produto possui seu próprio Pixel da Meta, Token CAPI e Webhooks individuais.
                  </p>
                </div>
                <button
                  onClick={() => setShowProductModal(true)}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-2 rounded-lg text-xs transition shadow-lg shadow-emerald-500/20"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar Novo Produto
                </button>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((p) => (
                  <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-white text-base">{p.name}</h3>
                          <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                            slug: {p.slug}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="text-slate-500 hover:text-red-400 transition p-1"
                          title="Remover produto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-4 space-y-2 text-xs">
                        <div>
                          <span className="text-slate-400">Meta Pixel ID:</span>{" "}
                          <span className="font-mono text-emerald-400">{p.meta_pixel_id || "Não configurado"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">CAPI Token:</span>{" "}
                          <span className="font-mono text-slate-300">
                            {p.meta_access_token ? `${p.meta_access_token.slice(0, 10)}...` : "Não configurado"}
                          </span>
                        </div>
                        {p.meta_test_event_code && (
                          <div>
                            <span className="text-slate-400">Test Code:</span>{" "}
                            <span className="font-mono text-amber-400">{p.meta_test_event_code}</span>
                          </div>
                        )}
                      </div>

                      {/* Webhook URLs to copy into Kiwify / Hotmart */}
                      <div className="mt-5 pt-4 border-t border-slate-800 space-y-3">
                        <div className="text-xs font-medium text-slate-300">URLs para cadastrar nas plataformas:</div>

                        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                            <span>Webhook Kiwify:</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`${currentHost}/api/webhooks/kiwify?product=${p.slug}`);
                                alert("URL do Webhook Kiwify copiada!");
                              }}
                              className="text-emerald-400 hover:underline flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" /> Copiar
                            </button>
                          </div>
                          <div className="text-xs font-mono text-slate-300 truncate">
                            {currentHost}/api/webhooks/kiwify?product={p.slug}
                          </div>
                        </div>

                        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                            <span>Webhook Hotmart:</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`${currentHost}/api/webhooks/hotmart?product=${p.slug}`);
                                alert("URL do Webhook Hotmart copiada!");
                              }}
                              className="text-emerald-400 hover:underline flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" /> Copiar
                            </button>
                          </div>
                          <div className="text-xs font-mono text-slate-300 truncate">
                            {currentHost}/api/webhooks/hotmart?product={p.slug}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal: Create Product */}
              {showProductModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
                    <h3 className="text-lg font-bold text-white mb-4">Cadastrar Novo Produto</h3>
                    <form onSubmit={handleCreateProduct} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Nome do Produto</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Método Viver de Renda"
                          value={productForm.name}
                          onChange={(e) => {
                            const name = e.target.value;
                            const autoSlug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
                            setProductForm({ ...productForm, name, slug: productForm.slug || autoSlug });
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Slug (Identificador na URL)</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: viver-de-renda"
                          value={productForm.slug}
                          onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Meta Pixel ID (Facebook)</label>
                        <input
                          type="text"
                          placeholder="Ex: 123456789012345"
                          value={productForm.meta_pixel_id}
                          onChange={(e) => setProductForm({ ...productForm, meta_pixel_id: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Token de Acesso da Conversions API (CAPI)
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Cole aqui o Token gerado no Gerenciador de Eventos da Meta > Configurações > Gerar Token de Acesso"
                          value={productForm.meta_access_token}
                          onChange={(e) => setProductForm({ ...productForm, meta_access_token: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Código de Teste do Meta CAPI (Opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: TEST12345 (da aba 'Testar Eventos' do Facebook)"
                          value={productForm.meta_test_event_code}
                          onChange={(e) => setProductForm({ ...productForm, meta_test_event_code: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">URL da Página de Vendas</label>
                        <input
                          type="url"
                          placeholder="https://seusite.com.br/pagina-vendas"
                          value={productForm.destination_url}
                          onChange={(e) => setProductForm({ ...productForm, destination_url: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setShowProductModal(false)}
                          className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-lg text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition shadow-lg shadow-emerald-500/20"
                        >
                          Salvar Produto
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ETAPA 4: SCRIPT PARA LANDING PAGE */}
          {activeTab === "snippet" && (
            <div className="max-w-4xl space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">Snippet HTML:</span>
                  <button
                    onClick={() => {
                      const code = `<script src="${currentHost}/tracker.js"${
                        selectedProduct ? ` data-product="${selectedProduct.slug}"` : ""
                      } async defer></script>`;
                      navigator.clipboard.writeText(code);
                      setCopiedSnippet(true);
                      setTimeout(() => setCopiedSnippet(false), 2000);
                    }}
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:underline font-semibold"
                  >
                    {copiedSnippet ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSnippet ? "Copiado!" : "Copiar Código"}
                  </button>
                </div>

                <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs font-mono text-emerald-300 overflow-x-auto">
{`<script
  src="${currentHost}/tracker.js"${selectedProduct ? `\n  data-product="${selectedProduct.slug}"` : ""}
  async
  defer
></script>`}
                </pre>

                <div className="mt-4 bg-slate-950/60 border border-slate-800/80 rounded-lg p-4 space-y-2 text-xs text-slate-300">
                  <h4 className="font-semibold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> O que esse script faz automaticamente:
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-400">
                    <li>Lê todas as UTMs (`utm_source`, `utm_campaign`, etc.) e o `fbclid` da URL.</li>
                    <li>Gera o cookie `_fbc` e o `_fbp` compatíveis com o Meta Pixel.</li>
                    <li>Registra o clique no seu banco de dados e gera um `click_id` único.</li>
                    <li>
                      Varre os botões de compra da página (Kiwify, Hotmart, Eduzz, etc.) e anexa <code>?sck=click_id</code> e as UTMs.
                    </li>
                    <li>Utiliza <code>MutationObserver</code> para garantir que botões dinâmicos e popups também sejam marcados.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 5: LOGS DE AUDITORIA */}
          {activeTab === "logs" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">Auditoria em Tempo Real</h2>
                  <p className="text-xs text-slate-400">
                    Histórico de webhooks recebidos, correspondência de clique e status de entrega na Meta Graph API.
                  </p>
                </div>
                <button
                  onClick={() => fetchStats()}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Atualizar Logs
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950/50 text-xs uppercase text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Data/Hora</th>
                        <th className="px-4 py-3">Evento</th>
                        <th className="px-4 py-3">Plataforma</th>
                        <th className="px-4 py-3">Pedido / Cliente</th>
                        <th className="px-4 py-3">Valor</th>
                        <th className="px-4 py-3">Campanha Atribuída</th>
                        <th className="px-4 py-3">Status Meta CAPI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {recentLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                            Nenhum log de conversão encontrado ainda.
                          </td>
                        </tr>
                      ) : (
                        recentLogs.map((log: any) => (
                          <tr key={log.id} className="hover:bg-slate-800/40 transition text-xs">
                            <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString("pt-BR")}
                            </td>
                            <td className="px-4 py-3 font-semibold text-white">
                              <span
                                className={`px-2 py-0.5 rounded ${
                                  log.event_name === "Purchase"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                }`}
                              >
                                {log.event_name}
                              </span>
                            </td>
                            <td className="px-4 py-3 uppercase font-medium">{log.platform}</td>
                            <td className="px-4 py-3 text-slate-300">
                              <div>{log.customer_name || "Cliente"}</div>
                              <div className="text-slate-500 font-mono text-[10px]">{log.platform_order_id}</div>
                            </td>
                            <td className="px-4 py-3 font-bold text-white">
                              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(log.order_amount)}
                            </td>
                            <td className="px-4 py-3 text-slate-300">
                              {log.utm_campaign ? (
                                <div>
                                  <span className="font-medium text-white">{log.utm_campaign}</span>
                                  {log.utm_content && <span className="text-slate-400 block text-[10px]">({log.utm_content})</span>}
                                </div>
                              ) : (
                                <span className="text-slate-500 italic">Sem clique associado</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {log.capi_status === "sent" ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> 200 OK
                                </span>
                              ) : log.capi_status === "failed" ? (
                                <span className="inline-flex items-center gap-1 text-red-400 font-medium" title={log.capi_error_message}>
                                  <AlertCircle className="w-3.5 h-3.5" /> Erro ({log.capi_response_code})
                                </span>
                              ) : (
                                <span className="text-slate-500">Ignorado</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 6: SIMULADOR DE TESTES */}
          {activeTab === "test" && (
            <div className="max-w-3xl space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">1. Simular Webhook de Compra Aprovada (Purchase)</h3>
                  <p className="text-xs text-slate-400 mb-3">
                    Simula o webhook que a Kiwify ou a Hotmart envia no momento da aprovação do pagamento.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleRunSimulation("kiwify", "purchase")}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg text-xs transition flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" /> Testar Compra Kiwify
                    </button>

                    <button
                      onClick={() => handleRunSimulation("hotmart", "purchase")}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-medium px-4 py-2 rounded-lg text-xs transition flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" /> Testar Compra Hotmart
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-5">
                  <h3 className="text-sm font-semibold text-white mb-1">2. Simular Abandono de Checkout (InitiateCheckout)</h3>
                  <p className="text-xs text-slate-400 mb-3">
                    Dispara o evento InitiateCheckout simulando quando o lead preenche os dados mas não conclui.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleRunSimulation("kiwify", "checkout")}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg text-xs transition flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" /> Testar Checkout Kiwify
                    </button>

                    <button
                      onClick={() => handleRunSimulation("hotmart", "checkout")}
                      className="bg-slate-700 hover:bg-slate-600 text-white font-medium px-4 py-2 rounded-lg text-xs transition flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" /> Testar Checkout Hotmart
                    </button>
                  </div>
                </div>

                {testStatus && (
                  <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200">
                    {testStatus}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
