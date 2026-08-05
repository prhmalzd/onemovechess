import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ActiveBoardsPage } from '@/features/game/components/ActiveBoardsPage';
import { PlayPage } from '@/features/game/components/PlayPage';
import { MainPage } from '@/features/home/MainPage';
import './styles.css';

type AppPath = '/' | '/play' | '/active-boards';

function getPath(): AppPath {
  const path = window.location.pathname as AppPath;
  return path === '/play' || path === '/active-boards' ? path : '/';
}

function App() {
  const [path, setPath] = useState<AppPath>(getPath);

  useEffect(() => {
    const updatePath = () => setPath(getPath());
    window.addEventListener('popstate', updatePath);
    return () => window.removeEventListener('popstate', updatePath);
  }, []);

  function navigate(nextPath: AppPath) {
    window.history.pushState({}, '', nextPath);
    setPath(nextPath);
  }

  if (path === '/play') return <PlayPage onNavigate={navigate} />;
  if (path === '/active-boards') return <ActiveBoardsPage onNavigate={navigate} />;
  return <MainPage onNavigate={navigate} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
