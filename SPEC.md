# saude-territorial — Especificação Funcional

## Visão Geral

Plataforma georeferenciada de monitoramento de saúde territorial para equipes de Atenção Primária. Transforma as planilhas Google Sheets da equipe de saúde em um mapa interativo com múltiplas camadas, alertas de urgência, planejamento de rotas e edição bidirecional.

**Problema:** A equipe da US Moab Caldas gerencia ~10 planilhas de monitoramento (Gestantes, TB, DM, HAS, Acamados, etc.) sem representação espacial. Não conseguem visualizar onde os pacientes se concentram, quais urgências existem, ou planejar rotas de visita eficientes.

**Solução:** Um mapa interativo que conecta às planilhas reais da equipe, mostra pacientes como marcadores com camadas ativáveis, destaca urgências, calcula rotas e permite editar dados direto no mapa.

**Público-alvo:** ACS (Agentes Comunitários de Saúde), enfermeiras, preceptores da US Moab Caldas.

---

## Stack Técnica

| Concern | Escolha | Razão |
|---------|---------|-------|
| Framework | Next.js (App Router) | Full-stack, Server Actions, latest best practices |
| Map | Leaflet (react-leaflet) | Proven, plugin ecosystem (heat, cluster, draw), team experience |
| UI/CSS | shadcn/ui + Tailwind CSS | Pre-built accessible components + full styling control |
| State (server) | TanStack Query | Cache, refetch, optimistic updates for sheet data |
| State (client) | Zustand | Lightweight store for UI state (active layers, filters, selections) |
| Language | TypeScript (strict mode) | Type safety across complex data models |
| Auth | Google OAuth | On-behalf access to team's sheets |
| Patient data | Google Sheets API | Team's existing workflow, zero friction |
| App state DB | Supabase (Postgres) | Coordinates cache, user prefs, route history |
| Geocoding | Nominatim (OSM) | Free, open-source. Manual pin fallback |
| Routing | OSRM | Free, open-source. Walking + driving routes |
| Territories | GeoJSON files (in repo) | Simple, version-controlled. Later: remote source |
| Package manager | pnpm | Fast, strict, Vercel-native |
| Deploy | Vercel (free tier) | Native Next.js hosting, automatic deploys |

---

## Modelo de Dados

### Fonte: Google Sheets (equipe de saúde)

A equipe possui UMA planilha Google com múltiplas abas. Cada aba = uma condição/programa de saúde = uma camada no mapa.

#### Colunas comuns (base de todas as abas de pacientes)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| Data última atualização | Date | Última vez que o registro foi editado |
| Nome | String | Nome completo do paciente |
| CNS | String | Cartão Nacional de Saúde (identificador único) |
| Data Nascimento | Date | Data de nascimento |
| Idade | Number | Idade (calculada ou manual) |
| Telefone | String | Contato |
| Rua | String | Endereço - logradouro |
| Número | String | Endereço - número |
| Complemento | String | Endereço - complemento |

#### Abas identificadas (10 camadas potenciais)

**Baseadas em pacientes (8 abas):**

| Aba | Colunas específicas |
|-----|-------------------|
| Gestantes | DUM, DPP, Risco (habitual/alto), IG, monitoramento durante/pós |
| Gestantes expostas | Contatos expostos, posicionamento |
| Tuberculose | Tipo, Baciloscopia, TRM, Cultura, PPD, RX Tórax, Forma Clínica, contatos domiciliares |
| DM (Diabetes) | PMDID, monitoramento específico |
| HAS (Hipertensão) | Data última consulta HAS |
| Domiciliados Acamados | Vacinas (Pneumo, COVID, Influenza), Status Visita, Sorológico |
| Exame pé diabético | Dados do exame |
| Puericultura/Binômio | Crianças <2 anos, par mãe-criança |

**Baseadas em locais (2 abas):**

| Aba | Colunas específicas |
|-----|-------------------|
| PSE (Saúde na Escola) | Nome escola, INEP, Tema da ação, Data, Público, Profissionais |
| ILPI (Inst. Longa Permanência) | Nome do Local, Planejamento Atividades Coletivas |

#### Deduplicação

O CNS é o identificador único de paciente. Um mesmo paciente pode aparecer em múltiplas abas (ex: gestante + hipertensa). O sistema deve:
1. Detectar duplicatas pelo CNS
2. Mostrar UM marcador por paciente com badges de cada condição
3. Surfacear conflitos quando dados base diferem entre abas (endereço, telefone)
4. Permitir ao usuário resolver qual versão é correta

