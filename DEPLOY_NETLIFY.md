# Guia de Implantação: Netlify + Supabase (100% Gratuito)

Este guia explica passo a passo como colocar o seu rastreador no ar na **Netlify** conectado a um banco de dados **PostgreSQL gratuito (Supabase)**, sem pagar nenhuma mensalidade.

---

## Passo 1: Criar o Banco de Dados Gratuito no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita.
2. Clique em **"New project"**.
3. Escolha um nome (ex: `meu-rastreador`) e defina uma senha forte para o banco de dados.
4. Escolha a região mais próxima (ex: `Sao Paulo (sa-east-1)`).
5. Após o projeto ser criado (leva cerca de 1 minuto):
   - Vá em **Project Settings** (ícone de engrenagem) > **Database**.
   - Procure por **Connection String** > selecione **URI** (ou **Transaction Pooler** na porta 6543).
   - Copie a URL, que terá o formato:
     ```
     postgresql://postgres:[SUA-SENHA]@db.[SEU-PROJETO].supabase.co:5432/postgres
     ```
   - Substitua `[SUA-SENHA]` pela senha que você definiu ao criar o projeto.

> O sistema cria automaticamente todas as tabelas na primeira vez que rodar! (Se preferir rodar manualmente, o arquivo `supabase_schema.sql` está disponível no projeto).

---

## Passo 2: Fazer o Deploy na Netlify

### Opção A: Pelo GitHub (Mais recomendada e automática)
1. Crie um repositório no seu GitHub (público ou privado).
2. Envie esta pasta `utm-tracker` para o seu repositório:
   ```bash
   git init
   git add .
   git commit -m "Meu rastreador proprio"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
   git push -u origin main
   ```
3. Acesse [netlify.com](https://netlify.com) e conecte sua conta do GitHub.
4. Clique em **"Add new site"** > **"Import an existing project"**.
5. Selecione o repositório que você acabou de criar.
6. Em **Site configuration**:
   - Build command: `npm run build`
   - Publish directory: `.next`
7. Em **Environment variables** (Variáveis de Ambiente), adicione:
   - **Key**: `DATABASE_URL`
   - **Value**: Cole a sua connection string do Supabase do Passo 1.
8. Clique em **Deploy site**!
9. Em 2 minutos seu site estará no ar com HTTPS gratuito em:
   `https://seu-nome-aleatorio.netlify.app` (você pode alterar o subdomínio ou colocar seu domínio próprio!).

---

## Passo 3: Cadastrar seu Primeiro Produto

1. Abra o painel do seu rastreador na Netlify (`https://seu-rastreador.netlify.app`).
2. Vá na aba **"Produtos & Pixels"** e clique em **"Cadastrar Novo Produto"**:
   - **Nome**: Nome do seu infoproduto (ex: `Curso de Inglês`).
   - **Slug**: Identificador único (ex: `curso-ingles`).
   - **Meta Pixel ID**: O ID numérico do seu Pixel do Facebook Ads.
   - **Token de Acesso CAPI**: Gerado no seu Gerenciador de Eventos da Meta (*Configurações > API de Conversões > Gerar Token de Acesso*).
   - **Código de Teste CAPI (Opcional)**: Caso queira ver os eventos em tempo real na aba "Testar Eventos" do Facebook (ex: `TEST12345`).
   - **URL da Página de Vendas**: Link da sua landing page.
3. Clique em **Salvar Produto**.

---

## Passo 4: Instalar o Script na Página de Vendas (Substituto do Utmify)

1. Vá na aba **"Script para Landing Page"** no painel.
2. Copie a tag `<script>` gerada, por exemplo:
   ```html
   <script
     src="https://seu-rastreador.netlify.app/tracker.js"
     data-product="curso-ingles"
     async
     defer
   ></script>
   ```
3. Cole essa tag dentro da seção `<head>` da sua página de vendas (no Elementor, WordPress, Framer ou HTML).
4. **Pronto!** O script irá:
   - Rastrear todos os visitantes e suas UTMs vindas dos anúncios.
   - Colocar o identificador de clique `?sck=clk_...` e as UTMs automaticamente em todos os botões de checkout (Kiwify, Hotmart, etc.).

---

## Passo 5: Configurar o Webhook na Kiwify / Hotmart

### Na Kiwify:
1. No seu painel da Kiwify, vá em **Apps** > **Webhooks** > **Criar Webhook**.
2. Cole a URL gerada pelo seu rastreador:
   ```
   https://seu-rastreador.netlify.app/api/webhooks/kiwify?product=curso-ingles
   ```
3. Selecione os eventos que deseja receber:
   - Compra aprovada (`order_approved`)
   - Carrinho abandonado (`cart_abandoned` / `checkout_abandoned`)
   - Boleto/Pix gerado (`waiting_payment`)
4. Salve o webhook.

### Na Hotmart:
1. No painel da Hotmart, vá em **Ferramentas** > **Webhook (Configuração de Envio de Notificações)**.
2. Cadastre a URL:
   ```
   https://seu-rastreador.netlify.app/api/webhooks/hotmart?product=curso-ingles
   ```
3. Selecione os eventos: Compra aprovada, Abandono de carrinho, etc.
4. Salve.

---

## Passo 6: Validar no Simulador

No painel do rastreador, vá na aba **"Simulador de Testes"**:
- Clique em **"Testar Compra Kiwify"** ou **"Testar Compra Hotmart"**.
- Vá na aba **"Logs de Conversão & CAPI"** e veja o evento registrado com status `200 OK` do Facebook!
- Se configurou o código de teste, abra o Gerenciador de Eventos da Meta > Testar Eventos e veja o evento de Purchase com nota de qualidade máxima!
