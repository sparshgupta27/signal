# Signal Clone

A functional clone of Signal Messenger — real-time one-on-one and group messaging, attachments, reactions, disappearing messages, search, archived chats, contacts, delivery/read receipts, typing indicators, and a UI built to look and feel like Signal Desktop.

Built as an SDE fullstack assignment, then taken further into a genuinely working deployed app: every feature below is backed by a real database and a real WebSocket connection, not client-local mock state. Authentication and encryption are mocked per the assignment spec (no real SMS provider or cryptographic key exchange), but OTP generation, rate limiting, and every other piece of business logic are real.

## Live demo

| | |
|---|---|
| Frontend | https://frontend-sparshgupta27s-projects.vercel.app |
| Backend API | https://rated-affects-fuel-wiring.trycloudflare.com |

Register with any phone number — there's no real SMS gateway, so the one-time code is shown directly on the verify screen ("Demo code: ######") instead of being texted. See [Scalability & reliability](#scalability--reliability) below for what's deliberately simplified in this deployment vs. a production one, and why.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript (strict), Tailwind CSS v4, Radix UI primitives, Zustand, TanStack Query, framer-motion |
| Backend | FastAPI, SQLAlchemy 2.0, Pydantic v2, raw WebSockets, slowapi (rate limiting) |
| Database | SQLite (WAL mode) |
| Auth | Per-request OTP (`secrets.randbelow`, rate-limited) + JWT (PyJWT), bearer token on REST, token query param on the WS/upload handshakes |
| Real-time | A single `/api/v1/ws` WebSocket per connected client, fanned out by an in-memory connection manager |
| Deployment | Frontend on Vercel; backend on a single VPS (systemd-managed Uvicorn process) behind a Cloudflare Tunnel for HTTPS/WSS without owning a domain |

## Repository layout

```
Signal_clone/
  frontend/   Next.js app — see frontend/README.md for frontend-specific notes
  backend/    FastAPI app — routers, services, models, seed script
```

