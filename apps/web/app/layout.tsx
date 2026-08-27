import type { Metadata } from 'next';
import '../src/styles.css';
import { AppProviders } from './components/AppProviders';
import { PwaRegistration } from './components/PwaRegistration';

export const metadata: Metadata = {
  title: 'Collective UnconsChess',
  description: 'A community-made chess game, one move at a time.',
  applicationName: 'Collective UnconsChess',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AppProviders>{children}</AppProviders><PwaRegistration /></body></html>;
}
