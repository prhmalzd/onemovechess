import { useEffect, useState } from 'react';
import { boardThemes, type BoardThemeId, type PieceStyleId, useAppPreferences } from '@/app/providers/AppPreferencesProvider';
import { useSupabaseAuth } from '@/app/providers/SupabaseAuthProvider';
import { getPlayerProfile, profileColors, profilePieces, type ProfileColorId, type ProfilePieceId } from '@/shared/auth/player-profile';

type AppPath = '/' | '/play' | '/active-boards' | '/how-to-play' | '/options';

export function OptionsPage({ onNavigate }: { onNavigate: (path: AppPath) => void }) {
  const { boardTheme, pieceStyle, setBoardTheme, setPieceStyle } = useAppPreferences();
  const { user, isAnonymous, signOut, updatePlayerProfile } = useSupabaseAuth();
  const currentProfile = getPlayerProfile(user);
  const [displayName, setDisplayName] = useState(currentProfile.displayName);
  const [profilePiece, setProfilePiece] = useState<ProfilePieceId>(currentProfile.piece);
  const [profileColor, setProfileColor] = useState<ProfileColorId>(currentProfile.color);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(currentProfile.displayName);
    setProfilePiece(currentProfile.piece);
    setProfileColor(currentProfile.color);
  }, [currentProfile.color, currentProfile.displayName, currentProfile.piece]);

  async function saveProfile(): Promise<void> {
    const name = displayName.trim();
    if (!name) {
      setProfileStatus('Choose a display name first.');
      return;
    }
    setProfileStatus(null);
    try {
      await updatePlayerProfile({ displayName: name.slice(0, 24), piece: profilePiece, color: profileColor });
      setProfileStatus('Profile saved.');
    } catch {
      setProfileStatus('Your profile could not be saved. Please try again.');
    }
  }

  async function leaveAccount(): Promise<void> {
    setProfileStatus(null);
    try {
      await signOut();
      onNavigate('/');
    } catch {
      setProfileStatus('Sign out could not be completed. Please try again.');
    }
  }

  return <main className="page-shell">
    <header className="page-header"><button className="back-link" onClick={() => onNavigate('/')} type="button">← Menu</button><div><p className="eyebrow">Personalize</p><h1>Options</h1></div></header>
    <section className="options-content">
      <div className="option-group"><h2>Board color</h2><div className="option-grid">{(Object.keys(boardThemes) as BoardThemeId[]).map((themeId) => {
        const theme = boardThemes[themeId];
        return <button aria-pressed={boardTheme === themeId} className={`theme-option ${boardTheme === themeId ? 'theme-option--selected' : ''}`} key={themeId} onClick={() => setBoardTheme(themeId)} type="button"><span className="theme-swatch" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <i key={index} style={{ background: index % 2 === 0 ? theme.light : theme.dark }} />)}</span><span>{theme.name}</span></button>;
      })}</div></div>
      <div className="option-group"><h2>Pieces</h2><div className="option-grid">{([{ id: 'classic', name: 'Classic', description: 'Standard full-color pieces.' }, { id: 'monochrome', name: 'Monochrome', description: 'A clean black-and-white look.' }] as { id: PieceStyleId; name: string; description: string }[]).map((style) => <button aria-pressed={pieceStyle === style.id} className={`piece-option ${pieceStyle === style.id ? 'piece-option--selected' : ''}`} key={style.id} onClick={() => setPieceStyle(style.id)} type="button"><span className={`piece-preview ${style.id === 'monochrome' ? 'piece-style--monochrome' : ''}`} aria-hidden="true">♞ ♕</span><span><strong>{style.name}</strong><small>{style.description}</small></span></button>)}</div></div>
      {user && !isAnonymous && <div className="option-group profile-options"><h2>Player profile</h2><p className="muted">Choose the name and marker other players will see.</p><label className="profile-name-label" htmlFor="profile-name">Display name</label><input id="profile-name" maxLength={24} onChange={(event) => setDisplayName(event.target.value)} value={displayName} /><div aria-label="Profile piece" className="profile-choice-grid">{profilePieces.map((piece) => <button aria-pressed={profilePiece === piece.id} className={profilePiece === piece.id ? 'profile-choice profile-choice--selected' : 'profile-choice'} key={piece.id} onClick={() => setProfilePiece(piece.id)} type="button"><span aria-hidden="true">{piece.symbol}</span>{piece.label}</button>)}</div><div aria-label="Profile color" className="profile-color-grid">{profileColors.map((color) => <button aria-label={color.label} aria-pressed={profileColor === color.id} className={profileColor === color.id ? 'profile-color profile-color--selected' : 'profile-color'} key={color.id} onClick={() => setProfileColor(color.id)} style={{ backgroundColor: color.value }} type="button" />)}</div>{profileStatus && <p className="profile-status" role="status">{profileStatus}</p>}<div className="profile-actions"><button className="secondary-action profile-save" onClick={() => { void saveProfile(); }} type="button">Save profile</button><button className="sign-out-button" onClick={() => { void leaveAccount(); }} type="button">Sign out</button></div></div>}
    </section>
  </main>;
}
