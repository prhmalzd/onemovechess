import type { Game, PlayerId } from '@/features/game/model/game.types';

export type ParticipationFilter = 'all' | 'played' | 'not-played';
export type MoveBandFilter = 'any' | '1-10' | '11-30' | '31-60' | '61+';
export type DateFilter = 'any' | 'today' | '7-days' | '30-days';

export interface ActiveBoardFilters {
  participation: ParticipationFilter;
  moveBand: MoveBandFilter;
  playerMoveDate: DateFilter;
  activityDate: DateFilter;
}

function isInDateRange(value: string | undefined, filter: DateFilter, now: Date): boolean {
  if (filter === 'any') return true;
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  if (filter === 'today') return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  const days = filter === '7-days' ? 7 : 30;
  return date.getTime() >= now.getTime() - days * 24 * 60 * 60 * 1000 && date.getTime() <= now.getTime();
}

function inMoveBand(moveCount: number, filter: MoveBandFilter): boolean {
  if (filter === 'any') return true;
  if (filter === '1-10') return moveCount >= 1 && moveCount <= 10;
  if (filter === '11-30') return moveCount >= 11 && moveCount <= 30;
  if (filter === '31-60') return moveCount >= 31 && moveCount <= 60;
  return moveCount >= 61;
}

export function getPlayerLastMove(game: Game, playerId: PlayerId | undefined) {
  return game.moves.filter((move) => move.playerId === playerId).at(-1);
}

export function filterActiveBoards(games: Game[], filters: ActiveBoardFilters, playerId: PlayerId | undefined, now = new Date()): Game[] {
  return games
    .filter((game) => {
      const playerMove = getPlayerLastMove(game, playerId);
      const hasPlayed = Boolean(playerMove);
      return (filters.participation === 'all' || (filters.participation === 'played' ? hasPlayed : !hasPlayed))
        && inMoveBand(game.moves.length, filters.moveBand)
        && isInDateRange(playerMove?.createdAt, filters.playerMoveDate, now)
        && isInDateRange(game.updatedAt, filters.activityDate, now);
    })
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export type BoardRecency = 'fresh' | 'today' | 'older' | 'completed';

export function getBoardRecency(game: Game, now = new Date()): BoardRecency {
  if (game.status === 'completed') return 'completed';
  const age = now.getTime() - new Date(game.updatedAt).getTime();
  if (age <= 60 * 60 * 1000) return 'fresh';
  if (age <= 24 * 60 * 60 * 1000) return 'today';
  return 'older';
}
