import { useState } from 'react';
import { useSupabaseAuth } from '@/app/providers/SupabaseAuthProvider';
import { isStrongPassword, isValidUsername, normalizeUsername, passwordRequirementLabels } from '@/shared/auth/username-credentials';

type Mode = 'create' | 'sign-in';
type CaptchaStage = 'start' | 'knight-selected' | 'complete';
const captchaSquares = ['a5', 'b5', 'c5', 'd5', 'e5', 'a4', 'b4', 'c4', 'd4', 'e4', 'a3', 'b3', 'c3', 'd3', 'e3', 'a2', 'b2', 'c2', 'd2', 'e2', 'a1', 'b1', 'c1', 'd1', 'e1'];

export function AccountModal({ allowSignIn, onClose }: { allowSignIn: boolean; onClose: () => void }) {
  const { createUsernameAccount, signInWithUsername } = useSupabaseAuth();
  const [mode, setMode] = useState<Mode>('create');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [captchaStage, setCaptchaStage] = useState<CaptchaStage>('start');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalizedUsername = normalizeUsername(username);
  const isCreating = mode === 'create';

  function chooseMode(nextMode: Mode): void {
    setMode(nextMode);
    setError(null);
  }

  function moveCaptcha(square: string): void {
    if (captchaStage === 'complete') return;
    if (captchaStage === 'start' && square === 'd3') {
      setCaptchaStage('knight-selected');
      return;
    }
    if (captchaStage === 'knight-selected' && square === 'b4') {
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
    if (!isStrongPassword(password)) {
      setError('Choose a stronger password that meets every requirement.');
      return;
    }
    if (isCreating && password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    if (isCreating && captchaStage !== 'complete') {
      setError('Complete the knight move before creating your account.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (isCreating) await createUsernameAccount({ username: normalizedUsername, password, captchaSolution: 'b4' });
      else await signInWithUsername({ username: normalizedUsername, password });
      onClose();
    } catch (authenticationError: unknown) {
      setError(authenticationError instanceof Error ? authenticationError.message : 'Authentication could not be completed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return <div aria-labelledby="account-title" aria-modal="true" className="modal-backdrop" role="dialog">
    <section className="save-progress-modal account-modal">
      <header className="account-modal-header"><p className="eyebrow">Keep playing</p><h2 id="account-title">{isCreating ? 'Save your progress' : 'Sign in'}</h2><p>{isCreating ? 'Create a username and password to keep this player, its moves, and its boards when you switch devices.' : 'Sign in to continue with your saved player.'}</p></header>
      <div className={isCreating ? 'account-modal-body' : 'account-modal-body account-modal-body--simple'}>
        <div>
          {allowSignIn && <div aria-label="Account action" className="account-mode-tabs"><button aria-pressed={isCreating} className={isCreating ? 'account-mode-tab account-mode-tab--active' : 'account-mode-tab'} onClick={() => chooseMode('create')} type="button">Create account</button><button aria-pressed={!isCreating} className={!isCreating ? 'account-mode-tab account-mode-tab--active' : 'account-mode-tab'} onClick={() => chooseMode('sign-in')} type="button">Sign in</button></div>}
          <div className="account-fields"><label className="account-field" htmlFor="account-username">Username<input autoCapitalize="none" autoComplete="username" id="account-username" maxLength={20} onChange={(event) => setUsername(event.target.value)} placeholder="chess_player" value={username} /></label><label className="account-field" htmlFor="account-password">Password<input autoComplete={isCreating ? 'new-password' : 'current-password'} id="account-password" onChange={(event) => setPassword(event.target.value)} type="password" value={password} /></label>{isCreating && <label className="account-field account-field--wide" htmlFor="account-password-confirm">Confirm password<input autoComplete="new-password" id="account-password-confirm" onChange={(event) => setConfirmPassword(event.target.value)} type="password" value={confirmPassword} /></label>}</div>
          {isCreating && <ul className="password-rules">{passwordRequirementLabels.map((rule) => <li className={isStrongPassword(password) ? 'password-rule--met' : ''} key={rule}>{rule}</li>)}</ul>}
        </div>
        {isCreating && <aside className="chess-captcha"><strong>Quick chess check</strong><p>Move the knight from d3 to b4.</p><div aria-label="Move the knight to b4" className="captcha-board" role="grid">{captchaSquares.map((square, index) => { const hasKnight = square === 'd3' && captchaStage !== 'complete'; const isTarget = square === 'b4'; const isLight = (index % 5 + Math.floor(index / 5)) % 2 === 0; return <button aria-label={hasKnight ? 'Knight on d3' : square} className={`${isLight ? 'captcha-square--light' : 'captcha-square--dark'} ${captchaStage === 'knight-selected' && square === 'd3' ? 'captcha-square--selected' : ''} ${isTarget ? 'captcha-square--target' : ''}`} key={square} onClick={() => moveCaptcha(square)} role="gridcell" type="button">{hasKnight ? '♞' : ''}</button>; })}</div>{captchaStage === 'complete' && <p className="captcha-success">Knight moved — nice.</p>}</aside>}
      </div>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <footer className="account-actions"><button className="account-submit" disabled={isSubmitting} onClick={() => { void submit(); }} type="button">{isSubmitting ? 'Saving…' : isCreating ? 'Create account' : 'Sign in'}</button><button className="dismiss-auth" disabled={isSubmitting} onClick={onClose} type="button">Not now</button></footer>
    </section>
  </div>;
}
