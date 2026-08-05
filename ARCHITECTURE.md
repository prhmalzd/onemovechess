# One Move Chess — MVP Technical Blueprint

## Architectural intent

Build a small, feature-based React application that can be developed comfortably by one person today and split into independently deployable client and server applications when multiplayer is introduced. Keep the initial frontend dependency graph shallow: features own their domain-specific code, while shared code is deliberately small and generic.

This document specifies structure and boundaries only. It does not prescribe screens, UI, routes, business rules, or implementation logic.

## Repository layout

```text
one-move-chess/
├─ apps/
│  ├─ web/                         # Vite + React + TypeScript frontend
│  │  ├─ public/                   # Browser-served static files
│  │  ├─ src/
│  │  │  ├─ app/                   # Application composition and providers
│  │  │  │  ├─ providers/           # Query, state, router, theme providers
│  │  │  │  ├─ router/              # Route registration only, when needed
│  │  │  │  └─ styles/              # Global/reset styles and design tokens
│  │  │  ├─ features/               # Business capabilities, organized by feature
│  │  │  │  ├─ game/
│  │  │  │  ├─ puzzle/
│  │  │  │  ├─ player/
│  │  │  │  └─ multiplayer/         # Empty until multiplayer is introduced
│  │  │  ├─ shared/                 # Generic code with no feature ownership
│  │  │  │  ├─ api/                 # HTTP client, API contracts, transport errors
│  │  │  │  ├─ components/          # Reusable presentational components
│  │  │  │  ├─ config/              # Typed environment configuration
│  │  │  │  ├─ hooks/               # Generic reusable React hooks
│  │  │  │  ├─ lib/                 # Small framework-agnostic helpers
│  │  │  │  ├─ types/               # Cross-feature primitives only
│  │  │  │  └─ constants/           # Cross-feature constants only
│  │  │  ├─ assets/                 # Imported images, fonts, and icons
│  │  │  ├─ main.tsx                # Browser bootstrap only
│  │  │  └─ vite-env.d.ts           # Vite type declarations
│  │  ├─ .env.example
│  │  ├─ package.json
│  │  └─ vite.config.ts
│  └─ api/                          # Future Node.js backend
│     └─ src/
│        ├─ config/                 # Validated runtime configuration
│        ├─ modules/                # Feature modules: game, player, multiplayer
│        ├─ shared/                 # Cross-module HTTP, DB, auth, errors
│        ├─ realtime/               # Socket.IO gateway and event contracts
│        ├─ database/               # PostgreSQL client, migrations, repositories
│        └─ server.ts               # Server composition only
├─ packages/
│  └─ contracts/                    # Future shared API/socket DTOs and schemas
├─ docs/                            # Decisions, API/event documentation, diagrams
├─ package.json                     # Workspace scripts and shared tooling
├─ tsconfig.base.json               # Shared strict TypeScript settings
└─ ARCHITECTURE.md
```

Start with `apps/web` if a monorepo feels premature; retain the same internal boundaries. Introduce the workspace folders (`apps`, `packages`) when the Node backend begins. This avoids fake complexity while keeping the eventual move mechanical.

## Frontend feature structure

Every feature follows this shape, adding folders only when they contain useful code:

```text
features/game/
├─ api/             # Feature-specific requests and response mapping
├─ components/      # Components meaningful specifically to this feature
├─ hooks/           # Feature-specific orchestration hooks
├─ model/           # Domain types, pure operations, state definitions
├─ state/           # Client state store/slices for this feature
├─ services/        # Adapters around chess.js or other external services
├─ tests/           # Co-located feature tests, if not beside source
└─ index.ts         # Explicit public exports; avoid deep cross-feature imports
```

`features/game` owns a playable chess position and its rules integration. `features/puzzle` owns puzzle-specific metadata and attempts, and may depend on the public API of `game`. `features/player` owns local/remote player profile concerns. `features/multiplayer` will own lobby, room, and socket coordination; it must not leak socket calls into board components.

Feature code may import from `shared` and from another feature's `index.ts`. It must not import another feature's internal files. `shared` must never import from `features`.

## Naming conventions

