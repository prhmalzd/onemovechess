-- Run this in the Supabase SQL editor before deploying chess analysis.

create table if not exists public.game_analyses (
  id uuid primary key default gen_random_uuid(), game_id uuid not null references public.games(id) on delete cascade,
  requested_by_id uuid not null references public.players(id) on delete cascade, status text not null default 'pending',
  analysis_kind text not null default 'basic', engine_version text not null, depth integer not null,
  error_message text, created_at timestamptz not null default now(), completed_at timestamptz,
  unique (game_id, analysis_kind, engine_version, depth)
);
create table if not exists public.move_analyses (
  id uuid primary key default gen_random_uuid(), analysis_id uuid not null references public.game_analyses(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade, move_id uuid not null references public.moves(id) on delete cascade,
  ply integer not null, player_id uuid not null references public.players(id) on delete cascade, fen_before text not null, fen_after text not null,
  played_move text not null, best_move text not null, principal_variation jsonb not null, evaluation_before double precision not null,
  evaluation_after double precision not null, impact double precision not null, classification text not null, depth integer not null,
  created_at timestamptz not null default now(), unique (analysis_id, move_id)
);
create table if not exists public.analysis_entitlements (
  player_id uuid primary key references public.players(id) on delete cascade, basic_analysis_used boolean not null default false,
  deep_analysis_credits integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists game_analyses_game_id_idx on public.game_analyses(game_id);
create index if not exists move_analyses_game_id_ply_idx on public.move_analyses(game_id, ply);
create index if not exists move_analyses_player_id_idx on public.move_analyses(player_id);
alter table public.game_analyses enable row level security;
alter table public.move_analyses enable row level security;
alter table public.analysis_entitlements enable row level security;
