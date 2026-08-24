type AppPath = '/' | '/play' | '/active-boards' | '/how-to-play' | '/options';

export function HowToPlayPage({ onNavigate }: { onNavigate: (path: AppPath) => void }) {
  return <main className="page-shell">
    <header className="page-header"><button className="back-link" onClick={() => onNavigate('/')} type="button">← Menu</button><div><p className="eyebrow">The idea</p><h1>How to play</h1></div></header>
    <section className="info-card">
      <p className="info-lede">One shared chess game. One legal move from each player.</p>
      <ol className="how-to-play-list">
        <li><strong>Choose Play.</strong><span>You will join a board that needs a player, or start a fresh one.</span></li>
        <li><strong>Make one legal move.</strong><span>You have five minutes after a board is assigned to you.</span></li>
        <li><strong>Watch the game grow.</strong><span>After your move, the board stays read-only until enough other moves have passed.</span></li>
        <li><strong>Follow your boards.</strong><span>Use Active boards from the menu to see their latest position.</span></li>
      </ol>
      <p className="muted">Standard chess rules always apply. A move is only saved when it is legal.</p>
    </section>
  </main>;
}