| Item | Convention | Example |
|---|---|---|
| Folders and non-component files | `kebab-case` | `move-history.ts` |
| React component files | `PascalCase.tsx` | `ChessBoard.tsx` |
| Components, types, interfaces, enums | `PascalCase` | `GameSession`, `MoveHistory` |
| Functions, variables, hooks | `camelCase` | `createGame`, `useGameState` |
| Constants | `SCREAMING_SNAKE_CASE` | `DEFAULT_BOARD_WIDTH` |
| API request/response types | suffix `Request` / `Response` | `CreateGameRequest` |
| Data-transfer objects | suffix `Dto` only where useful | `GameDto` |
| Boolean names | `is`, `has`, `can`, `should` prefix | `isCheckmate` |
| Feature public surface | `index.ts` named exports | `export { GameBoard } ...` |

Prefer named exports. Reserve a default export for framework entrypoints only. Use import aliases such as `@/features/game` and `@/shared/api`, configured identically in TypeScript and Vite.

## Type definitions and validation

Types live next to the domain they describe. `shared/types` is only for truly universal types such as `ApiError`, `EntityId`, or `Result`.

```ts
// features/game/model/game.types.ts
export type GameId = string;
export type PlayerId = string;
export type Color = 'white' | 'black';
export type GameStatus = 'waiting' | 'active' | 'completed' | 'abandoned';

export interface GameSession {
  id: GameId;
  status: GameStatus;
  currentTurn: Color;
  position: ChessPosition;
  players: Partial<Record<Color, PlayerId>>;
}

export interface ChessPosition {
  fen: string;
  moveHistory: MoveRecord[];
}

export interface MoveRecord {
  from: Square;
  to: Square;
  promotion?: PromotionPiece;
  san: string;
  fenAfter: string;
}

export type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Square = `${File}${Rank}`;
export type PromotionPiece = 'q' | 'r' | 'b' | 'n';
```

Keep `chess.js` types at the integration boundary. A `game/services/chess-engine.ts` adapter converts library values into the app's `ChessPosition` and `MoveRecord`; UI and API modules should depend on app-owned types, not library-specific objects. Validate untrusted API and Socket.IO payloads at their boundary with Zod, then infer TypeScript types from schemas where practical.

## API layer

Separate transport from feature endpoints:

```text
shared/api/
├─ http-client.ts       # Fetch wrapper, base URL, headers, error normalization
├─ api-error.ts         # Typed, transport-neutral error shape
└─ query-client.ts      # TanStack Query client configuration

features/game/api/
├─ game.api.ts          # Endpoint functions only
├─ game.schemas.ts      # Zod request/response schemas
└─ game.queries.ts      # TanStack Query keys, queries, mutations
```

Endpoint functions should return validated domain/DTO data and contain no React state. TanStack Query owns server state: caching, loading/error status, invalidation, and mutations. Feature query files create stable query keys and hooks around the endpoint functions. When the backend does not yet exist, use a narrow feature-local repository interface and a development adapter; do not spread mock data through components.

The future `packages/contracts` package will contain only transport contracts and Zod schemas shared by web and API. It must not contain React code, database code, or chess engine instances.

## State management

Use state according to its lifetime and source:

| State kind | Owner | Recommended tool |
|---|---|---|
| Ephemeral component state | Component | `useState` / `useReducer` |
| Server state | API/query layer | TanStack Query |
| Feature client state shared across components | Feature `state/` | Zustand |
| Cross-app client preferences | `app/` or `shared/` | Small Zustand store |
| Chess rules and legal move calculation | Game service | `chess.js` adapter |

Avoid putting API response caches in Zustand or using global state for transient component concerns. Model state transitions as explicit feature actions (for example, `selectSquare`, `clearSelection`, `applyMove`) and keep stores feature-scoped. A board component renders state and emits user intent; it does not evaluate legal moves itself.

## Reusable components

```text
shared/components/
├─ Button/
│  ├─ Button.tsx
│  ├─ Button.types.ts
│  └─ index.ts
├─ Dialog/
├─ LoadingState/
└─ ErrorState/
```

Place a component in `shared/components` only if it has no chess or feature vocabulary and is usable by two or more features. Keep a chessboard wrapper under `features/game/components`, because its callbacks and configuration are domain-specific even though it uses `react-chessboard`. Do not build an internal design system until repeated needs justify it.

