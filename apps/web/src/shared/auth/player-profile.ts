import type { User } from '@supabase/supabase-js';

export const profilePieces = [
  { id: 'p', label: 'Pawn', symbol: '♟' },
  { id: 'n', label: 'Knight', symbol: '♞' },
  { id: 'b', label: 'Bishop', symbol: '♝' },
  { id: 'r', label: 'Rook', symbol: '♜' },
  { id: 'q', label: 'Queen', symbol: '♛' },
  { id: 'k', label: 'King', symbol: '♚' },
] as const;

export const profileColors = [
  { id: 'gold', label: 'Gold', value: '#c8aa6e' },
  { id: 'ocean', label: 'Ocean', value: '#4e9eb3' },
  { id: 'rose', label: 'Rose', value: '#bd6b7a' },
  { id: 'forest', label: 'Forest', value: '#5f9c70' },
] as const;

export type ProfilePieceId = (typeof profilePieces)[number]['id'];
export type ProfileColorId = (typeof profileColors)[number]['id'];

export type PlayerProfile = {
  displayName: string;
  piece: ProfilePieceId;
  color: ProfileColorId;
};

function isProfilePiece(value: unknown): value is ProfilePieceId {
  return profilePieces.some((piece) => piece.id === value);
}

function isProfileColor(value: unknown): value is ProfileColorId {
  return profileColors.some((color) => color.id === value);
}

export function getPlayerProfile(user: User | null): PlayerProfile {
  const metadata = user?.user_metadata ?? {};
  const displayName = typeof metadata.display_name === 'string' && metadata.display_name.trim()
    ? metadata.display_name.trim()
    : typeof metadata.full_name === 'string' && metadata.full_name.trim()
      ? metadata.full_name.trim()
      : user?.email?.split('@')[0] ?? 'Player';

  return {
    displayName,
    piece: isProfilePiece(metadata.profile_piece) ? metadata.profile_piece : 'n',
    color: isProfileColor(metadata.profile_color) ? metadata.profile_color : 'gold',
  };
}