### App State: Supabase (Postgres)

| Tabela | Propósito |
|--------|-----------|
| `coordinates_cache` | Endereço → lat/lng geocodificado. Evita re-geocoding |
| `manual_pins` | Localizações posicionadas manualmente (sem endereço formal) + referência textual |
| `user_preferences` | Camadas ativas, filtros salvos, último zoom/centro |
| `route_history` | Rotas calculadas para reutilização |
| `sync_metadata` | Última sincronização por aba, status |

---

## Fluxo de Dados

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Google Sheets  │◄───────►│  Next.js API      │◄───────►│    Supabase     │
│  (fonte real)   │  OAuth  │  Routes           │         │  (cache/state)  │
└─────────────────┘         └────────┬─────────-┘         └─────────────────┘
                                     │
                            ┌────────▼──────────┐
                            │  React Client     │
                            │  (Map + Panels)   │
                            └───────────────────┘
```

### Leitura (load)
1. App abre → carrega dados do Supabase (cache) → mapa aparece instantaneamente
2. Em background, compara `sync_metadata` → se stale, busca dados frescos do Google Sheets
3. Novos dados chegam → geocodifica endereços sem coordenadas (Nominatim) → atualiza cache
4. Marcadores novos/atualizados aparecem progressivamente no mapa

### Escrita (edit)
1. Usuário clica marcador → painel de edição abre
2. Edita campo → clica "Salvar"
3. Escreve no Google Sheets PRIMEIRO (fonte de verdade) via token do usuário
4. Se sucesso → atualiza cache Supabase
5. Se falha → mostra erro, não atualiza cache

### Refresh manual
- Botão "Sincronizar" força re-leitura de todas as abas
- Badge mostra "Última sincronia: Xh atrás"

---

## Autenticação

### Fluxo
1. Usuário acessa o app → redirecionado para Google OAuth
2. App solicita scopes: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/spreadsheets`
3. Usuário autoriza → app recebe access token + refresh token
4. Token usado para: identificar o usuário E acessar as planilhas da equipe
5. Sessão armazenada no Supabase (user profile, preferences)

### Controle de acesso
- Qualquer pessoa com Google account que tenha acesso Editor à planilha pode usar o app
- O acesso à planilha no Google Drive é o controle de acesso real (gerenciado pela equipe)
- O app apenas respeita as permissões que o Google Drive já impõe

### Configuração da planilha
- Na primeira vez, o usuário configura qual planilha conectar (cola a URL do Google Sheets)
- O app extrai o spreadsheet ID e armazena no Supabase vinculado ao usuário/equipe
- Permite trocar de planilha nas configurações

---

## Sistema de Camadas

### Conceito
Cada aba da planilha = uma camada no mapa. As camadas são **auto-descobertas**: o app lê os nomes das abas e cria uma camada para cada.

### Configuração visual (config file no repo)

```typescript
// layers.config.ts
export const layerConfig: Record<string, LayerConfig> = {
  "Gestantes": {
    icon: "baby",
    color: "#E91E63",
    visibleColumns: ["Nome", "DPP", "Risco", "IG"],
    clusterEnabled: true,
    heatmapEnabled: true,
  },
  "Tuberculose": {
    icon: "lungs",
    color: "#FF5722",
    visibleColumns: ["Nome", "Tipo", "Forma Clínica"],
    clusterEnabled: true,
    heatmapEnabled: true,
  },
  // ...
};
```

### Funcionalidades por camada
- **Toggle on/off** — barra lateral com checkboxes
- **Clustering** — marcadores se agrupam em zoom baixo, mostrando contagem
- **Heatmap** — modo alternativo que mostra densidade ao invés de marcadores individuais
- **Filtros** — por microárea, por nível de alerta, por data de atualização
- **Ocultar incertos** — marcadores geocodificados com baixa confiança podem ser ocultados

### Camada de visão geral (cross-layer)
Uma camada especial "Alertas" que mostra TODOS os pacientes com urgência, independente da condição. Transcende as camadas individuais.

---

## Sistema de Alertas

### Regras configuráveis via Google Sheet

Uma aba especial na planilha (ou uma planilha separada) com formato:

| Camada | Coluna | Operador | Valor | Nível |
|--------|--------|----------|-------|-------|
| Gestantes | IG (semanas) | > | 40 | vermelho |
| Gestantes | Risco | = | alto risco | amarelo |
| Tuberculose | Data última atualização | older_than_days | 30 | vermelho |
| HAS | Data última consulta | older_than_days | 180 | amarelo |
| Domiciliados Acamados | Data INFLUENZA | older_than_days | 365 | amarelo |

### Operadores suportados (v1)
- `>`, `<`, `>=`, `<=` — comparação numérica
- `=`, `!=` — igualdade/string match
- `older_than_days` — diferença em dias entre hoje e uma coluna de data
- `is_empty` — coluna vazia/sem valor

### Níveis de alerta
- 🔴 **Vermelho** — urgência alta, requer ação imediata
- 🟡 **Amarelo** — atenção, acompanhar
- 🟢 **Verde** — tudo em dia (default, sem alerta)

### Visualização
- Marcadores com borda colorida conforme nível mais alto de alerta
- Badge no marcador indicando alerta
- Painel lateral mostra resumo: "12 alertas vermelhos, 28 amarelos"
- Camada "Alertas" mostra apenas pacientes com alerta ativo

---

## Endereços e Geocodificação

### Pipeline

```
Endereço (Rua + Número + Complemento)
    │
    ▼
Nominatim geocoding (endereço → lat/lng)
    │
    ├── Sucesso → cache em Supabase → marcador no mapa
    │
    └── Falha → marcador de "endereço não resolvido"
                    │
                    ▼
              Usuário pode:
              1. "Posicionar no mapa" → drop pin manual
              2. Adicionar referência textual ("casa azul após a ponte")
              3. Mostrar apenas a rua (sem número → marcador na rua)
```

### Anotações e nomes alternativos
- Ruas podem ter múltiplos nomes (oficial + popular)
- O sistema mantém uma tabela de sinônimos (Supabase)
- Quando o geocoding falha com nome popular, tenta o nome oficial
- Usuários podem adicionar anotações a endereços ("acesso pela viela lateral")

### Pin manual com referência
Para locais sem endereço formal (favelas, ocupações, áreas rurais):
- Botão "Posicionar manualmente"
- Usuário clica no mapa para definir localização
- Campo de texto para referência: "próximo ao bar do Zé, rua sem nome atrás da escola"
- Coordenadas salvas no Supabase (não na planilha)

---

## Rotas e Planejamento

### Rota simples (US → paciente)
- Clique no marcador → botão "Traçar rota"
- Calcula rota da US Moab Caldas até o paciente
- Opções: a pé 🚶 ou de carro 🚗
- Mostra distância e tempo estimado
- Polyline desenhada no mapa

### Planejamento do dia
- Usuário seleciona múltiplos pacientes para visitar
- App calcula rota otimizada (ordem mais eficiente)
- Mostra roteiro: US → Paciente A → Paciente B → ... → US
- Permite reordenar manualmente
- Mostra tempo total estimado

### Motor de rotas: OSRM
- API pública para walking e driving profiles
- Retorna GeoJSON polylines
- Sem custo, sem API key
- Limitação: não suporta transporte público (deferred)

---

## Territórios

### Fonte: GeoJSON (v1)
- Arquivo `.geojson` no repositório com polígonos das microáreas
- Carregado pelo app como camada base do mapa
- Mostra limites de microáreas, bairros, área de abrangência da US

### Funcionalidades
- Coloração por microárea (cada ACS = uma cor)
- Toggle visibilidade dos limites
- Hover mostra nome da microárea e ACS responsável
- Métricas por microárea (total pacientes, alertas, etc.)

### Futuro (deferred)
- Carregar de fonte remota (Google Drive, URL)
- Editar limites diretamente no mapa (leaflet-draw)

---

## Interface do Usuário