## Chess domain model boundaries

`chess.js` is the authoritative rules engine for move validation, turn, check, mate, draw, FEN, and SAN. `react-chessboard` is only a visual interaction component. Persist and exchange serializable values—FEN plus move history—not a `Chess` class instance.

Core aggregate: `GameSession` contains identity, participants, status, current position, and move history. `ChessPosition` represents board state using FEN. `MoveRecord` is an immutable historical event. Future puzzle models should reference a starting `ChessPosition`, expected solution moves, and presentation metadata, without being embedded in `GameSession`.

Use branded IDs later if accidental ID mixing becomes a real risk; plain `string` aliases are simpler for the MVP.

## Future backend architecture

Use a modular Node.js service, initially as a single deployable application:

```text
apps/api/src/modules/game/
├─ game.routes.ts           # HTTP request registration
├─ game.controller.ts       # HTTP-to-application mapping
├─ game.service.ts          # Use-case orchestration
├─ game.repository.ts       # Persistence interface
├─ postgres-game.repository.ts
├─ game.schemas.ts          # Input/output boundary validation
└─ game.types.ts            # Server-specific types
```

HTTP routes/controllers are thin. Services coordinate rules, authorization, and persistence. Repositories hide PostgreSQL/ORM details. The game service should use the same chess-domain contract as the frontend but revalidate all moves on the server; clients are never authoritative in multiplayer.

Socket.IO belongs in `realtime/`, with event schemas shared through `packages/contracts`. Socket handlers authenticate, validate, call application services, and broadcast resulting authoritative events. They must not directly write database records. Begin with PostgreSQL and migrations; add Redis only when multi-instance Socket.IO, presence, or matchmaking scale requires it.

## Environment variables

Never access `import.meta.env` or `process.env` outside a typed config module. Commit `.env.example`, never commit `.env` files or secrets.

```dotenv
# apps/web/.env.example
VITE_API_BASE_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
VITE_APP_ENV=development

# apps/api/.env.example (future)
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/one_move_chess
CORS_ORIGIN=http://localhost:5173
SOCKET_CORS_ORIGIN=http://localhost:5173
```

Only `VITE_` prefixed values are exposed to the browser, so they must never contain secrets. Future API secrets (session signing keys, OAuth credentials) remain server-only and are required/validated at startup.

## Recommended libraries

| Purpose | Library | Reason |
|---|---|---|
| Build/runtime | Vite, React, TypeScript | Fast, simple browser application baseline |
| Chess rules | `chess.js` | Well-established legal move and notation engine |
| Chessboard rendering | `react-chessboard` | React-native board interaction layer |
| Server state | `@tanstack/react-query` | Caching and async state without custom boilerplate |
| Client shared state | `zustand` | Small, feature-friendly stores |
| Validation | `zod` | Runtime payload validation plus inferred types |
| Routing (when routes exist) | `react-router-dom` | Conventional, minimal client routing |
| Styling | CSS Modules or vanilla CSS | Lowest-complexity MVP choice; choose one consistently |
| Unit tests | Vitest + React Testing Library | Fits Vite and encourages behavior-oriented tests |
| End-to-end tests (later) | Playwright | Reliable browser-level coverage |
| Backend (future) | Fastify | Typed, modular, lightweight Node HTTP server |
| PostgreSQL access (future) | Prisma ORM | Type-safe database access with migrations and a clear repository boundary |
| Realtime (future) | `socket.io` | Room/event model and reconnect support |
| Backend logging (future) | Pino | Structured, low-overhead logs; native Fastify fit |

Avoid adding Redux, a UI component framework, an event bus, or a CQRS framework during the MVP. Each adds ceremony without solving an immediate project problem.

## Guardrails for future implementation

1. Add a feature folder before adding feature code; avoid a generic `utils` dumping ground.
2. Keep pure chess calculations outside React components and hooks.
3. Treat the server as the multiplayer authority and validate every network payload.
4. Preserve serializable game state (FEN, SAN, identifiers) at storage and network boundaries.
5. Keep shared code generic; promote code from a feature only after repeated, genuine reuse.
6. Record consequential choices in `docs/adr/` as short Architecture Decision Records.
