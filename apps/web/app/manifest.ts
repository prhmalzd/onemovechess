import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Collective UnconsChess',
    short_name: 'UnconsChess',
    description: 'A community-made chess game, one move at a time.',
    start_url: '/',
    display: 'standalone',
    background_color: '#161512',
    theme_color: '#161512',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }],
  };
}
