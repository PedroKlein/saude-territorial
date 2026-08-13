# saude-territorial — Especificação Funcional

> **Status arquitetural:** pós-pivot (agosto 2026). Ver `docs/adr/ADR-001-drop-sheets.md` e `docs/adr/ADR-002-drizzle-orm.md`.
> A arquitetura anterior (Google Sheets como fonte da verdade) foi descartada — histórico preservado no git.

## Visão Geral

Plataforma georreferenciada de monitoramento de saúde territorial para equipes de Atenção Primária. Transforma o registro clínico da equipe em um mapa interativo com múltiplas camadas, alertas de urgência, planejamento de rotas e edição direta no mapa.

**Problema:** A equipe da US Moab Caldas gerencia ~10 planilhas de monitoramento (Gestantes, TB, DM, HAS, Acamados, etc.) sem representação espacial. Não conseguem visualizar onde os pacientes se concentram, quais urgências existem, ou planejar rotas de visita eficientes. Além disso, precisam de **customização** — adicionar camadas, corrigir nomenclaturas de ruas, ajustar localizações — que uma planilha não permite ergonomicamente.

**Solução:** Um mapa interativo onde o Agente Comunitário de Saúde (ACS) mantém os dados diretamente na aplicação (CRUD), com camadas por condição, destaque de urgências, planejamento de rotas e edição bidirecional dos endereços/pins.

**Público-alvo:** ACS, enfermeiras e preceptores da US Moab Caldas.

**Escopo do MVP** (agosto 2026): mapa + camadas + alertas estáticos + CRUD básico + territórios. Sem mobile, sem sincronização distribuída, sem tempo real. Ver seção "Milestones".

---

## Stack Técnica

| Concern | Escolha | Razão |
|---------|---------|-------|
| Framework | Next.js 16 (App Router) | Full-stack, `"use cache"`, `proxy.ts`, Turbopack |
| Language | TypeScript (strict mode) | Type safety across complex data models |
| Map | Leaflet (react-leaflet v5) | Proven, plugin ecosystem (heat, cluster, draw), React 19 support |
| UI/CSS | shadcn/ui + Tailwind CSS v4 | CSS-first `@theme` config, accessible components |
| State (server) | TanStack Query v5 | Cache, refetch, optimistic updates |
| State (client) | Zustand v5 | Lightweight store for UI state (active layers, filters, selections) |
| Auth | Better Auth (Google OAuth, identity only) | TypeScript-first sessions; **no** `spreadsheets` scope post-pivot |
| **Source of truth** | **Supabase Postgres** | All patient data lives here (was: Google Sheets — see ADR-001) |
| **Data access** | **Drizzle ORM** | Typed queries, SQL-native migrations, RLS-friendly. See ADR-002 |
| Auth session storage | Better Auth (SQLite via `better-sqlite3`) |
| Geocoding | Nominatim (OSM) | Free, open-source. Manual pin fallback |
| Routing | OSRM | Free, open-source. Walking + driving routes |
| Territories | GeoJSON files (in repo) | Simple, version-controlled. Later: remote source |
| Package manager | pnpm | Fast, strict, Vercel-native |
| Deploy | Vercel (free tier) + Supabase cloud | Native Next.js hosting, automatic deploys |

---

## Modelo de Dados

**Fonte da verdade:** Supabase Postgres, acessado via Drizzle ORM. Ver `docs/adr/ADR-002-drizzle-orm.md`.

### Padrão: base + tabelas de extensão

Uma única tabela `patients` guarda os campos comuns a todo paciente. Uma tabela de **extensão por condição** guarda os campos específicos de cada programa/agravo, relacionada por `patient_id` (FK, cascade delete).

| Tabela | Escopo | Chave |
|--------|--------|-------|
| `patients` | Dados comuns (CNS, nome, endereço, coordenadas) | `id UUID PK`, `cns UNIQUE` |
| `gestantes_data` | DUM, DPP, IG, risco, monitoramento pré-natal | `patient_id PK/FK` |
| `tuberculose_data` | Tipo, baciloscopia, forma clínica, contatos | `patient_id PK/FK` |
| `has_data` | Data última consulta, monitoramento pressórico | `patient_id PK/FK` |
| *(futuras)* `dm_data`, `acamados_data`, `puericultura_data`, `pse_data`, `ilpi_data` | Análogas | `patient_id PK/FK` |

