import type { PlayerId } from '@/features/game/model/game.types';

const PLAYER_ID_KEY = 'one-move-chess.player-id';

export function getCurrentPlayerId(): PlayerId {
  const existingId = window.localStorage.getItem(PLAYER_ID_KEY);
  if (existingId) return existingId;

  const playerId = crypto.randomUUID();
  window.localStorage.setItem(PLAYER_ID_KEY, playerId);
  return playerId;
}
