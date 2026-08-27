-- Run this once in the Supabase SQL Editor before deploying the matching app code.
-- Each participant is permanently assigned the color from their first move in a board.

alter table public.game_participants
  add column if not exists assigned_color text;

update public.game_participants as participant
set assigned_color = first_move.color
from (
  select distinct on (game_id, player_id) game_id, player_id, color
  from public.moves
  order by game_id, player_id, ply asc
) as first_move
where participant.game_id = first_move.game_id
  and participant.player_id = first_move.player_id
  and participant.assigned_color is null;

alter table public.game_participants
  drop constraint if exists game_participants_assigned_color_check;

alter table public.game_participants
  add constraint game_participants_assigned_color_check
  check (assigned_color is null or assigned_color in ('white', 'black'));
