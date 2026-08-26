import { useState } from 'react';
import { useSupabaseAuth } from '@/app/providers/SupabaseAuthProvider';

export function SaveProgressModal({ onClose }: { onClose: () => void }) {
  const { linkGoogleIdentity } = useSupabaseAuth();
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveWithGoogle(): Promise<void> {
    setIsLinking(true);
    setError(null);
    try {
      await linkGoogleIdentity();
    } catch (authenticationError: unknown) {
      setError(authenticationError instanceof Error ? authenticationError.message : 'Google sign-in could not be started.');
      setIsLinking(false);
    }
  }

  return <div aria-labelledby="save-progress-title" aria-modal="true" className="modal-backdrop" role="dialog">
    <section className="save-progress-modal">
      <p className="eyebrow">Keep playing</p>
      <h2 id="save-progress-title">Save your progress</h2>
      <p>Your move and board history are currently tied to this device. Link Google to keep them when you switch devices.</p>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="google-sign-in" disabled={isLinking} onClick={() => { void saveWithGoogle(); }} type="button">
        <span aria-hidden="true" className="google-mark">G</span>{isLinking ? 'Opening Google…' : 'Continue with Google'}
      </button>
      <button className="dismiss-auth" disabled={isLinking} onClick={onClose} type="button">Not now</button>
    </section>
  </div>;
}
