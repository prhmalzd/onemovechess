export type PlayerBoardColor = 'white' | 'black';

export function boardTurnColor(fen: string): PlayerBoardColor {
  return fen.split(' ')[1] === 'w' ? 'white' : 'black';
}

export function canPlayAssignedColor(assignedColor: PlayerBoardColor | null, fen: string): boolean {
  return assignedColor === null || assignedColor === boardTurnColor(fen);
}
