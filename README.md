# 🍗 KOTA EDU FRANGOS — REI DOS MOLHOS

Aplicação completa para o restaurante (Beira, Moçambique): **loja do cliente + painel da equipa (KDS, BI, stock)** em **React Web** e **React Native (Expo)**, a partilhar o mesmo código de negócio.

```
kota-edu-frangos/
├── packages/shared      # Núcleo partilhado (TypeScript puro + hooks React)
│   └── src/  types · brand · menu (30 itens) · sauces · cart (carrinho/upsell/fidelidade/checkout)
│             orders (talão, WhatsApp) · seed (7 dias) · analytics (KPIs + Consultor) · store · sync · time · format
├── apps/web             # React 19 + Vite + Tailwind + Lucide + Recharts
│   └── src/customer     # Menu, Rei dos Molhos, carrinho/checkout 3 etapas, rastreio, clube
│   └── src/admin        # PIN, KDS Kanban, Dashboard BI, Cardápio/Stock/Combos, Config
├── apps/mobile          # Expo SDK 58 + React Native 0.88 + NativeWind + React Navigation
│   └── src/screens      # HomeMenuScreen · SauceModal · CartCheckoutScreen · LiveTrackerScreen · DeliveryRiderScreen
└── supabase/schema.sql  # Tabelas para tempo real entre dispositivos
```

## Como executar

Requisitos: Node 20.19+ (ou 22.12+).

```bash
npm install            # instala o monorepo todo

# Web
npm run dev            # (ou npm run web) → http://localhost:5173
npm run web:build      # build de produção em apps/web/dist

# Mobile (Expo Go no telemóvel, ou emulador)
npm run mobile         # escaneie o QR com o Expo Go (câmara/QR requer dispositivo real)

# Testes e tipos
npm test               # 17 testes da lógica partilhada
npm run typecheck
```

- **Demo imediata:** na Web, o botão no topo alterna **Visão Cliente ↔ Painel Admin**. PIN: **`1234`**.
- **QR na mesa:** abra `http://localhost:5173/?mesa=7`. Na app mobile use o botão de QR (aceita `…?mesa=7`, `mesa:7` ou `7`).
- **Tempo real sem backend:** abra a Visão Cliente num separador e o Painel Admin noutro — os pedidos aparecem na Cozinha instantaneamente (BroadcastChannel).
- Os dados de demonstração (7 dias de histórico + 5 pedidos ativos) são gerados de forma determinística e atualizam-se com cada novo pedido.

## O que está implementado

**Cliente (Web + Mobile):** tema brasa (`#111111` / `#DC2626` / `#F59E0B`) · cardápio oficial de 30 itens em MT · carrossel de categorias · **Rei dos Molhos** (obrigatório em frangos, opcional em hambúrguer/sandes, + observações) · **upsell** (bebida / Pão Extra) · 3 modos (Mesa, Take-Away, Delivery com taxa automática por bairro) · checkout em 3 etapas · M-Pesa `857 483 457` / E-Mola `879 071 974` (titular Edmundo Mateus F.) com **copiar em 1 toque** e colar o **código SMS** · resumo por WhatsApp · rastreio ao vivo (Recebido → Na Grelha → Pronto/Em Entrega → Entregue) · Clube Fidelidade (5 pedidos entregues = 1 Refresco Txoti ou Sande de Queijo grátis, resgatável no carrinho).

**Responsivo:** mobile 320–480px (bottom tab bar, toques ≥44px) · tablet 768–1024px (grelha 2 colunas, KDS 2×2) · desktop 1280px+ (carrinho lateral fixo, KDS 4 colunas, dashboard com gráficos lado a lado).

**Equipa/Admin (Web):** KDS Kanban com cronómetro e alerta de atraso, molhos em destaque, som de novo pedido, **impressão de talão térmico (80mm)**, confirmação de pagamento · **Dashboard BI** (faturação, pedidos do dia, ticket médio, produto campeão, % digitais; área de faturação; top produtos; receita por categoria; donut M-Pesa/E-Mola/Cash/P.O.S; horas de pico 11h–03h; molhos; **Consultor Estratégico** com 3 ações geradas das métricas) · stock "Esgotado Hoje" em 1 toque, edição de preços, **combos promocionais** · taxas de entrega, PIN, exportação CSV.

**Mobile:** `SafeAreaView`, `FlatList` virtualizada, `expo-haptics`, `expo-camera` (QR), `expo-clipboard`, **Modo Equipa por PIN** (estafeta confirma entregas, liga ao cliente, abre o mapa; cozinha dá baixa rápida).

## Decisões a conhecer

- **"Dia de negócio" começa às 05:00**, porque o restaurante trabalha de madrugada: um pedido à 01:30 conta para o dia anterior.
- **Taxas de entrega** (60–120 MT por bairro) são valores de demonstração — edite em Admin › Config.
- O **Consultor Estratégico** é um motor de regras offline (`analytics.ts › buildInsights`). Pode trocar por um LLM mantendo o mesmo formato `Insight[]`.
- Selos de fidelidade são calculados pelo telemóvel do cliente e só contam pedidos **entregues**.

## Ligar a produção (tempo real entre dispositivos)

Por defeito cada dispositivo guarda os dados localmente (Web: `localStorage`; Mobile: `AsyncStorage`). Para a cozinha ver pedidos feitos no telemóvel dos clientes:

1. Crie um projeto Supabase e execute `supabase/schema.sql`.
2. `npm i @supabase/supabase-js` em `apps/web` e/ou `apps/mobile`.
3. Em `src/lib/store.ts` de cada app:
   ```ts
   import { createClient } from '@supabase/supabase-js';
   import { createSupabaseSync } from '@kota/shared';
   const sync = createSupabaseSync(createClient(URL, ANON_KEY));
   export const store = createKotaStore({ storage, sync });
   ```
   Para Firebase, implemente a interface `SyncAdapter` (`publish / subscribe / fetchInitial`).

⚠️ **Antes de usar com clientes reais:** o PIN `1234` e as políticas RLS abertas são **só para demonstração**. Valide o PIN e as ações da equipa no servidor (Supabase Auth / Edge Functions) e restrinja as políticas.
Os pagamentos M-Pesa/E-Mola são **manuais**: o cliente envia o dinheiro e cola o código SMS; a equipa confirma. Não há integração com a API de pagamentos.

## Notas técnicas

- React fixado em `19.3.0` via `overrides` na raiz (exigido pelo renderer do React Native 0.88; evita erro de versões diferentes entre `react` e `react-dom`).
- Web usa Tailwind 3.4; mobile usa NativeWind 4 (também Tailwind 3.4), com o mesmo esquema de cores.
- Ícones/splash do Expo são os do template: substitua `apps/mobile/assets/*` pela marca.
- As fontes (Inter/Oswald) vêm do Google Fonts; sem internet a web usa fontes do sistema.
