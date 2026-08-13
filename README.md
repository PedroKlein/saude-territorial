# saude-territorial

Plataforma georreferenciada de monitoramento de saúde territorial para equipes de Atenção Primária à Saúde (APS) em Porto Alegre.

Transforma o registro clínico da equipe em um mapa interativo com múltiplas camadas por condição, alertas de urgência, planejamento de rotas e edição direta no mapa.

> **Nota arquitetural (agosto 2026):** este projeto passou por um pivot. A versão anterior lia/escrevia planilhas Google Sheets da equipe. Agora **Supabase é a fonte da verdade** e todos os dados são gerenciados via CRUD dentro da própria aplicação. Ver [`docs/adr/ADR-001-drop-sheets.md`](docs/adr/ADR-001-drop-sheets.md) e [`docs/adr/ADR-002-drizzle-orm.md`](docs/adr/ADR-002-drizzle-orm.md).

## Sobre o Projeto

Aplicativo do **GAT 4** (Grupo de Ação Territorial 4) no programa **PET-Saúde Digital** (UFRGS + SMS Porto Alegre). Piloto na **US Moab Caldas**.

## Stack

| Concern | Escolha |
|---------|---------|
| Framework | Next.js 16 (App Router, Turbopack, `proxy.ts`) |
| UI | shadcn/ui + Tailwind CSS v4 (CSS-first `@theme`) |
| Map | Leaflet (react-leaflet v5) |
| State (server) | TanStack Query v5 |
| State (client) | Zustand v5 |
| Language | TypeScript (strict mode) |
| Auth | Better Auth (Google OAuth — **identidade apenas**) |
| Source of truth | **Supabase Postgres** |
| Data access | **Drizzle ORM** |
| Geocoding | Nominatim (OpenStreetMap) |
| Routing | OSRM |
| Package manager | pnpm |
| Task runner | mise |
| Deploy | Vercel + Supabase cloud |

## Pré-requisitos

- Node.js 20+ (gerenciado via `mise`)
- pnpm 9+
- Conta Google Cloud com OAuth 2.0 Client ID configurado (`openid email profile` scopes suficientes)
- Projeto Supabase (para o Postgres backend)

## Setup

```bash
# 1. Clone e instale dependências
git clone git@github.com:PedroKlein/saude-territorial.git
cd saude-territorial
pnpm install

# 2. Configure variáveis de ambiente
cp .env.local.example .env.local
# Preencha: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SUPABASE_*, DATABASE_URL, BETTER_AUTH_SECRET

# 3. Suba o servidor de desenvolvimento
pnpm dev

# 4. Acesse http://localhost:3000 e entre com Google
```

O mapa carrega com 34 pacientes sintéticos (endpoint temporário `/api/patients`). Substituição por leitura real do Supabase acontece na execução do pivot.

## Comandos

```bash
pnpm dev          # servidor de desenvolvimento (Turbopack)
pnpm build        # produção
pnpm test         # Vitest (unit)
pnpm lint         # ESLint
pnpm type-check   # tsc --noEmit
```

## Estrutura

Ver [`AGENTS.md`](AGENTS.md) para a estrutura completa do repositório e diretrizes de desenvolvimento.

## Documentação

| Documento | Propósito |
|-----------|-----------|
| [`SPEC.md`](SPEC.md) | Especificação funcional, modelo de dados, milestones |
| [`AGENTS.md`](AGENTS.md) | Instruções para agentes de IA e desenvolvedores humanos |
| [`TESTING.md`](TESTING.md) | Guia de testes e verificação |
| [`docs/adr/ADR-001-drop-sheets.md`](docs/adr/ADR-001-drop-sheets.md) | Decisão: descartar Sheets como fonte da verdade |
| [`docs/adr/ADR-002-drizzle-orm.md`](docs/adr/ADR-002-drizzle-orm.md) | Decisão: Drizzle ORM para acesso a dados |
| [`plans/pivot-cleanup.md`](plans/pivot-cleanup.md) | Plano de limpeza executado (agosto 2026) |

## Repo irmão

[`extensao-gat4`](https://github.com/PedroKlein/extensao-gat4) — documentação de domínio, relatórios de reunião, glossário, protótipos estáticos que precederam este app, e seed data sintético.

## LGPD

- **Nenhum dado real de paciente é commitado neste repositório.**
- Todo seed é sintético (do repo irmão `extensao-gat4`).
- Scripts de seed exigem `SEED_SYNTHETIC=1`.
- Scripts que mutam DB alvo exigem verificação explícita de que o Supabase project não é produção.

## Licença

TBD.