## Getting started

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
copy .env.example .env          # Windows; cp on macOS/Linux
python seed.py                  # creates signal_clone.db and seeds demo data
uvicorn app.main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs` (FastAPI's auto-generated Swagger UI).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. On first load you'll be routed to onboarding (`/welcome`); use a seeded demo account's phone/username to skip straight into a populated workspace (see Seed data below), or register a new one — there's no real SMS gateway, so the generated one-time code is shown directly on the verify screen instead of being texted.

Set `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`) if the backend runs somewhere other than `localhost:8000`.

## Architecture overview

**Backend** is a layered FastAPI app:
- `app/routers/` — thin HTTP/WS endpoint handlers (auth, users, contacts, conversations, messages, groups, reactions, uploads, search), no business logic
- `app/services/` — the actual logic (conversation lookup/creation, message creation + receipt computation + disappearing-message expiry, group membership changes, reactions, uploads, search), shared by both REST routers and the WebSocket handler so the two surfaces can never drift
- `app/ws/manager.py` — an in-memory map of `user_id -> active WebSocket connections`, used to fan out events to everyone in a conversation. The single-process ceiling this creates (and how it's removed) is covered in [Scalability & reliability](#scalability--reliability)
- `app/ws/broadcast.py` — builds and sends the `message.new` / `message.status` / `message.deleted` / `reaction.updated` / `conversation.updated` / `presence` / `typing` event payloads
- `app/models.py` — SQLAlchemy ORM models (see schema below), including a `UTCDateTime` type decorator that keeps every timestamp genuinely timezone-aware despite SQLite dropping tzinfo on its own
- `app/main.py` — creates tables on startup (`Base.metadata.create_all`, no migration framework — not warranted for a from-scratch SQLite schema with a seed script), auto-seeds the database if it's empty, starts the disappearing-message sweep background task, and wires up CORS + rate limiting + routers

**Frontend** follows the same "components only talk to hooks" rule the backend follows for routers/services:
- `app/` — Next.js App Router routes: `(auth)` onboarding flow, `(app)` the authenticated shell (chat list, chat pane, settings, calls/stories placeholders)
- `components/` — presentational and container components, grouped by feature (`chat-list/`, `chat/`, `details/`, `dialogs/`, `settings/`, `layout/`, `ui/`)
- `hooks/` — `useConversations`, `useMessages`, `useSendMessage`, `useTyping`, `usePresence`, etc. — the only things components call; they wrap TanStack Query + the WebSocket client
- `lib/` — API client, WebSocket client, formatting/avatar-color helpers
- `store/` — Zustand stores for UI state that isn't server state (chat store, presence store, UI/theme store)

The REST-for-reads / WebSocket-for-live-events split mirrors the backend's router/service split: initial conversation and message lists load over REST (cacheable, paginatable), while new messages, status changes, typing, and presence arrive over the single WS connection and patch the same TanStack Query cache in place.

## Database schema

| Table | Purpose |
|---|---|
| `users` | Account identity — phone *or* username (at least one required), display name, avatar, online/last-seen state |
| `contacts` | Directed `(owner_id, contact_id)` pairs — a user's own address book, independent of conversation membership |
| `conversations` | One row per DM *or* group. `type` discriminates `direct`/`group`. `dm_key` is a sorted `"userIdA:userIdB"` string with a `UNIQUE` constraint — this is what makes "start a DM with X" idempotent: re-requesting it returns the same conversation instead of creating a duplicate |
| `conversation_participants` | Join table between users and conversations — carries per-member state that doesn't belong on either side alone: `role` (admin/member), `last_read_at`, `is_muted`, `is_pinned`, `is_archived`, `left_at` (soft-remove, so message history survives a member leaving/being removed) |
| `messages` | One row per message. `client_id` + sender is how the client de-duplicates a message it already optimistically rendered. `system_event` (JSON) holds structured data for system messages ("X added Y", "X changed the group name") instead of a separate table. `reply_to_id` self-references for quoted replies. `expires_at` is set once, at send time, from the conversation's disappearing-timer *as it stood then* — never recomputed later, so changing the timer can't retroactively expire old messages |
| `message_receipts` | Per-(message, recipient) `delivered_at`/`read_at` timestamps. Deliberately *not* a single status enum on `messages` — group chats need per-recipient receipts, and a message's displayed status (sent/delivered/read) is computed from this table across all active recipients, not stored directly |
| `attachments` | One row per uploaded file — uploaded first (`POST /uploads`, `message_id` null), linked to a message second when it's actually sent. Served through `GET /uploads/{id}` (membership-checked) rather than a public URL, so the file lives on the backend's disk under `UPLOAD_DIR`, not in the database |
| `message_reactions` | Composite `(message_id, user_id)` primary key — one reaction per person per message, enforced by the schema itself rather than application logic |

Status is always derived, never stored as a flag: a message is "read" once every active (non-left) participant other than the sender has a `read_at` on their receipt row, "delivered" once they all have `delivered_at`, otherwise "sent".

## API overview

All REST routes are prefixed `/api/v1`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/request-otp` | Generates a real per-request one-time code (rate-limited 5/min), returned directly since there's no SMS gateway |
| POST | `/auth/verify-otp` | Verify code (rate-limited 10/min), create the user if new, return a JWT |
| GET / PATCH | `/users/me` | Current user profile |
| GET | `/users` | Directory listing (for "new chat" / "add to group" pickers) |
| GET | `/users/{id}` | Single user, for resolving an id not yet in the client's directory cache |
| GET | `/users/lookup` | Find a user by exact phone/username |
| GET / POST | `/contacts` | List / add contacts |
| DELETE | `/contacts/{contact_id}` | Remove a contact |
| GET | `/conversations` | List the current user's conversations, most-recent-first |
| GET | `/conversations/archived` | List archived conversations |
| GET | `/conversations/{id}` | Single conversation detail |
| GET | `/conversations/{id}/media` | Every attachment still attached to a non-deleted message in this conversation |
| POST | `/conversations/direct` | Get-or-create a DM with another user (uses `dm_key`) |
| PATCH | `/conversations/{id}` | Set the conversation's disappearing-message timer (DM: either member; group: admins only) |
| PATCH | `/conversations/{id}/me` | Update the caller's own per-conversation state (mute/pin/archive/read) |
| GET | `/conversations/{id}/messages` | Paginated message history (cursor via `before`) |
| POST | `/messages/{id}/read` | REST mark-all-read up to a message (the WS equivalent needs an open connection; this doesn't) |
| PUT / DELETE | `/messages/{id}/reaction` | Set / remove the caller's reaction (one per person per message) |
| POST | `/uploads` | Upload an attachment (multipart, 10MB cap, rate-limited 20/min) — returns an id before any message references it |
| GET | `/uploads/{id}?token=...` | Serve an attachment, membership-checked (token in the query string — `<img src>`/`<a href>` can't set an `Authorization` header) |
| GET | `/search?q=...` | Search conversations/contacts/messages, scoped to the caller's current memberships, with `%`/`_` escaped in the `LIKE` pattern |
| POST | `/groups` | Create a group |
| POST | `/groups/{id}/members` | Add members (admin only) |
| DELETE | `/groups/{id}/members/{member_id}` | Remove a member (admin only) |
| PATCH | `/groups/{id}/members/{member_id}` | Promote/demote a member's role (admin only) |
| WS | `/ws?token=...` | Single bidirectional channel for `message.send`, `message.delivered`, `message.read`, `typing` (client→server) and `message.new`, `message.status`, `message.deleted`, `reaction.updated`, `conversation.updated`, `typing`, `presence` (server→client) |

## Seed data

`backend/seed.py` populates 8 users, several DMs, and a few groups with realistic message history, including an unread conversation, a pinned/muted chat, a reply with a reaction, a deleted message, and a group with a removed member — so the app is immediately demonstrable rather than opening to an empty state.

## Scalability & reliability

This deployment is one Uvicorn process on one VPS, talking to one SQLite file. That's the right choice for a demo with a handful of real users and a seed dataset — anything more would be solving a problem that doesn't exist yet. But it's deliberately *simplified*, not architecturally dead-ended: every corner cut below has a specific, named reason it's cut, and a specific, concrete change that removes it.

### What actually caps this at one instance

Three pieces of server state live in process memory, not in anything shared:

| State | Where | Why it blocks horizontal scaling |
|---|---|---|
| WebSocket connections | `app/ws/manager.py` — `dict[user_id, set[WebSocket]]` | A message sent to user B only reaches them if B's socket is held by *this* process. A second backend instance has no way to know B is connected to the first one. |
| Rate-limit counters | `slowapi`'s default in-memory store | Each instance would count requests independently — a client could get 5x the intended rate limit just by landing on 5 different instances. |
| Pending OTP codes | `app/routers/auth.py` — a plain `dict` | A code issued by instance A would fail to verify on instance B. |

Every one of these is a storage-backend swap, not a redesign — the request/response and WS message shapes don't change at all.

### The production path

- **WS fanout via Redis pub/sub.** Each backend instance keeps managing its own *local* connections exactly as it does now. The change is in `broadcast.py`: instead of (or alongside) iterating the local connection map, publish the event to a Redis channel keyed by conversation or user id; every instance subscribes to the channels it has local connections for and forwards matching events to its own sockets. No instance needs to know about any other instance's connections — this is the same shape real-time chat backends generally use to scale a gateway layer horizontally (Discord's gateway and Slack's RTM both work this way at a conceptual level), and it's a bounded, mechanical change here since `broadcast.py` is already the single choke point every event flows through.
- **Rate limiting and OTP storage move to Redis.** `slowapi` has a built-in Redis backend — this is a config change, not new code. The OTP dict becomes `SETEX otp:{identifier} 300 {code}`, giving it a real expiry for free instead of living forever until overwritten.
- **SQLite → Postgres.** SQLite's write-locking (even in WAL mode) assumes one writer process; it was the right choice here because it's an explicit assignment constraint and this deployment genuinely is one process. Postgres is the direct swap — SQLAlchemy already abstracts the dialect, so the schema and every query in `app/services/` carry over essentially unchanged. A connection pooler (PgBouncer) and read replicas for the read-heavy conversation-list/message-history queries are the next layer once a single primary's write throughput becomes the actual bottleneck, not before.
- **Object storage for attachments.** Uploaded files live on the VPS's local disk (`UPLOAD_DIR`) today — a single point of failure, and it doesn't survive the disk being wiped (the auto-reseed-on-empty-DB fallback only re-creates *demo* data, not real uploads). Production equivalent: S3-compatible storage (S3, R2, GCS), with `GET /uploads/{id}` becoming a redirect to a short-lived signed URL instead of the backend streaming file bytes itself — moves that bandwidth off the app server entirely and onto a CDN edge.
- **Stateless replicas behind a load balancer.** Once WS state and rate-limit/OTP state are externalized, the FastAPI app itself holds no server-affinity state at all — it can run as N replicas with no sticky sessions required (a client can WS-connect to any instance, since fanout is Redis-mediated). That's what makes health-checked rolling deploys possible instead of the current single-process restart, which is a few seconds of real downtime every time it ships.
- **The disappearing-message sweep needs to stop being "one task per process."** It's correct today because there's exactly one process. With N replicas, running the same `asyncio` loop on every one of them wouldn't be *wrong* — each sweep's `WHERE deleted_at IS NULL` update is idempotent, so redundant sweeps just do no-op work — but it is wasteful. The real fix is a single leader-elected job, or pulling it out into a scheduled external worker (a cron hitting an internal endpoint, or Celery beat) instead of code that runs inside every web process.
- **Ingress.** This deployment uses a Cloudflare *quick* tunnel specifically to get HTTPS/WSS without owning a domain — free, but the public URL isn't stable across a tunnel restart. Production: a named tunnel (or any real load balancer) in front of N replicas, with a stable hostname and automatic cert renewal.

### Reliability: what's already handled, and what isn't

Already in place, even on a single instance: the backend service is `systemd`-supervised with `Restart=always`, so a crash is a few seconds of downtime, not a dead process until someone notices; the database self-heals from an empty-disk scenario via auto-seed-on-startup; disappearing-message expiry has both the background sweep *and* a lazy on-read fallback, so a message that outlives its timer during the gap between sweeps still can't be read stale; the WebSocket client reconnects with exponential backoff and re-establishes its listeners automatically; sends are optimistic with clientId-based reconciliation, so a message you just typed survives a brief connection drop instead of vanishing.

Not yet handled, and worth naming rather than hiding: there's no automated off-box backup of the SQLite file — a disk failure loses real data permanently (only the *seed* data is self-healing, not anything a real user sent); there's no WebSocket heartbeat, so a half-open TCP connection (NAT timeout, a sleeping laptop) can look "connected" on the client for longer than the pipe is actually alive before the browser's own reconnect logic kicks in; a message send that never gets an acknowledgment has no client-side timeout — it sits at "sending" indefinitely rather than surfacing a retry/failure state. All three are the next things worth building, in roughly that priority order, before any of the horizontal-scaling work above — reliability of the one instance you have matters more than the ability to run more of it.

## Assumptions / known limitations

- SMS delivery and all encryption are mocked, as explicitly permitted by the assignment brief — OTP *generation* and verification are real (a genuine random code per request, rate-limited, single-use), just shown on-screen instead of texted.
- No migration framework (Alembic) — the schema is created fresh via `create_all()` and populated by the seed script; this is a from-scratch build with no migration history to preserve.
- The WebSocket JWT is passed as a query parameter (`?token=`) rather than a header, since the browser `WebSocket` API cannot set custom headers on the handshake. This means the token can land in server/proxy access logs — an accepted tradeoff for a mocked-auth assignment, not something to carry into a real deployment unprotected.
- Voice/video calls, Stories, and linked devices are present only as "Coming soon" placeholders per the assignment's explicit allowance.
- Message search is a simple `LIKE` scan against the seed-scale dataset, not a full-text index.
- The backend is a single process with in-memory WS/rate-limit/OTP state, SQLite on local disk, and no automated backups — appropriate for this deployment's actual scale, not a ceiling the architecture can't grow past. See [Scalability & reliability](#scalability--reliability) for exactly what that growth path looks like.
