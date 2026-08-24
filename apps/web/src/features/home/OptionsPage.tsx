import { boardThemes, type BoardThemeId, type PieceStyleId, useAppPreferences } from '@/app/providers/AppPreferencesProvider';

type AppPath = '/' | '/play' | '/active-boards' | '/how-to-play' | '/options';

export function OptionsPage({ onNavigate }: { onNavigate: (path: AppPath) => void }) {
  const { boardTheme, pieceStyle, setBoardTheme, setPieceStyle } = useAppPreferences();

  return <main className="page-shell">
    <header className="page-header"><button className="back-link" onClick={() => onNavigate('/')} type="button">← Menu</button><div><p className="eyebrow">Personalize</p><h1>Options</h1></div></header>
    <section className="options-content">
      <div className="option-group"><h2>Board color</h2><div className="option-grid">{(Object.keys(boardThemes) as BoardThemeId[]).map((themeId) => {
        const theme = boardThemes[themeId];
        return <button aria-pressed={boardTheme === themeId} className={`theme-option ${boardTheme === themeId ? 'theme-option--selected' : ''}`} key={themeId} onClick={() => setBoardTheme(themeId)} type="button"><span className="theme-swatch" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <i key={index} style={{ background: index % 2 === 0 ? theme.light : theme.dark }} />)}</span><span>{theme.name}</span></button>;
      })}</div></div>
      <div className="option-group"><h2>Pieces</h2><div className="option-grid">{([{ id: 'classic', name: 'Classic', description: 'Standard full-color pieces.' }, { id: 'monochrome', name: 'Monochrome', description: 'A clean black-and-white look.' }] as { id: PieceStyleId; name: string; description: string }[]).map((style) => <button aria-pressed={pieceStyle === style.id} className={`piece-option ${pieceStyle === style.id ? 'piece-option--selected' : ''}`} key={style.id} onClick={() => setPieceStyle(style.id)} type="button"><span className={`piece-preview ${style.id === 'monochrome' ? 'piece-style--monochrome' : ''}`} aria-hidden="true">♞ ♕</span><span><strong>{style.name}</strong><small>{style.description}</small></span></button>)}</div></div>
    </section>
  </main>;
}