**O desenho de colunas exato é feito na execução do pivot** — este spec fixa apenas o padrão. A tabela `patients` inclui `lat`, `lng`, `geocode_status ∈ {geocoded, manual, unresolved}` para suportar o fluxo de geocodificação com fallback manual.

### Deduplicação por CNS

O CNS é chave única em `patients`. Ao criar um paciente com CNS já existente, a UI mostra "Este CNS já pertence a *Fulana*. Adicionar condição ao paciente existente?" — evita duplicatas e preserva o padrão "um paciente = um pin com múltiplas badges de condições".

### Regras de acesso

- **Sem RLS no MVP.** Todo usuário autenticado lê e escreve o dataset compartilhado da equipe. Controles compensatórios: gates de sessão em cada rota, service-role DB restrito a scripts admin (seed, backup), LGPD guard exige dado sintético em qualquer seed.
- **Endurecimento pós-MVP:** políticas RLS quando o piloto expandir para múltiplas equipes.

### Schema e migrations

- Schema Drizzle em `src/db/schema/*.ts`.
- Migrations em `supabase/migrations/*.sql`, geradas por `drizzle-kit generate`.
- **Migrations legadas (`001..003.sql`) foram apagadas** — histórico preservado no git (ver ADR-002 rollback plan).
- Novas migrations começam em `0001` na execução do pivot.

---

## Fluxo de Dados

```
┌─────────────────┐         ┌──────────────────┐
│    Supabase     │◄───────►│   Next.js API     │
│   (fonte da     │ Drizzle │   Routes          │
│    verdade)     │         │                   │
└─────────────────┘         └────────┬─────────-┘
                                     │
                            ┌────────▼──────────┐
                            │  React Client     │
                            │  (Map + Panels)   │
                            └───────────────────┘

  Auth (Google identity)  ──►  Better Auth  ──►  SQLite (`auth.db`) session cookie
```

### Leitura
1. Cliente monta a página → `usePatientData` (TanStack Query) chama `GET /api/patients`.
2. Route handler consulta Drizzle → retorna JSON com pacientes agrupados por camada (`{ [layerId]: [...patients] }`).
3. Cache TanStack Query mantém staleTime de 5min; refetch em foco de janela.

### Escrita
1. Usuário edita/cria/deleta paciente no painel → `useMutation` chama `POST/PATCH/DELETE /api/patients/[id]`.
2. Route handler valida sessão → executa mutation Drizzle → retorna paciente atualizado.
3. `onSuccess` invalida `patientKeys.all` → TanStack refaz `GET`.

### Geocodificação (em pivot execution)
1. Endereço salvo → chama Nominatim.
2. Sucesso → `geocode_status = 'geocoded'`, salva `lat/lng`.
3. Falha → prompt para posicionar pin manualmente → `geocode_status = 'manual'`.
4. Usuário pode arrastar marcador a qualquer momento → PATCH atualiza `lat/lng` e mantém `geocode_status = 'manual'`.

---

## Autenticação

**Google OAuth para identidade apenas** (ver `docs/adr/ADR-001-drop-sheets.md`). Sem escopo `spreadsheets`, sem refresh de access token, sem chamadas à Google API em nome do usuário.

### Fluxo
1. Usuário acessa o app → redirecionado para `/login`.
2. Clica "Entrar com Google" → Better Auth solicita `openid email profile`.
3. Autorização → cookie de sessão assinado é definido → redireciona para `/map`.
4. `proxy.ts` protege `/map`, `/settings` e outros dashboard routes.

### Controle de acesso
- Qualquer conta Google autorizada pela equipe pode entrar.
- Autorização granular (por microárea, por equipe) fica para pós-MVP.

---

## Sistema de Camadas

Cada camada representa uma condição de saúde (Gestantes, TB, HAS, etc.). Camadas são **definidas em código** em `src/config/layers.config.ts` — a antiga descoberta automática por aba de planilha não se aplica mais.

**Camadas prioritárias do MVP:** Gestantes, Tuberculose, HAS.
**Camadas mantidas em código, sem dados no MVP:** DM, Acamados.

Cada config define: `icon`, `color`, `visibleColumns` (para o painel de detalhes), `clusterEnabled`, `heatmapEnabled`.

