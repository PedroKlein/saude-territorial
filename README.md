# saude-territorial

Plataforma georeferenciada de monitoramento de saúde territorial para equipes de Atenção Primária à Saúde (APS) em Porto Alegre.

Conecta às planilhas Google Sheets da equipe de saúde e transforma dados de pacientes em um mapa interativo com múltiplas camadas, alertas de urgência, planejamento de rotas e edição bidirecional.

## Sobre o Projeto

Este aplicativo faz parte do **GAT 4** (Grupo de Ação Territorial 4) no programa **PET-Saúde Digital** (UFRGS + SMS Porto Alegre). O objetivo é construir soluções digitais de geoprocessamento para a Atenção Primária, pilotando na **US Moab Caldas**.

## Stack

| Concern | Escolha |
|---------|---------|
| Framework | Next.js 16 (App Router, Turbopack, `proxy.ts`) |
| UI | shadcn/ui + Tailwind CSS v4 (CSS-first `@theme`) |
| Map | Leaflet (react-leaflet v5) — *em breve* |
| State (server) | TanStack Query v5 |
| State (client) | Zustand v5 |
| Language | TypeScript (strict mode) |
| Auth | Better Auth (Google OAuth) |
| Patient data | Google Sheets API v4 |
| App state DB | Supabase (Postgres) — cache only |
| Geocoding | Nominatim (OpenStreetMap) |
| Routing | OSRM — *em breve* |
| Package manager | pnpm |
| Task runner | mise |
| Deploy | Vercel |

## Pré-requisitos

- Node.js 24+ (gerenciado via mise)
- pnpm
- Conta Google (para OAuth e acesso às planilhas)
- Google Cloud Console project (OAuth credentials + Sheets API habilitada)

## Setup

```bash
# Clone
git clone https://github.com/PedroKlein/saude-territorial.git
cd saude-territorial

# mise instala Node automaticamente
mise install

# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.local.example .env.local
# Editar .env.local com suas credenciais (ver seção abaixo)

# Criar tabelas do Better Auth (SQLite local)
echo 'y' | npx auth migrate

# Rodar em desenvolvimento
mise run dev
```

### Variáveis de Ambiente

```env
# Google OAuth (Console → APIs & Services → Credentials)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Supabase (Dashboard → Settings → API) — opcional para dev local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
BETTER_AUTH_SECRET=          # qualquer string aleatória para dev
BETTER_AUTH_URL=http://localhost:3000
```

### Google Cloud Setup

1. Criar projeto no [Google Cloud Console](https://console.cloud.google.com/)
2. Ativar **Google Sheets API**
3. Configurar **OAuth consent screen** (External, test mode)
4. Criar **OAuth 2.0 Client ID** (Web application)
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Scope já incluído automaticamente: `https://www.googleapis.com/auth/spreadsheets`

## Tasks (mise)

```bash
mise run dev            # Dev server (Turbopack, port 3000)
mise run test           # Rodar testes (Vitest)
mise run test:watch     # Testes em watch mode
mise run type-check     # TypeScript check
mise run lint           # ESLint
mise run build          # Build de produção (inclui type-check + lint)
mise run check          # Todos os quality gates: type-check + lint + test
mise run dev:auth       # Gerar .auth-state.json para testes automatizados
mise run db:auth-migrate # Criar tabelas do Better Auth no SQLite
```

## Arquitetura

```
Google Sheets (fonte de verdade)
    ↕ OAuth on-behalf (token do usuário)
Next.js API Routes
    ↕
Supabase (cache: coordenadas, prefs, sync metadata)
    ↕
React Client (mapa + painéis)
```

- **Google Sheets** = fonte de verdade para dados de pacientes
- **Supabase** = cache de coordenadas geocodificadas + preferências
- **Edição:** escreve na planilha primeiro, depois atualiza o cache
- **Cada aba da planilha** = uma camada no mapa (auto-descoberta)
- **CNS** = identificador único do paciente (deduplicação cross-aba)

## Documentação

| Documento | Descrição |
|-----------|-----------|
| [`SPEC.md`](SPEC.md) | Especificação funcional completa |
| [`AGENTS.md`](AGENTS.md) | Instruções para agentes AI |
| [`TESTING.md`](TESTING.md) | Guia de verificação e testes (agent_browser, Playwright) |
| [`findings/`](findings/) | Achados técnicos e decisões para referência futura |
| [extensao-gat4](https://github.com/PedroKlein/extensao-gat4) | Repo irmão: documentação, glossário, PoCs |

## Status Atual

### ✅ M1 Infrastructure (completo)
- Setup Next.js 16 + Tailwind v4 + TypeScript strict
- Google OAuth (Better Auth) com scope de spreadsheets
- Supabase cache layer (esquema + RLS policies)
- Settings page (configuração de planilha)
- Google Sheets API (parser, discovery, rate limiting)
- Nominatim geocoding (normalização, cache, rate limit 1req/s)
- 185 testes passando

### 🔲 M1 Map (próximo)
- Mapa Leaflet com marcadores
- Multi-layer toggle (sidebar)
- Territórios (GeoJSON)

### 🔲 M2 Interaction
- Painel de detalhes do paciente
- Edição bidirecional
- Sistema de alertas
- Clustering + heatmap

## Licença

TBD — Projeto colaborativo e open-source (exigência PET-Saúde).
