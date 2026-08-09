export type GameId = string;
export type PlayerId = string;
export type GameStatus = 'active' | 'completed';
export type ParticipantStatus = 'active' | 'moved' | 'timed_out';

export interface MoveRecord {
  id: string;
  ply: number;
  playerId: PlayerId;
  from: string;
  to: string;
  promotion?: string;
  san: string;
  color: 'white' | 'black';
  fenAfter: string;
  createdAt: string;
}

export interface GameParticipant {
  playerId: PlayerId;
  status: ParticipantStatus;
  lastMovePly: number | null;
  joinedAt: string;
  timedOutAt: string | null;
}

export interface MoveReservation {
  playerId: PlayerId;
  reservedAt: string;
  expiresAt: string;
}

export interface Game {
  id: GameId;
  creatorId: PlayerId;
  status: GameStatus;
  startingFen: string;
  currentFen: string;
  moveDistance: number;
  moves: MoveRecord[];
  participants: GameParticipant[];
  reservation: MoveReservation | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlaySession {
  game: Game;
  reservation: MoveReservation;
}
