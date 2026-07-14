# saude-territorial

Plataforma georeferenciada de monitoramento de saúde territorial para equipes de Atenção Primária à Saúde (APS) em Porto Alegre.

Conecta às planilhas Google Sheets da equipe de saúde e transforma dados de pacientes em um mapa interativo com múltiplas camadas, alertas de urgência, planejamento de rotas e edição bidirecional.

## Sobre o Projeto

Este aplicativo faz parte do **GAT 4** (Grupo de Ação Territorial 4) no programa **PET-Saúde Digital** (UFRGS + SMS Porto Alegre). O objetivo é construir soluções digitais de geoprocessamento para a Atenção Primária, pilotando na **US Moab Caldas**.

A equipe de saúde monitora pacientes em ~10 planilhas separadas (gestantes, tuberculose, diabetes, hipertensão, acamados, etc.) sem representação espacial. Este app resolve isso ao geocodificar endereços e plotar pacientes em um mapa com:

- Camadas ativáveis por condição de saúde
- Alertas de urgência configuráveis
- Edição de dados direto no mapa (sincroniza com a planilha)
- Planejamento de rotas para visitas domiciliares
- Heatmap e clustering por densidade
- Deduplicação de pacientes entre planilhas (pelo CNS)

## Stack

- **Next.js 15+** (App Router) — framework full-stack
- **React-Leaflet** — mapa interativo
- **shadcn/ui + Tailwind CSS** — interface
- **TanStack Query + Zustand** — gerenciamento de estado
- **Google OAuth** — autenticação (acesso on-behalf às planilhas)
- **Google Sheets API** — fonte de dados da equipe
- **Supabase** (Postgres) — cache de coordenadas e estado do app
- **Nominatim** — geocodificação (endereço → coordenadas)
- **OSRM** — cálculo de rotas (a pé / de carro)
- **Vercel** — deploy

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- Conta Google (para OAuth e acesso às planilhas)
- Projeto Supabase (free tier)
- Google Cloud Console project (OAuth credentials)

## Setup

```bash
# Clone
git clone https://github.com/PedroKlein/saude-territorial.git
cd saude-territorial

# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.local.example .env.local
# Editar .env.local com suas credenciais (ver seção abaixo)

# Rodar em desenvolvimento
pnpm dev
```

### Variáveis de Ambiente

```env
# Google OAuth (Console → APIs & Services → Credentials)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Supabase (Dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=          # openssl rand -base64 32
```

### Google Cloud Setup

1. Criar projeto no [Google Cloud Console](https://console.cloud.google.com/)
2. Ativar **Google Sheets API**
3. Configurar **OAuth consent screen** (External, test mode)
4. Criar **OAuth 2.0 Client ID** (Web application)
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Adicionar scope: `https://www.googleapis.com/auth/spreadsheets`

### Supabase Setup

1. Criar projeto no [Supabase](https://supabase.com/)
2. Rodar as migrations: `pnpm supabase db push` (quando disponíveis)

## Scripts

```bash
pnpm dev          # Desenvolvimento (http://localhost:3000)
pnpm build        # Build de produção
pnpm start        # Servir build de produção
pnpm lint         # Lint (ESLint)
pnpm type-check   # Verificar tipos (tsc --noEmit)
pnpm test         # Testes unitários (Vitest)
```

## Arquitetura

```
Google Sheets ←→ Next.js API Routes ←→ Supabase (cache)
                        ↕
                  React Client (mapa + painéis)
```

- **Google Sheets** = fonte de verdade para dados de pacientes
- **Supabase** = cache de coordenadas geocodificadas + preferências do usuário
- **Edição:** escreve na planilha primeiro, depois atualiza o cache
- **Cada aba da planilha** = uma camada no mapa (auto-descoberta)
- **CNS** = identificador único do paciente (deduplicação cross-aba)

Para detalhes completos da arquitetura, ver [`SPEC.md`](SPEC.md).

## Documentação Relacionada

| Documento | Descrição |
|-----------|-----------|
| [`SPEC.md`](SPEC.md) | Especificação funcional completa |
| [`AGENTS.md`](AGENTS.md) | Instruções para agentes AI |
| [extensao-gat4](https://github.com/PedroKlein/extensao-gat4) | Repo irmão: documentação do projeto, glossário, PoCs estáticos |

## Contribuindo

Este projeto é desenvolvido pelos monitores de computação do GAT 4 (PET-Saúde Digital, UFRGS). Para contribuir:

1. Criar branch a partir de `main`
2. Seguir conventional commits (`feat:`, `fix:`, `docs:`, etc.)
3. Nunca commitar dados reais de pacientes
4. Rodar `pnpm lint && pnpm type-check` antes de abrir PR

## Licença

TBD — O projeto segue requisitos de ser **colaborativo e open-source** (exigência do PET-Saúde).
