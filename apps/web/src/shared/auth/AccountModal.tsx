import { useEffect, useState } from 'react';
import { useSupabaseAuth } from '@/app/providers/SupabaseAuthProvider';
import { getPasswordStrength, isValidUsername, normalizeUsername } from '@/shared/auth/username-credentials';

type Mode = 'create' | 'sign-in';
type CaptchaStage = 'start' | 'knight-selected' | 'complete';
type CaptchaChallenge = { puzzle: { piece: string; pieceName: string; from: string; to: string }; token: string };

const captchaSquares = ['a5', 'b5', 'c5', 'd5', 'e5', 'a4', 'b4', 'c4', 'd4', 'e4', 'a3', 'b3', 'c3', 'd3', 'e3', 'a2', 'b2', 'c2', 'd2', 'e2', 'a1', 'b1', 'c1', 'd1', 'e1'];

export function AccountModal({ allowSignIn, onClose, onAuthenticated, reason }: { allowSignIn: boolean; onClose: () => void; onAuthenticated?: () => void; reason?: 'board-limit' }) {
  const { createUsernameAccount, signInWithUsername } = useSupabaseAuth();
  const [mode, setMode] = useState<Mode>('create');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [captchaStage, setCaptchaStage] = useState<CaptchaStage>('start');
  const [captcha, setCaptcha] = useState<CaptchaChallenge | null>(null);
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalizedUsername = normalizeUsername(username);
  const isCreating = mode === 'create';
  const passwordStrength = getPasswordStrength(password);

  useEffect(() => {
    void fetch('/api/v1/auth/captcha')
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load chess check.');
        return response.json() as Promise<CaptchaChallenge>;
      })
      .then(setCaptcha)
      .catch((captchaError: unknown) => setError(captchaError instanceof Error ? captchaError.message : 'Could not load chess check.'))
      .finally(() => setIsCaptchaLoading(false));
  }, []);

  function chooseMode(nextMode: Mode): void {
    setMode(nextMode);
    setError(null);
  }

  function moveCaptcha(square: string): void {
    if (!captcha || captchaStage === 'complete') return;
    if (captchaStage === 'start' && square === captcha.puzzle.from) {
      setCaptchaStage('knight-selected');
      return;
    }
    if (captchaStage === 'knight-selected' && square === captcha.puzzle.to) {
      setCaptchaStage('complete');
      return;
    }
    setCaptchaStage('start');
  }

  async function submit(): Promise<void> {
    if (!isValidUsername(username)) {
      setError('Use 3–20 lowercase letters, numbers, or underscores for your username.');
      return;
    }
    if (!password) {
      setError('Enter a password.');
      return;
    }
    if (isCreating && password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    if (isCreating && (!captcha || captchaStage !== 'complete')) {
      setError('Complete the chess check and try again.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (isCreating && captcha) await createUsernameAccount({ username: normalizedUsername, password, captchaToken: captcha.token, captchaSolution: captcha.puzzle.to });
      else await signInWithUsername({ username: normalizedUsername, password });
      if (onAuthenticated) onAuthenticated();
      else onClose();
    } catch (authenticationError: unknown) {
      setError(authenticationError instanceof Error ? authenticationError.message : 'Authentication could not be completed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return <div aria-labelledby="account-title" aria-modal="true" className="modal-backdrop" role="dialog">
    <section className="save-progress-modal account-modal">
      <header className="account-modal-header"><p className="eyebrow">Keep playing</p><h2 id="account-title">{isCreating ? reason === 'board-limit' ? 'Create an account to play' : 'Save your progress' : 'Sign in'}</h2><p>{isCreating ? reason === 'board-limit' ? 'Guest players can play one board. Create an account to join another while keeping this player and its saved board.' : 'Create a username and password to keep your player, moves, and boards when you switch devices.' : 'Sign in to continue with your saved player.'}</p></header>
      <div className={isCreating ? 'account-modal-body' : 'account-modal-body account-modal-body--simple'}>
        <div>
          {allowSignIn && <div aria-label="Account action" className="account-mode-tabs"><button aria-pressed={isCreating} className={isCreating ? 'account-mode-tab account-mode-tab--active' : 'account-mode-tab'} onClick={() => chooseMode('create')} type="button">Create account</button><button aria-pressed={!isCreating} className={!isCreating ? 'account-mode-tab account-mode-tab--active' : 'account-mode-tab'} onClick={() => chooseMode('sign-in')} type="button">Sign in</button></div>}
          <div className="account-fields"><label className="account-field" htmlFor="account-username">Username<input autoCapitalize="none" autoComplete="username" id="account-username" maxLength={20} onChange={(event) => setUsername(event.target.value)} placeholder="chess_player" value={username} /></label><label className="account-field" htmlFor="account-password">Password<input autoComplete={isCreating ? 'new-password' : 'current-password'} id="account-password" onChange={(event) => setPassword(event.target.value)} type="password" value={password} /></label>{isCreating && <label className="account-field account-field--wide" htmlFor="account-password-confirm">Confirm password<input autoComplete="new-password" id="account-password-confirm" onChange={(event) => setConfirmPassword(event.target.value)} type="password" value={confirmPassword} /></label>}</div>
          {isCreating && <div aria-live="polite" className={`password-strength password-strength--${passwordStrength.label.toLowerCase()}`}><div aria-hidden="true" className="password-strength__bar">{Array.from({ length: 5 }, (_, index) => <i className={index < passwordStrength.score ? 'password-strength__segment password-strength__segment--filled' : 'password-strength__segment'} key={index} />)}</div><span>Password strength: {passwordStrength.label}</span></div>}
        </div>
        {isCreating && <aside className="chess-captcha"><strong>Quick chess check</strong>{isCaptchaLoading ? <p>Preparing puzzle…</p> : captcha ? <><p>Move the {captcha.puzzle.pieceName} from {captcha.puzzle.from} to {captcha.puzzle.to}.</p><div aria-label={`Move the ${captcha.puzzle.pieceName} to ${captcha.puzzle.to}`} className="captcha-board" role="grid">{captchaSquares.map((square, index) => { const pieceSquare = captchaStage === 'complete' ? captcha.puzzle.to : captcha.puzzle.from; const hasPiece = square === pieceSquare; const isTarget = square === captcha.puzzle.to; const isLight = (index % 5 + Math.floor(index / 5)) % 2 === 0; return <button aria-label={hasPiece ? `${captcha.puzzle.pieceName} on ${square}` : square} className={`${isLight ? 'captcha-square--light' : 'captcha-square--dark'} ${captchaStage === 'knight-selected' && square === captcha.puzzle.from ? 'captcha-square--selected' : ''} ${isTarget ? 'captcha-square--target' : ''}`} key={square} onClick={() => moveCaptcha(square)} role="gridcell" type="button">{hasPiece ? captcha.puzzle.piece : ''}</button>; })}</div>{captchaStage === 'complete' && <p className="captcha-success">Piece moved — nice.</p>}</> : <p>Could not load a puzzle. Please close and try again.</p>}</aside>}
      </div>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <footer className="account-actions"><button className="account-submit" disabled={isSubmitting} onClick={() => { void submit(); }} type="button">{isSubmitting ? 'Saving…' : isCreating ? 'Create account' : 'Sign in'}</button><button className="dismiss-auth" disabled={isSubmitting} onClick={onClose} type="button">Not now</button></footer>
    </section>
  </div>;
}
