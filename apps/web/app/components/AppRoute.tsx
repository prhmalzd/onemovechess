'use client';

import { useRouter } from 'next/navigation';
import { ActiveBoardsPage } from '../../src/features/game/components/ActiveBoardsPage';
import { PlayPage } from '../../src/features/game/components/PlayPage';
import { HowToPlayPage } from '../../src/features/home/HowToPlayPage';
import { MainPage } from '../../src/features/home/MainPage';
import { OptionsPage } from '../../src/features/home/OptionsPage';
import { ShowcasePage } from '../../src/features/home/ShowcasePage';

type AppPath = '/' | '/play' | '/active-boards' | '/how-to-play' | '/options' | '/showcase';

export function AppRoute({ path }: { path: AppPath }) {
  const router = useRouter();
  const onNavigate = (nextPath: AppPath) => router.push(nextPath);
  if (path === '/play') return <PlayPage onNavigate={onNavigate} />;
  if (path === '/active-boards') return <ActiveBoardsPage onNavigate={onNavigate} />;
  if (path === '/how-to-play') return <HowToPlayPage onNavigate={onNavigate} />;
  if (path === '/options') return <OptionsPage onNavigate={onNavigate} />;
  if (path === '/showcase') return <ShowcasePage onNavigate={onNavigate} />;
  return <MainPage onNavigate={onNavigate} />;
}
