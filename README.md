# One Move Chess

> You only have one move.

One Move Chess is a social chess experiment: a chess game is built by a community, one legal move at a time. A player joins a board, makes a single move, then watches the game develop as other players contribute.

The project is currently an anonymous MVP. No account or sign-in is needed to try it.

## What works today

- A mobile-friendly home screen controlled with a knight on a 5 by 5 menu board.
- Anonymous Supabase identities, persisted on the device.
- Standard chess rules and legal move validation powered by `chess.js`.
- A full chessboard UI powered by `react-chessboard`.
- A five-minute reservation for a player's single move.
- Empty first-move boards can be aborted and are not saved.
- Shared Supabase-backed games and move history through the Fastify API.
- Read-only Active Boards with filters, replay, and the player's recorded move.
- PWA support: the app can be installed on supported mobile browsers when deployed over HTTPS.

## Important MVP note

Games are shared and stored in Supabase. Board updates currently use polling; Socket.IO is reserved for a later real-time upgrade.

## Run locally

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer
- npm (installed with Node.js)

### Installation

```bash
git clone <your-repository-url>
cd one-move-chess
npm install
```

### Start the frontend and API

```bash
npm run dev
```

Open the URL printed by Vite, usually [http://localhost:5173](http://localhost:5173). The Fastify API runs at [http://localhost:3000](http://localhost:3000).

On Windows PowerShell, if `npm` is blocked by the execution policy, use `npm.cmd` instead:

```powershell
npm.cmd install
npm.cmd run dev
```

## Verify a production build

```bash
npm run typecheck
npm run vercel-build
```

## Project structure

```text
apps/
  web/                 React, TypeScript, Vite, and the installable PWA
  api/                 Fastify API and PostgreSQL access
packages/
  contracts/           Future shared API and Socket.IO contracts
```

Most current frontend code lives in `apps/web/src/features`:

- `home` - the knight-controlled main menu
- `game` - board state, API repository, and Active Boards

## Technology

- React + TypeScript + Vite
- `chess.js` for chess rules
- `react-chessboard` for the board interface
- Vite PWA for installability and offline app-shell caching
- Fastify + Prisma + Supabase PostgreSQL for authoritative multiplayer state
- Socket.IO planned for real-time updates

## Roadmap

- Socket.IO board updates
- Optional Google sign-in for permanent identity, cross-device history, profiles, and future social features
