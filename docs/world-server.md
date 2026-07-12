# Running the realtime server (cursors + pixel world)

The live features — visitor cursors, `say`, and the [Pixel World](../app/pages/world.vue) —
are powered by one tiny Node websocket server: `realtime/cursors-server.mjs`.
It is **optional and off by default**. Without it, the site is fully static and the
pixel world runs in a solo, browser-local "offline" mode.

## What it does

- Relays anonymous cursor positions and `say` bubbles between visitors (no storage).
- Hosts the **pixel world**: one authoritative 128×128 board, persisted to
  `realtime/world-board.json`, with server-side validation, a per-connection
  placement cooldown, pixel provenance, online/activity counts, and a rolling
  history for the client time-lapse. All the shared rules live in
  `realtime/world-core.mjs`, imported by both the server and the browser.
- Hosts the **game leaderboard** (top scores per game, persisted to
  `realtime/scores.json`; rules in `realtime/scores-core.mjs`) and **online
  pong** (`pong online` in the terminal): a two-visitor matchmaking queue with
  a server-authoritative simulation, physics shared via `realtime/pong-core.mjs`.
  The wire contract for all of it is typed in `realtime/protocol.d.ts`.

No IPs, accounts or fingerprints are stored. Client-supplied identity and
timestamps are never trusted — the server stamps everything.

## Run it locally

```bash
node realtime/cursors-server.mjs      # ws://localhost:8787
```

Then build the site pointing at it:

```bash
NUXT_PUBLIC_CURSORS_WS=ws://localhost:8787 npm run dev
```

## Environment

| var | default | meaning |
| --- | --- | --- |
| `PORT` | `8787` | websocket port |
| `WORLD_FILE` | `realtime/world-board.json` | where the board is persisted |
| `WORLD_COOLDOWN_MS` | `5000` | min ms between one visitor's placements |

On the **site build**, set `NUXT_PUBLIC_CURSORS_WS=wss://your-host` to switch the
clients from offline mode to the live relay.

## Deploy

Any Node host works (Fly.io, Railway, Render, a small VPS). It is a single file
with one dependency (`ws`) and needs a writable path for `WORLD_FILE` if you
want the board to survive restarts. Behind TLS, use `wss://`. Put it behind a
reverse proxy or a platform that terminates TLS for you.

```bash
# example: a bare VPS with pm2
WORLD_FILE=/var/lib/lvworld/board.json pm2 start realtime/cursors-server.mjs --name lv-relay
```

The board seeds itself with a small landscape (see `createSeedBoard` in
`world-core.mjs`) so a fresh deploy is never blank.
