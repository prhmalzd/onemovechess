export type GameId = string;
export type PlayerId = string;
export type GameStatus = 'active' | 'completed';
export type ParticipantStatus = 'active' | 'moved' | 'timed_out';

export interface MoveRecord {
  id: string;
  ply: number;
  playerId: PlayerId;
  playerName: string;
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
  playerName: string;
  status: ParticipantStatus;
  lastMovePly: number | null;
  assignedColor: 'white' | 'black' | null;
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
  currentPly: number;
  moveDistance: number;
  version: number;
  moves: MoveRecord[];
  participants: GameParticipant[];
  reservation: MoveReservation | null;
  isWatched?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlaySession {
  game: Game;
  reservation: MoveReservation;
}

export interface AvailableBoard {
  id: GameId;
  currentFen: string;
  currentPly: number;
  playerCount: number;
  updatedAt: string;
}

export interface AvailableBoardsPage {
  boards: AvailableBoard[];
  nextOffset: number | null;
}

export interface PlayerNotification {
  id: string;
  gameId: GameId;
  moveId: string | null;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsPage {
  notifications: PlayerNotification[];
  unreadCount: number;
}
