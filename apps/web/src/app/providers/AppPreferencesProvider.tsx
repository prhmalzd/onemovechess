'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type BoardThemeId = 'classic' | 'ocean' | 'forest' | 'slate';
export type PieceStyleId = 'classic' | 'monochrome';

export const boardThemes: Record<BoardThemeId, { name: string; light: string; dark: string }> = {
  classic: { name: 'Classic', light: '#e6d4ae', dark: '#806849' },
  ocean: { name: 'Ocean', light: '#c8dbe3', dark: '#4e7585' },
  forest: { name: 'Forest', light: '#d6ddbd', dark: '#58734f' },
  slate: { name: 'Slate', light: '#d3d6db', dark: '#5b6470' },
};

type StoredPreferences = {
  boardTheme: BoardThemeId;
  pieceStyle: PieceStyleId;
};

type AppPreferences = StoredPreferences & {
  setBoardTheme: (theme: BoardThemeId) => void;
  setPieceStyle: (style: PieceStyleId) => void;
};

const STORAGE_KEY = 'one-move-chess.preferences';
const defaultPreferences: StoredPreferences = { boardTheme: 'classic', pieceStyle: 'classic' };
const AppPreferencesContext = createContext<AppPreferences | null>(null);

function loadPreferences(): StoredPreferences {
  if (typeof window === 'undefined') return defaultPreferences;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<StoredPreferences>;
    return {
      boardTheme: saved.boardTheme && saved.boardTheme in boardThemes ? saved.boardTheme : 'classic',
      pieceStyle: saved.pieceStyle === 'monochrome' ? 'monochrome' : 'classic',
    };
  } catch {
    return defaultPreferences;
  }
}

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<StoredPreferences>(defaultPreferences);

  useEffect(() => { setPreferences(loadPreferences()); }, []);

  function update(next: StoredPreferences) {
    setPreferences(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return <AppPreferencesContext.Provider value={{
    ...preferences,
    setBoardTheme: (boardTheme) => update({ ...preferences, boardTheme }),
    setPieceStyle: (pieceStyle) => update({ ...preferences, pieceStyle }),
  }}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences(): AppPreferences {
  const preferences = useContext(AppPreferencesContext);
  if (!preferences) throw new Error('useAppPreferences must be used within AppPreferencesProvider');
  return preferences;
}
