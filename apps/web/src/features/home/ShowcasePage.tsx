import { useEffect, useState } from 'react';
import { Chessboard, type SquareRenderer } from 'react-chessboard';
import { useSupabaseAuth } from '@/app/providers/SupabaseAuthProvider';
import { boardThemes, useAppPreferences } from '@/app/providers/AppPreferencesProvider';
import { BoardPositionSquare, getBoardPositionState } from '@/features/game/components/board-position-state';

type AppPath = '/' | '/play' | '/active-boards' | '/how-to-play' | '/options' | '/showcase';

const positions = [
  { title: 'Check', description: 'The checked king is given a soft red square highlight.', fen: '4k3/8/8/8/8/8/8/4R1K1 b - - 0 1' },
  { title: 'Checkmate', description: 'The losing king turns and the winning king receives a gold marker.', fen: '7k/6Q1/6K1/8/8/8/8/8 b - - 0 1' },
  { title: 'Stalemate', description: 'Both kings receive a half-point draw marker.', fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1' },
] as const;

function PositionSample({ title, description, fen }: (typeof positions)[number]) {
  const { boardTheme } = useAppPreferences();
  const theme = boardThemes[boardTheme];
  const state = getBoardPositionState(fen);
  const squareRenderer: SquareRenderer = ({ children, square }) => <BoardPositionSquare square={square} state={state}>{children}</BoardPositionSquare>;
  return <article className="showcase-card"><div><p className="card-meta">Position state</p><h2>{title}</h2><p>{description}</p></div><div className="showcase-board chessboard--locked"><Chessboard options={{ id: `showcase-${title}`, position: fen, allowDragging: false, showNotation: false, darkSquareStyle: { backgroundColor: theme.dark }, lightSquareStyle: { backgroundColor: theme.light }, squareRenderer }} /></div></article>;
}

export function ShowcasePage({ onNavigate }: { onNavigate: (path: AppPath) => void }) {
  const { session, status } = useSupabaseAuth();
  const [access, setAccess] = useState<'checking' | 'allowed' | 'denied'>('checking');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.access_token) {
      setAccess('denied');
      return;
    }
    void fetch('/api/v1/showcase/access', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((response) => setAccess(response.ok ? 'allowed' : 'denied'))
      .catch(() => setAccess('denied'));
  }, [session?.access_token, status]);

  if (status === 'loading' || access === 'checking') return <main className="page-shell"><p>Checking preview access…</p></main>;
  if (access === 'denied') return <main className="page-shell"><h1>Preview unavailable</h1><p className="muted">This visual preview is only available to the configured account.</p></main>;

  return <main className="page-shell"><header className="page-header"><button className="back-link" onClick={() => onNavigate('/')} type="button">← Menu</button><div><p className="eyebrow">Private preview</p><h1>Visual showcase</h1></div></header><section className="showcase-grid">{positions.map((position) => <PositionSample key={position.title} {...position} />)}</section><section className="showcase-ui"><div><p className="card-meta">Board picker</p><h2>Available boards</h2><button className="random-board-button" type="button">♞ Choose a random board</button><div className="available-boards__list"><div className="available-board"><span className="available-board__number">01</span><span><strong>White to move</strong><small>Move 24 · 7 players</small></span></div><div className="available-board"><span className="available-board__number">02</span><span><strong>Black to move</strong><small>Move 31 · 10 players</small></span></div></div></div><div><p className="card-meta">Account creation</p><h2>Password strength</h2><div className="password-strength password-strength--strong"><div aria-hidden="true" className="password-strength__bar"><i className="password-strength__segment password-strength__segment--filled" /><i className="password-strength__segment password-strength__segment--filled" /><i className="password-strength__segment password-strength__segment--filled" /><i className="password-strength__segment password-strength__segment--filled" /><i className="password-strength__segment password-strength__segment--filled" /></div><span>Password strength: Strong</span></div><p className="muted">The account form also includes the randomized chess check.</p></div></section></main>;
}
