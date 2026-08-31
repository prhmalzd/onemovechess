import type { Game, PlayerId } from '@/features/game/model/game.types';

export interface BoardWatchAlert {
  gameId: string;
  boardLabel: string;
  moveLabel: string;
}

export function findWatchedBoardAlerts(previousPly: Map<string, number>, games: Game[], playerId: PlayerId | undefined): BoardWatchAlert[] {
  const alerts: BoardWatchAlert[] = [];
  for (const game of games) {
    const priorPly = previousPly.get(game.id);
    const latestMove = game.moves.at(-1);
    if (priorPly !== undefined && latestMove && game.currentPly > priorPly && latestMove.playerId !== playerId) {
      alerts.push({ gameId: game.id, boardLabel: `Board ${game.id.slice(-5)}`, moveLabel: `${latestMove.ply}. ${latestMove.san}` });
    }
    previousPly.set(game.id, game.currentPly);
  }
  return alerts;
}
