# 🚀 UtmTracker Pro

Sistema próprio de rastreamento e atribuição de vendas para infoprodutores e afiliados que anunciam no **Meta Ads** (Facebook & Instagram Ads), integrado nativamente com **Kiwify** e **Hotmart** com reenvio de eventos via **Meta Conversions API (CAPI)**.

> **100% Self-Hosted — Sem mensalidades recorrentes de plataformas terceiras.**

---

## 🌟 Funcionalidades

- **Script de Rastreamento Leve (`tracker.js`)**:
  - Captura automática de `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` e `fbclid`.
  - Gera cookies de alta qualidade compatíveis com a Meta (`_fbc` e `_fbp`).
  - Injeta dinamicamente `?sck=click_id` e as UTMs em todos os botões de checkout (Kiwify, Hotmart, Eduzz, etc.).
  - Suporte a botões com delay (VSL) e popups via `MutationObserver`.

- **Webhooks com Atribuição de Vendas**:
  - Endpoint Kiwify: `/api/webhooks/kiwify?product=slug`
  - Endpoint Hotmart: `/api/webhooks/hotmart?product=slug`
  - Casa o parâmetro `sck` com o clique original, resgatando a campanha e anúncio exatos que geraram o pagamento.

- **Meta Conversions API (CAPI)**:
  - Reenvio direto do servidor para o Facebook (`Purchase` e `InitiateCheckout`).
  - Hashing de dados em SHA-256 (e-mail, telefone com DDI +55, nome/sobrenome).
  - Deduplicação perfeita (`event_id = kiwify_{order_id}_purchase`), evitando contagem duplicada com o pixel do navegador.
  - Suporte ao código de teste (`test_event_code`) para visualização em tempo real na ferramenta "Testar Eventos" do Facebook.

- **Dashboard Administrativo**:
  - Tabela de atribuição por Campanha (`utm_campaign`) e Criativo (`utm_content`).
  - KPIs: Faturamento (R$), Vendas, Checkouts, Cliques, Taxa de Conversão (CVR %) e Taxa de Entrega CAPI.
  - Multi-produto: cada produto com seu próprio Pixel ID e Token CAPI.
  - Gerador de Links UTM com parâmetros dinâmicos da Meta (`{{campaign.name}}`, `{{ad.name}}`).
  - Simulador de compras para testar Kiwify e Hotmart com 1 clique.

---

## 🛠️ Stack Tecnológica

- **Framework**: Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- **Banco de Dados**: PostgreSQL (Supabase / Neon) para produção, ou LibSQL/SQLite local
- **Hospedagem**: Netlify (plano gratuito) ou Vercel

---

## 🚀 Como Fazer o Deploy Gratuito na Netlify

1. Crie um banco PostgreSQL gratuito no [Supabase](https://supabase.com) e copie a URI de conexão (`postgresql://postgres:...`).
2. Conecte este repositório na [Netlify](https://netlify.com).
3. Defina a variável de ambiente:
   - `DATABASE_URL` = sua connection string do Supabase.
4. O build command é `npm run build` e o publish directory é `.next`.
5. Pronto! O sistema criará as tabelas automaticamente no primeiro acesso.

Para o passo a passo completo, veja o arquivo [`DEPLOY_NETLIFY.md`](./DEPLOY_NETLIFY.md).

---

## 💻 Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Executar teste de integração ponta a ponta
node scripts/run_e2e.js
```

Acesse em `http://localhost:3000`.
