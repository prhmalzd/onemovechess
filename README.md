# One Move Chess

**One Move Chess** is a community chess game. Everyone contributes to the same board, but each player can make only one legal move at a time.

Play it here: [onemovechess-web.vercel.app](https://onemovechess-web.vercel.app/)

## Development

The project is a single Next.js application in `apps/web`; `npm run dev` starts both the UI and API Route Handlers on one server.

1. Copy [`apps/web/.env.example`](apps/web/.env.example) to `apps/web/.env.local` and add your Supabase and database values.
2. Run `npm install`, then `npm run dev`.

Set the same variables in Vercel before deploying. Never commit actual credentials; rotate the database password that was previously committed in this repository.

## Username/password accounts

The app starts players anonymously. Creating a username/password account upgrades that same player, so existing moves and boards are retained. Enable Supabase's Email provider (no user email is collected or sent), then add the server-only `SUPABASE_SERVICE_ROLE_KEY` to local development and Vercel. Never expose that key through a `NEXT_PUBLIC_*` variable.

## How to play

1. On the home screen, select the knight. Legal destinations are shown with small dots.
2. Move the knight onto **Play** to enter a shared chess board.
3. Make one legal chess move. You have five minutes after joining the board.
4. After your move is saved, the board becomes read-only for you while other players continue the game.
5. When you become eligible again, you can contribute another move to that board.
6. Open **Active Boards** to follow boards you have joined, inspect the latest position, and replay earlier moves.

All standard chess rules apply. Illegal moves are prevented automatically.

## Main menu

- **Play** — join an available community board or start a new one.
- **How to Play** — read the quick rules.
- **Options** — change the board colors and piece style. Preferences are saved on your device.
- **Active Boards** — view and replay boards you have joined.

## Anonymous play

You can play without creating an account. The MVP gives your device a temporary guest identity so you can make moves and follow your active boards.

Create a username/password account after your first move—or from the home screen—to keep your progress across devices. You can then personalize your public name, piece, and color in Options.

## Mobile friendly

One Move Chess is designed for mobile browsers and can be installed as a Progressive Web App on supported devices.

© One Move Chess
