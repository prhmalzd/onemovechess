-- Run this in the Supabase SQL editor before deploying notification support.

create table if not exists public.player_notifications (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  move_id uuid references public.moves(id) on delete cascade,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists player_notifications_player_created_at_idx
  on public.player_notifications (player_id, created_at desc);

alter table public.player_notifications enable row level security;
