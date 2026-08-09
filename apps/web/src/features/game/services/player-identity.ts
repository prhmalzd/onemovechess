import type { PlayerId } from '@/features/game/model/game.types';

const PLAYER_ID_KEY = 'one-move-chess.player-id';
const PLAYER_NAME_KEY = 'one-move-chess.player-name';

const GUEST_TITLES = [
  'Silent Knight',
  'Blue Bishop',
  'Random Pawn',
  'Golden Rook',
  'Clever Queen',
  'Steady King',
];

export interface AnonymousPlayer {
  id: PlayerId;
  displayName: string;
}

export function getAnonymousPlayer(): AnonymousPlayer {
  let id = window.localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(PLAYER_ID_KEY, id);
  }

  let displayName = window.localStorage.getItem(PLAYER_NAME_KEY);
  if (!displayName) {
    const title = GUEST_TITLES[Math.floor(Math.random() * GUEST_TITLES.length)] ?? 'Guest';
    const shortId = id.replaceAll('-', '').slice(0, 4).toUpperCase();
    displayName = `${title} #${shortId}`;
    window.localStorage.setItem(PLAYER_NAME_KEY, displayName);
  }

  return { id, displayName };
}

export function getCurrentPlayerId(): PlayerId {
  return getAnonymousPlayer().id;
}
