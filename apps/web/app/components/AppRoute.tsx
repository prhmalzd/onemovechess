'use client';

import { useRouter } from 'next/navigation';
import { ActiveBoardsPage } from '../../src/features/game/components/ActiveBoardsPage';
import { PlayPage } from '../../src/features/game/components/PlayPage';
import { HowToPlayPage } from '../../src/features/home/HowToPlayPage';
import { MainPage } from '../../src/features/home/MainPage';
import { OptionsPage } from '../../src/features/home/OptionsPage';
import { ShowcasePage } from '../../src/features/home/ShowcasePage';
import { NotificationBell } from '../../src/features/notifications/NotificationBell';
import { NotificationsPage } from '../../src/features/notifications/NotificationsPage';

type AppPath = '/' | '/play' | '/active-boards' | '/how-to-play' | '/options' | '/showcase' | '/notifications';

export function AppRoute({ path }: { path: AppPath }) {
  const router = useRouter();
  const onNavigate = (nextPath: AppPath) => router.push(nextPath);
  const page = path === '/play' ? <PlayPage onNavigate={onNavigate} />
    : path === '/active-boards' ? <ActiveBoardsPage onNavigate={onNavigate} />
      : path === '/how-to-play' ? <HowToPlayPage onNavigate={onNavigate} />
        : path === '/options' ? <OptionsPage onNavigate={onNavigate} />
          : path === '/showcase' ? <ShowcasePage onNavigate={onNavigate} />
            : path === '/notifications' ? <NotificationsPage />
              : <MainPage onNavigate={onNavigate} />;
  return <><NotificationBell />{page}</>;
}