### Funcionalidades por camada
- **Toggle on/off** — sidebar com checkboxes por camada.
- **Clustering** — marcadores se agrupam em zoom baixo com contagem.
- **Heatmap** — modo alternativo mostrando densidade.
- **Filtros** — microárea, nível de alerta, texto livre.

### Camada de visão geral (cross-layer)
Uma camada especial "Alertas" mostra TODOS os pacientes com urgência ativa, independente da condição.

---

## Sistema de Alertas

Regras estáticas em código (`src/config/alert-rules.config.ts`). Configuração dinâmica via UI é pós-MVP.

### Regras estáticas do MVP

| Camada | Coluna | Operador | Valor | Nível |
|--------|--------|----------|-------|-------|
| Gestantes | IG (semanas) | > | 40 | 🔴 Vermelho |
| Gestantes | Risco | = | alto | 🟡 Amarelo |
| Tuberculose | data_ultima_atualizacao | older_than_days | 30 | 🔴 Vermelho |
| HAS | data_ultima_consulta | older_than_days | 180 | 🟡 Amarelo |

Operadores suportados na engine (já implementados, ver `src/lib/alerts/engine.ts`): `>`, `<`, `>=`, `<=`, `=`, `!=`, `older_than_days`, `is_empty`.

### Visualização
- Marcadores com borda colorida no maior nível ativo.
- Painel "Priority List" mostra pacientes ordenados por urgência.
- Stats dashboard exibe contagem por nível.

---

## Endereços e Geocodificação

### Pipeline (a implementar em pivot execution)

```
Endereço (Rua + Número + Complemento)
    │
    ▼
Nominatim geocoding (endereço → lat/lng)
    │
    ├── Sucesso (confidence ≥ threshold) → salva lat/lng + geocode_status = 'geocoded'
    │
    └── Falha OU baixa confiança → prompt para posicionar pin manualmente
                    │
                    ▼
              Usuário clica no mapa → lat/lng + geocode_status = 'manual'
              Campo opcional: referência textual ("casa azul após a ponte")
```

### Ajuste manual em qualquer momento
Usuário pode **arrastar o marcador** de um paciente para corrigir posicionamento errado — o `geocode_status` passa a `'manual'` e as novas coordenadas são persistidas via `PATCH /api/patients/[id]`.

---

## Rotas e Planejamento

### Rota simples (US → paciente)
- Já implementada e funcionando pré-pivot — preservada.
- Botão "Traçar rota" no painel de detalhes → OSRM → polyline no mapa.
- Perfis: 🚶 a pé ou 🚗 de carro.

### Planejamento do dia (pós-MVP)
- Selecionar múltiplos pacientes → rota otimizada.
- Reordenação manual, tempo total estimado.

---

## Territórios

- Arquivos `.geojson` em `territories/` — carregados como overlay do Leaflet.
- Polígonos de microáreas com cor por ACS/equipe.
- Hover mostra nome da microárea.

Edição de limites diretamente no mapa (leaflet-draw) fica para pós-MVP.

---

## Interface do Usuário

