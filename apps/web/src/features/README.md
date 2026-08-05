# Features

Future product code is grouped by capability rather than technical layer. Planned features are `game`, `moves`, and `player`.

Each feature may own `api`, `components`, `hooks`, `model`, `services`, and `state`. Cross-feature imports use a feature's public `index.ts`, never its internal files.
