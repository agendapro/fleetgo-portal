# FleetGo Portal del Dueño · Next.js (bolt.new ready)

Port a TypeScript/Next.js del prototipo Python del caso de estudio FleetGo. Listo para correr en **bolt.new**, StackBlitz, Vercel, Cloudflare Pages o cualquier host de Next.js.

## Cómo desplegar en bolt.new

Tres opciones, de menor a mayor fricción:

### Opción A · Pegar carpeta directo en bolt.new (más rápido)

1. Abre <https://bolt.new>.
2. Clic en **"Open project"** / arrastra esta carpeta (`bolt/`) entera al chat.
3. Bolt detecta el `package.json`, corre `npm install && npm run dev` automático.
4. Abre la preview que aparece a la derecha → ya está corriendo.

### Opción B · Vía GitHub

1. Sube esta carpeta a un repo público (puede ser solo el contenido de `bolt/`, no toda la monorepo).
2. Abre `https://bolt.new/~/github.com/TU_USER/TU_REPO`.
3. Mismo flujo: bolt clona, instala, ejecuta.

### Opción C · StackBlitz directo

`https://stackblitz.com/github/TU_USER/TU_REPO?file=app/page.tsx`

## API key del asistente IA (opcional)

Sin key, el asistente igual responde — usa routing por keyword sobre el FAQ + datos del dueño. Si quieres modo Claude live en bolt:

1. Crea un archivo `.env.local` en la raíz (al lado de `package.json`).
2. Pega:
   ```
   ANTHROPIC_API_KEY=sk-ant-…
   ```
3. Reinicia el dev server (botón Restart en bolt).

> En Vercel / Cloudflare: agrega `ANTHROPIC_API_KEY` en Environment Variables del proyecto.

## Cómo correr localmente

```bash
npm install
npm run dev
# abre http://localhost:3000
```

Build de producción:

```bash
npm run build
npm start
```

## Estructura

```
.
├── app/
│   ├── layout.tsx              # shell global, dark mode
│   ├── page.tsx                # landing: selector de dueño
│   ├── globals.css             # Tailwind base + body bg
│   ├── owners/[id]/
│   │   ├── page.tsx            # Server Component: carga datos + statement
│   │   └── OwnerDashboard.tsx  # Client Component: tabs interactivas
│   └── api/assistant/route.ts  # POST /api/assistant
├── components/
│   ├── Assistant.tsx           # chat con sugerencias, llama a /api
│   └── WeeklyBars.tsx          # barras SVG-free de ingreso semanal
├── lib/
│   ├── types.ts                # Reserva, Vehiculo, Dueno, Statement, etc.
│   ├── data.ts                 # papaparse de los CSVs (cache en memoria)
│   ├── statements.ts           # liquidación quincenal con reglas del FAQ
│   ├── alerts.ts               # detección de incidentes recientes
│   ├── notifications.ts        # formato email/WhatsApp
│   ├── assistant.ts            # Claude live + fallback local determinístico
│   ├── faq.ts                  # parser del FAQ por sección H3
│   └── format.ts               # CLP, fechas
├── public/data/                # 5 CSVs + faq.md (los datos del caso)
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.mjs
```

## Lo que se preserva del backend Python

- Misma lógica de quincena (1-15 y 16-fin de mes; pagos día 15 y último día hábil).
- Mismo cálculo de comisión por plan (25/20/17%).
- Mismo tratamiento de incidentes: `reclamo_cliente` resta al dueño, el resto suma.
- Misma severidad por tipo de incidente.
- Mismo routing por keyword del asistente local.
- Misma estructura del prompt de Claude (anti-alucinación, citas obligatorias).

Validado contra los CSVs: para D022 (Trinidad Pinto, ref 2026-05-10) calcula **$1.996.201** netos sobre **10 reservas**, idéntico al output Python.

## Rutas

| Ruta | Descripción |
|---|---|
| `/` | Landing — selector de 30 dueños |
| `/owners/[id]?ref=YYYY-MM-DD` | Dashboard del dueño (5 tabs) |
| `POST /api/assistant` | `{dueno_id, question, reference, force_local?}` → `{text, sources, mode}` |

## Stack & justificación

| Pieza | Por qué |
|---|---|
| Next.js 14 App Router | Server Components leen CSV sin JS de cliente; bolt.new lo corre nativo. |
| TypeScript estricto | Tipos compartidos `lib/types.ts` entre servidor y cliente. |
| Tailwind CSS | Sin librería de componentes — minimiza deps en WebContainer. |
| Papaparse | Parser de CSV ligero, funciona en Node y browser. |
| @anthropic-ai/sdk | Llamada a Claude Haiku 4.5 desde la API route. |

Sin Recharts/Chart.js: las barras semanales son `<div>` con ancho proporcional. Cero deps gráficas.
