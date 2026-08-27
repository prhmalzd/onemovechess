# Collective UnconsChess architecture

## Single application

Collective UnconsChess is a single Next.js App Router application located in `apps/web` and deployed as one Vercel project. `npm run dev` starts one Next server, serving both pages and API Route Handlers.

```text
Browser
  ├─ Next pages: /, /play, /active-boards, /how-to-play, /options
  └─ Same-origin API: /api/v1/games/*
                         └─ Next Route Handlers
                              ├─ Supabase bearer-token verification
                              ├─ Zod request validation
                              └─ Prisma game service → Supabase PostgreSQL
```

The game API retains its `/api/v1/games` response and error contract. Browser code obtains an anonymous Supabase session and sends its access token as a bearer token; server code independently verifies it before accessing the database.

## Repository layout

```text
apps/web/
├─ app/                  # Next pages, layout, manifest, and API Route Handlers
├─ src/                  # Client feature components, providers, styles, API client
├─ server/               # Server-only auth, validation, Prisma, and game service
├─ prisma/schema.prisma  # Read-only mapping of existing Supabase tables
├─ public/               # Static icon and service worker
└─ tests/api/            # Route-handler and auth coverage
```

`packages/contracts` remains available for future shared transport types. There is no separate Fastify service, Vite server, or Vercel adapter.

## Environment and deployment

Configure these in `apps/web/.env.local` for local work and in Vercel for deployment:

```dotenv
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

The Supabase project URL and publishable key are intentionally shared by the browser and Route Handlers; they are public values. `DATABASE_URL` is server-only. The schema maps manually managed Supabase tables and must not be used to create migrations.

## PWA

Next supplies the web manifest at `/manifest.webmanifest`. The small service worker in `public/sw.js` caches visited GET requests and uses the homepage as an offline navigation fallback. It deliberately never caches API responses.
