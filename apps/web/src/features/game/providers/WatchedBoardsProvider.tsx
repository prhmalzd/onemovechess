'use client';

import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { useSupabaseAuth } from '@/app/providers/SupabaseAuthProvider';
import { gameApiRepository } from '@/features/game/api/game-api-repository';
import { findWatchedBoardAlerts, type BoardWatchAlert } from './watched-board-alerts';

const OPEN_BOARD_KEY = 'one-move-chess.open-watched-board';

export function WatchedBoardsProvider({ children }: PropsWithChildren) {
  const { session, isAnonymous } = useSupabaseAuth();
  const baseline = useRef<Map<string, number>>(new Map());
  const hasEstablishedBaseline = useRef(false);
  const [alert, setAlert] = useState<BoardWatchAlert | null>(null);

  useEffect(() => {
    const accessToken = session?.access_token;
    const playerId = session?.user.id;
    baseline.current = new Map();
    hasEstablishedBaseline.current = false;
    setAlert(null);
    if (!accessToken || !playerId || isAnonymous) return;

    let isCurrent = true;
    const refresh = async () => {
      try {
        const watchedBoards = await gameApiRepository.getWatchedBoards(accessToken);
        if (!isCurrent) return;
        if (!hasEstablishedBaseline.current) {
          baseline.current = new Map(watchedBoards.map((game) => [game.id, game.currentPly]));
          hasEstablishedBaseline.current = true;
          return;
        }
        const alerts = findWatchedBoardAlerts(baseline.current, watchedBoards, playerId);
        const currentIds = new Set(watchedBoards.map((game) => game.id));
        for (const gameId of baseline.current.keys()) if (!currentIds.has(gameId)) baseline.current.delete(gameId);
        if (alerts[0]) setAlert(alerts[0]);
      } catch {
        // A transient polling failure should not interrupt play or show an alert.
      }
    };

    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 5000);
    return () => { isCurrent = false; window.clearInterval(timer); };
  }, [isAnonymous, session?.access_token, session?.user.id]);

  function openAlertBoard(): void {
    if (!alert) return;
    window.sessionStorage.setItem(OPEN_BOARD_KEY, alert.gameId);
    window.location.assign('/active-boards');
  }

  return <>{children}{alert && <aside aria-live="polite" className="board-watch-toast" role="status"><button className="board-watch-toast__open" onClick={openAlertBoard} type="button"><strong>{alert.boardLabel} advanced</strong><span>Another player made {alert.moveLabel}. Open the latest position.</span></button><button aria-label="Dismiss board update" className="board-watch-toast__dismiss" onClick={() => setAlert(null)} type="button">×</button></aside>}</>;
}

export { OPEN_BOARD_KEY };
