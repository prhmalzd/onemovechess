-- Run this in the Supabase SQL editor before deploying this version.
-- Prisma only maps these Supabase-managed tables; it does not create them.

create table if not exists public.board_watches (
  player_id uuid not null references public.players(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (player_id, game_id)
);

create index if not exists board_watches_player_id_idx on public.board_watches (player_id);

-- The app accesses watches through authenticated Next.js route handlers and
-- Prisma, never directly from the browser through Supabase's data API.
alter table public.board_watches enable row level security;