### Layout principal

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Logo + Usuário + Sync Badge + Settings             │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│  Sidebar │              Map (Leaflet)                       │
│          │                                                  │
│  Layers  │         Markers / Clusters / Heatmap             │
│  Filters │                                                  │
│  Routes  │                                                  │
│          │                                                  │
├──────────┴──────────────────────────────────────────────────┤
│  Detail Panel (slide-in on marker click): dados + rotas     │
└─────────────────────────────────────────────────────────────┘
```

### Modos de visualização
1. **Marcadores** — ícones individuais, cluster em zoom baixo.
2. **Heatmap** — densidade por área.
3. **Alertas** — filtro cross-layer mostrando só pacientes com urgência.

---

## MVP e Milestones

O MVP foi acordado com a equipe de saúde (ver doc "Design de Software / Definição de Escopo" e memo de reunião).

### MVP — vai entrar
- Google OAuth (identidade apenas)
- CRUD de pacientes direto na aplicação (adicionar, editar, remover)
- Mapa Leaflet com marcadores por camada
- 3 camadas prioritárias: Gestantes, TB, HAS
- Toggle de camadas, heatmap opcional
- Filtros básicos (microárea, nível de alerta, busca)
- Alertas estáticos com destaque visual
- Territórios (GeoJSON overlay)
- Manual pin para endereços não geocodificáveis
- Detalhe do paciente com rota até US Moab Caldas

### Pode entrar (se sobrar tempo)
- Combinação de camadas com AND/OR/NOT
- Mapa de calor com peso por gravidade
- Marker clustering avançado
- Reordenação manual de rotas para múltiplos pacientes

### Explicitamente fora do MVP
- Suporte mobile / tablet
- Sincronização entre instâncias distribuídas
- Tempo real / websockets
- Integração com e-SUS APS
- Import automático de planilhas (deferred; ver ADR-001)
- Criação de camadas customizadas por ACS (dream delivery)
- Nomenclaturas alternativas de ruas com IA
- Inteligência artificial para priorização

### Milestones pós-cleanup

O plano de execução do pivot (que substitui esta seção) será registrado em `plans/pivot-execution.md` na próxima sessão de planejamento. Este spec fixa a **arquitetura**; a **ordem de implementação** é definida separadamente.

---

## Deploy

### Vercel + Supabase cloud
- Repositório conectado ao Vercel; deploy automático em push para `main`.
- Environment variables: Google OAuth client ID/secret, Supabase URL/anon key/service-role key, `BETTER_AUTH_SECRET`, `DATABASE_URL`.
- Preview deployments para PRs.
- Supabase cloud como Postgres backend.

### Variáveis de ambiente necessárias

```env
# Google OAuth (identidade apenas)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database (Drizzle connection string — direct Postgres, bypassing PgBouncer for schema ops)
DATABASE_URL=

# Better Auth
BETTER_AUTH_SECRET=

# App
NEXT_PUBLIC_APP_URL=
```

---

## Decisões Arquiteturais LOCKED

Válidas a partir de agosto 2026 (pós-pivot):

1. **Supabase = fonte da verdade.** Ver ADR-001. Google Sheets não é mais lida em runtime.
2. **Drizzle ORM = camada de acesso a dados.** Ver ADR-002. Não há Supabase SDK neste repo; Postgres é acessado exclusivamente via Drizzle.
3. **Migrations SQL geradas via `drizzle-kit`**, commitadas em `supabase/migrations/`. Migrations legadas apagadas — recuperáveis via git.
4. **Google OAuth para identidade apenas.** Sem escopo `spreadsheets`, sem refresh de access token, sem chamadas Google API on-behalf.
5. **CRUD in-app.** Editar paciente = modificar Supabase via `PATCH /api/patients/[id]`. Sem write-back para Sheet.
6. **Camadas definidas em código.** `src/config/layers.config.ts`. Descoberta automática (ex-Sheet-tab) descartada.
7. **Alertas com regras estáticas em código.** `src/config/alert-rules.config.ts`. Configuração via UI é pós-MVP.
8. **CNS = identificador único de paciente.** UNIQUE constraint em `patients.cns`. Duplicidade → prompt "adicionar condição a paciente existente".
9. **Padrão base + extensão** para modelagem de condições. Uma tabela `patients` + N tabelas por condição.
10. **Sem RLS no MVP.** Compensado por gates de sessão em rotas e service-role restrito a scripts admin.
11. **Geocodificação com fallback manual.** Blocking no save; usuário pode arrastar marcador para corrigir a qualquer momento.
12. **Deploy cloud.** Vercel + Supabase cloud. Local install é opção futura, não MVP.

---

## Referências

- [`docs/adr/ADR-001-drop-sheets.md`](docs/adr/ADR-001-drop-sheets.md) — por que Sheets caiu
- [`docs/adr/ADR-002-drizzle-orm.md`](docs/adr/ADR-002-drizzle-orm.md) — por que Drizzle ganhou
- [`plans/pivot-cleanup.md`](plans/pivot-cleanup.md) — plano de limpeza executado agosto 2026
- [extensao-gat4](https://github.com/PedroKlein/extensao-gat4) — sister repo com documentação, PoCs originais, e seed data sintético
  - Seed Gestantes: `prototypes/mapa-gestantes/src/data/gestantes.json`
  - Seed multi-condição: `prototypes/poc-01/data/pacientes.csv`
- [Drizzle Docs](https://orm.drizzle.team)
- [Supabase Docs](https://supabase.com/docs)
- [react-leaflet](https://react-leaflet.js.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [OSRM API](http://project-osrm.org/docs/)
- [Nominatim](https://nominatim.org/release-docs/develop/api/Search/)