### Layout principal

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Logo + Nome do Usuário + Sync Badge + Settings     │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│  Sidebar │              Map (Leaflet)                       │
│          │                                                  │
│  - Layers│         Markers / Clusters / Heatmap             │
│  - Filter│                                                  │
│  - Alerts│                                                  │
│  - Routes│                                                  │
│          │                                                  │
├──────────┴──────────────────────────────────────────────────┤
│  Detail Panel (slide-up on marker click): patient info/edit │
└─────────────────────────────────────────────────────────────┘
```

### Modos de visualização
1. **Marcadores** — ícones individuais por paciente, com clustering em zoom baixo
2. **Heatmap** — densidade de casos por área
3. **Alertas** — apenas pacientes com urgência, cross-layer

### Interações do mapa
- Zoom/pan padrão
- Click marcador → abre painel de detalhes
- Click cluster → zoom in ou abre lista
- Toggle camadas na sidebar
- Filtros por microárea, nível de alerta, data
- Botão "Sincronizar" no header

---

## Milestones

### Milestone 1: Foundation
> O mapa carrega e mostra dados reais da planilha com autenticação.

- [ ] Setup Next.js + pnpm + TypeScript strict + Tailwind + shadcn/ui
- [ ] Google OAuth (login + sheet scope)
- [ ] Configuração de planilha (colar URL)
- [ ] Leitura de dados do Google Sheets (todas as abas)
- [ ] Geocodificação (Nominatim) + cache Supabase
- [ ] Mapa Leaflet com marcadores básicos (uma camada)
- [ ] Multi-layer toggle (sidebar com checkboxes)
- [ ] Territórios (GeoJSON render)

### Milestone 2: Interaction
> O usuário pode interagir com os dados, ver alertas e editar.

- [ ] Painel de detalhes do paciente (click marcador)
- [ ] Edição bidirecional (edit → save to Sheet → update cache)
- [ ] Sistema de alertas (regras da Sheet, cores nos marcadores)
- [ ] Camada de visão geral de alertas
- [ ] Clustering com contagem
- [ ] Heatmap toggle
- [ ] Deduplicação por CNS + resolução de conflitos
- [ ] Pin manual + referência textual para endereços sem geocoding

### Milestone 3: Planning
> O usuário pode planejar seu dia de visitas com rotas.

- [ ] Rota simples (US → paciente, walking/driving)
- [ ] Seleção de múltiplos pacientes para roteiro
- [ ] Otimização de rota (ordem eficiente)
- [ ] Métricas por microárea
- [ ] Filtros avançados (data, microárea, alerta)
- [ ] Anotações e nomes alternativos de ruas

### Milestone 4: Polish
> Refinamentos e features avançadas.

- [ ] Ocultar pontos com geocoding incerto
- [ ] Histórico de rotas
- [ ] Preferências do usuário persistidas
- [ ] Responsive/mobile (ACS usa celular)
- [ ] Performance com muitos marcadores
- [ ] Territórios de fonte remota

---

## Deploy

### Vercel
- Repositório conectado ao Vercel
- Deploy automático em push para `main`
- Environment variables: Google OAuth client ID/secret, Supabase URL/key
- Preview deployments para PRs

### Variáveis de ambiente necessárias

```env
# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

---

## Decisões Arquiteturais

Todas as decisões abaixo foram discutidas e LOCKED em 2026-07-14:

1. **Sheet = fonte de verdade** — Supabase é cache. Writes vão pro Sheet primeiro.
2. **OAuth on-behalf** — cada usuário acessa a planilha com SEU token. Requer que tenham acesso Editor no Google Drive.
3. **Progressive load** — mapa aparece imediato do cache, dados frescos stream em background.
4. **Config file para layers** — não banco. Mais simples. Migra para DB + admin UI depois.
5. **Nominatim + pin manual** — geocoding gratuito, com fallback humano para endereços sem solução.
6. **Simple rule engine** — coluna/operador/valor/nível. Sem AND/OR complexo por ora.
7. **Auto-discover tabs** — qualquer nova aba na planilha aparece como camada automaticamente.
8. **CNS como ID único** — merge cross-tab com surface de conflitos.

---

## Referências

- [extensao-gat4 (docs + PoCs)](https://github.com/PedroKlein/extensao-gat4) — Documentação do projeto e protótipos estáticos
- [mapa-gestantes PoC](https://pedroklein.github.io/extensao-gat4/mapa-gestantes/) — PoC estático de referência (Leaflet + Vite)
- [Google Sheets API v4](https://developers.google.com/sheets/api)
- [Supabase Docs](https://supabase.com/docs)
- [react-leaflet](https://react-leaflet.js.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [OSRM API](http://project-osrm.org/docs/)
- [Nominatim](https://nominatim.org/release-docs/develop/api/Search/)
