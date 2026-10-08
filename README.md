# Signal Clone

A functional clone of Signal Messenger — real-time one-on-one and group messaging, contacts, delivery/read receipts, typing indicators, and a UI built to look and feel like Signal Desktop.

Built as an SDE fullstack assignment. Authentication, OTP verification, and encryption are mocked per the assignment spec — no real SMS provider or cryptographic key exchange is used.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript (strict), Tailwind CSS v4, Radix UI primitives, Zustand, TanStack Query, framer-motion |
| Backend | FastAPI, SQLAlchemy 2.0, Pydantic v2, raw WebSockets |
| Database | SQLite |
| Auth | Mocked OTP + JWT (PyJWT), bearer token on REST, token query param on the WS handshake |
| Real-time | A single `/api/v1/ws` WebSocket per connected client, fanned out by a connection manager |

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

Open `http://localhost:3000`. On first load you'll be routed to onboarding (`/welcome`); use the seeded demo account's phone/username to skip straight into a populated workspace (see Seed data below), or register a new one — OTP is always `123456`.

Set `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`) if the backend runs somewhere other than `localhost:8000`.

## Architecture overview

**Backend** is a layered FastAPI app:
- `app/routers/` — thin HTTP/WS endpoint handlers (auth, users, contacts, conversations, messages, groups), no business logic
- `app/services/` — the actual logic (conversation lookup/creation, message creation + receipt computation, group membership changes), shared by both REST routers and the WebSocket handler so the two surfaces can never drift
- `app/ws/manager.py` — an in-memory map of `user_id -> active WebSocket connections`, used to fan out events to everyone in a conversation
- `app/ws/broadcast.py` — builds and sends the `message.new` / `message.status` / `conversation.updated` / `presence` / `typing` event payloads
- `app/models.py` — SQLAlchemy ORM models (see schema below)
- `app/main.py` — creates tables on startup (`Base.metadata.create_all`, no migration framework — not warranted for a from-scratch SQLite schema with a seed script) and wires up CORS + routers

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
| `messages` | One row per message. `client_id` + sender is how the client de-duplicates a message it already optimistically rendered. `system_event` (JSON) holds structured data for system messages ("X added Y", "X changed the group name") instead of a separate table. `reply_to_id` self-references for quoted replies |
| `message_receipts` | Per-(message, recipient) `delivered_at`/`read_at` timestamps. Deliberately *not* a single status enum on `messages` — group chats need per-recipient receipts, and a message's displayed status (sent/delivered/read) is computed from this table across all active recipients, not stored directly |

Status is always derived, never stored as a flag: a message is "read" once every active (non-left) participant other than the sender has a `read_at` on their receipt row, "delivered" once they all have `delivered_at`, otherwise "sent".

## API overview

All REST routes are prefixed `/api/v1`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/request-otp` | Mock OTP request for a phone/username (always issues `123456`) |
| POST | `/auth/verify-otp` | Verify code, create the user if new, return a JWT |
| GET / PATCH | `/users/me` | Current user profile |
| GET | `/users` | Directory listing (for "new chat" / "add to group" pickers) |
| GET | `/users/lookup` | Find a user by exact phone/username |
| GET / POST | `/contacts` | List / add contacts |
| DELETE | `/contacts/{contact_id}` | Remove a contact |
| GET | `/conversations` | List the current user's conversations, most-recent-first |
| GET | `/conversations/{id}` | Single conversation detail |
| POST | `/conversations/direct` | Get-or-create a DM with another user (uses `dm_key`) |
| PATCH | `/conversations/{id}/me` | Update the caller's own per-conversation state (mute/pin/archive/read) |
| GET | `/conversations/{id}/messages` | Paginated message history (cursor via `before`) |
| POST | `/groups` | Create a group |
| POST | `/groups/{id}/members` | Add members (admin only) |
| DELETE | `/groups/{id}/members/{member_id}` | Remove a member (admin only) |
| PATCH | `/groups/{id}/members/{member_id}` | Promote/demote a member's role (admin only) |
| WS | `/ws?token=...` | Single bidirectional channel for `message.send`, `message.delivered`, `message.read`, `typing` (client→server) and `message.new`, `message.status`, `conversation.updated`, `typing`, `presence` (server→client) |

## Seed data

`backend/seed.py` populates 8 users, several DMs, and a few groups with realistic message history, including an unread conversation, a pinned/muted chat, a reply with a reaction, a deleted message, and a group with a removed member — so the app is immediately demonstrable rather than opening to an empty state.

## Assumptions / known limitations

- OTP verification, SMS delivery, and all encryption are mocked, as explicitly permitted by the assignment brief.
- No migration framework (Alembic) — the schema is created fresh via `create_all()` and populated by the seed script; this is a from-scratch build with no migration history to preserve.
- The WebSocket JWT is passed as a query parameter (`?token=`) rather than a header, since the browser `WebSocket` API cannot set custom headers on the handshake. This means the token can land in server/proxy access logs — an accepted tradeoff for a mocked-auth assignment, not something to carry into a real deployment unprotected.
- Voice/video calls, Stories, and linked devices are present only as "Coming soon" placeholders per the assignment's explicit allowance.
- Message search is a simple `LIKE` scan against the seed-scale dataset, not a full-text index.
